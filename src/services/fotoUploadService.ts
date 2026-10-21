import { supabase } from '../lib/supabase';

const BUCKET = 'fotos-registros';
const LADO_MAXIMO = 1600; // px — suficiente para ver detalhes de manutenção
const QUALIDADE_JPEG = 0.8;
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // espelho do limite do bucket

/**
 * Comprime a imagem no próprio aparelho antes do upload:
 * fotos de celular têm 3–10 MB; redimensionadas a 1600px em JPEG 0.8
 * ficam em ~200–400 KB. Se a compressão falhar (navegador antigo),
 * devolve o arquivo original.
 */
async function comprimirImagem(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);

    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, largura, altura);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALIDADE_JPEG)
    );

    // se a "compressão" sair maior que o original, usa o original
    if (!blob || blob.size >= file.size) return file;
    return blob;
  } catch {
    return file;
  }
}

export const fotoUploadService = {
  /**
   * Comprime e sobe uma foto para o storage, na pasta do usuário logado
   * (exigência das policies do bucket). Retorna a URL pública ou null.
   */
  async uploadFoto(file: File, subpasta: string): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const blob = await comprimirImagem(file);

      if (blob.size > TAMANHO_MAXIMO_BYTES) {
        return null;
      }

      const extensao = blob.type === 'image/png' ? 'png' : 'jpg';
      const caminho = `${user.id}/${subpasta}/${crypto.randomUUID()}.${extensao}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, blob, {
          contentType: blob.type || 'image/jpeg',
          cacheControl: '31536000',
          upsert: false,
        });

      if (error) {
        console.error('[FotoUpload] Erro no upload:', error.message);
        return null;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
      return data.publicUrl;
    } catch (error) {
      console.error('[FotoUpload] Exceção no upload:', error);
      return null;
    }
  },

  /**
   * Sobe várias fotos em sequência. Retorna as URLs das que subiram
   * e quantas falharam (para a tela avisar sem perder as demais).
   */
  async uploadFotos(files: File[], subpasta: string): Promise<{ urls: string[]; falhas: number }> {
    const urls: string[] = [];
    let falhas = 0;

    for (const file of files) {
      const url = await this.uploadFoto(file, subpasta);
      if (url) {
        urls.push(url);
      } else {
        falhas++;
      }
    }

    return { urls, falhas };
  },
};
