// PDF → linhas de texto, no próprio navegador (pdf.js carregado só quando usado).
// O pdf.js devolve pedaços de texto soltos com coordenadas; agrupamos pela
// posição vertical para reconstruir cada linha do relatório.
export async function pdfParaLinhas(arquivo: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.js?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  const linhas: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const conteudo = await (await pdf.getPage(p)).getTextContent();
    const porY = new Map<number, { x: number; texto: string }[]>();
    for (const item of conteudo.items as { str: string; transform: number[] }[]) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!porY.has(y)) porY.set(y, []);
      porY.get(y)!.push({ x: item.transform[4], texto: item.str });
    }
    [...porY.keys()]
      .sort((a, b) => b - a)
      .forEach((y) =>
        linhas.push(
          porY.get(y)!
            .sort((a, b) => a.x - b.x)
            .map((i) => i.texto)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim()
        )
      );
  }
  return linhas;
}
