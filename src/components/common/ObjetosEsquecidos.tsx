import { useEffect, useState } from 'react';
import { Camera, Image as ImageIcon, PackageSearch, X, Check, Trash2, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { emLotes } from '../../lib/paginacao';
import { notificar, confirmar } from '../../lib/feedback';
import { fotoUploadService } from '../../services/fotoUploadService';
import { useAuth } from '../../contexts/AuthContext';

// Objetos que o hóspede deixou no quarto: a camareira registra (foto + o que é),
// recepção/gestão acompanham até devolver ou descartar.

interface ObjetoEsquecido {
  id: string;
  suite_nome: string | null;
  descricao: string;
  foto_url: string | null;
  registrado_por: string | null;
  registrado_em: string;
  status: 'guardado' | 'devolvido' | 'descartado';
  resolvido_por: string | null;
  resolvido_em: string | null;
  observacao: string | null;
}

const dataHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

/** Botão + janela para a camareira registrar um objeto esquecido no quarto do registro atual. */
export function BotaoObjetoEsquecido({ registroId, suiteId, suiteNome }: { registroId: string; suiteId?: string | null; suiteNome: string }) {
  const { user } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [foto, setFoto] = useState<{ file: File; preview: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const fechar = () => {
    if (foto) URL.revokeObjectURL(foto.preview);
    setFoto(null);
    setDescricao('');
    setAberto(false);
  };

  const escolherFoto = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (foto) URL.revokeObjectURL(foto.preview);
    setFoto({ file, preview: URL.createObjectURL(file) });
  };

  const salvar = async () => {
    if (descricao.trim().length < 2) {
      notificar('Descreva o objeto (ex.: carregador de celular branco).', 'aviso');
      return;
    }
    if (!user?.empresaId) return;
    setSalvando(true);
    try {
      let fotoUrl: string | null = null;
      if (foto) {
        fotoUrl = await fotoUploadService.uploadFoto(foto.file, 'objetos-esquecidos');
        if (!fotoUrl) {
          notificar('Não foi possível enviar a foto. Tente de novo ou salve sem foto.', 'erro');
          setSalvando(false);
          return;
        }
      }
      const { error } = await supabase.from('objetos_esquecidos').insert({
        empresa_id: user.empresaId,
        registro_id: registroId,
        suite_id: suiteId || null,
        suite_nome: suiteNome,
        descricao: descricao.trim(),
        foto_url: fotoUrl,
        registrado_por: user.id,
      });
      if (error) throw error;
      notificar('Objeto registrado. A recepção já consegue ver.', 'sucesso');
      fechar();
    } catch {
      notificar('Não foi possível registrar o objeto. Verifique a conexão.', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm font-medium hover:bg-amber-100"
      >
        <PackageSearch className="w-4 h-4" />
        Hóspede esqueceu algo
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-lg shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">Objeto esquecido · {suiteNome}</h2>
              <button onClick={fechar} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Foto do objeto</p>
                {/* câmera e galeria separadas: com capture o Android abre só a câmera */}
                <input id="objeto-foto-camera" type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => { escolherFoto(e.target.files); e.target.value = ''; }} />
                <input id="objeto-foto-galeria" type="file" accept="image/*" className="hidden"
                  onChange={(e) => { escolherFoto(e.target.files); e.target.value = ''; }} />
                {foto ? (
                  <div className="relative inline-block">
                    <img src={foto.preview} alt="Foto do objeto" className="w-40 h-40 object-cover rounded-lg border border-gray-200" />
                    <button type="button" onClick={() => { URL.revokeObjectURL(foto.preview); setFoto(null); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center" aria-label="Remover foto">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <label htmlFor="objeto-foto-camera" className="inline-flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-800 bg-amber-50 rounded-md cursor-pointer hover:bg-amber-100">
                      <Camera className="w-4 h-4" /> Tirar foto
                    </label>
                    <label htmlFor="objeto-foto-galeria" className="inline-flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-800 bg-white rounded-md cursor-pointer hover:bg-amber-50">
                      <ImageIcon className="w-4 h-4" /> Escolher da galeria
                    </label>
                  </div>
                )}
              </div>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">O que é e onde estava *</span>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Ex.: carregador de celular branco, na tomada ao lado da cama"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </label>
              <p className="text-xs text-gray-500">Guarde o objeto conforme o combinado no hotel. A recepção recebe o registro com a foto.</p>
            </div>
            <div className="flex gap-2 justify-end px-5 py-4 border-t border-gray-200">
              <button onClick={fechar} disabled={salvando} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Lista de achados e perdidos (recepção / governança / gestão). */
export function ListaObjetosEsquecidos() {
  const { user } = useAuth();
  const [lista, setLista] = useState<ObjetoEsquecido[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [fotoAberta, setFotoAberta] = useState<string | null>(null);

  const carregar = async () => {
    if (!user?.empresaId) return;
    setCarregando(true);
    const { data } = await supabase
      .from('objetos_esquecidos')
      .select('*')
      .eq('empresa_id', user.empresaId)
      .order('registrado_em', { ascending: false })
      .limit(200);
    const itens = (data as ObjetoEsquecido[]) || [];
    setLista(itens);
    const ids = [...new Set(itens.flatMap((o) => [o.registrado_por, o.resolvido_por]).filter(Boolean))] as string[];
    if (ids.length) {
      // em lotes: até 400 ids iriam numa URL só
      const us = await emLotes(ids, (lote) => supabase.from('usuarios').select('id, name').in('id', lote)).catch(() => []);
      setNomes(Object.fromEntries((us as { id: string; name: string }[]).map((u) => [u.id, u.name])));
    }
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, [user?.empresaId]);

  const resolver = async (o: ObjetoEsquecido, status: 'devolvido' | 'descartado' | 'guardado') => {
    const pergunta = status === 'devolvido' ? `Confirmar que "${o.descricao}" foi devolvido ao hóspede?`
      : status === 'descartado' ? `Confirmar o descarte de "${o.descricao}"?`
      : 'Voltar este objeto para "guardado"?';
    if (!(await confirmar(pergunta))) return;
    const { error } = await supabase.rpc('resolver_objeto_esquecido', { p_id: o.id, p_status: status });
    if (error) {
      notificar('Não foi possível atualizar. Tente novamente.', 'erro');
      return;
    }
    carregar();
  };

  const guardados = lista.filter((o) => o.status === 'guardado');
  const resolvidos = lista.filter((o) => o.status !== 'guardado');

  const cartao = (o: ObjetoEsquecido) => (
    <div key={o.id} className="flex gap-3 bg-white border border-gray-200 rounded-lg p-3">
      {o.foto_url ? (
        <button type="button" onClick={() => setFotoAberta(o.foto_url)} className="flex-shrink-0">
          <img src={o.foto_url} alt={o.descricao} className="w-20 h-20 object-cover rounded-md border border-gray-200" />
        </button>
      ) : (
        <div className="w-20 h-20 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center text-gray-400">
          <PackageSearch className="w-7 h-7" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-800">{o.suite_nome || 'Suíte'}</p>
        <p className="text-sm text-gray-700 break-words">{o.descricao}</p>
        <p className="text-xs text-gray-500 mt-1">
          Registrado por {nomes[o.registrado_por || ''] || '—'} em {dataHora(o.registrado_em)}
        </p>
        {o.status !== 'guardado' && (
          <p className={`text-xs mt-1 font-medium ${o.status === 'devolvido' ? 'text-green-700' : 'text-gray-600'}`}>
            {o.status === 'devolvido' ? 'Devolvido' : 'Descartado'} por {nomes[o.resolvido_por || ''] || '—'} em {dataHora(o.resolvido_em)}
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
          {o.status === 'guardado' ? (
            <>
              <button onClick={() => resolver(o, 'devolvido')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700">
                <Check className="w-3.5 h-3.5" /> Devolvido
              </button>
              <button onClick={() => resolver(o, 'descartado')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-xs hover:bg-gray-50">
                <Trash2 className="w-3.5 h-3.5" /> Descartado
              </button>
            </>
          ) : (
            <button onClick={() => resolver(o, 'guardado')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 text-xs hover:bg-gray-50">
              <RotateCcw className="w-3.5 h-3.5" /> Voltar para guardado
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <PackageSearch className="w-5 h-5 text-amber-600" /> Achados e perdidos
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Objetos que a governança encontrou nos quartos. Marque quando forem devolvidos ao hóspede ou descartados.
        </p>
      </div>

      {carregando ? (
        <p className="text-sm text-gray-500 px-1">Carregando...</p>
      ) : (
        <>
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 px-1">Guardados ({guardados.length})</h4>
            {guardados.length === 0 ? (
              <p className="text-sm text-gray-500 px-1">Nenhum objeto guardado no momento.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">{guardados.map(cartao)}</div>
            )}
          </section>
          {resolvidos.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 px-1">Histórico</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">{resolvidos.slice(0, 50).map(cartao)}</div>
            </section>
          )}
        </>
      )}

      {fotoAberta && (
        <div className="fixed inset-0 z-[9998] bg-black/80 flex items-center justify-center p-4" onClick={() => setFotoAberta(null)}>
          <img src={fotoAberta} alt="Objeto esquecido" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
