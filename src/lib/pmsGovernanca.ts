// Importação do relatório de governança do PMS (por enquanto o perfil Erbon,
// "Governança" / HouseKeeping). O PDF vira linhas de texto (pdfParaLinhas) e
// cada perfil reconhece as suas colunas; a saída é sempre a mesma, e a
// sugestão de serviço segue a regra combinada com o Rodrigo (25/11/2026):
//   em manutenção            → fica de fora
//   in house, sai hoje       → check-out
//   in house, sai outro dia  → permanência
//   livre + chegada prevista → check-in
//   livre, sem chegada, sujo → suíte livre
//   livre, sem chegada, limpo→ nada a fazer

export type ServicoSugerido = 'check_out' | 'permanencia' | 'check_in' | 'suite_livre' | null;

export interface UhPms {
  uh: string;
  status: string; // Sujo, Limpo...
  livre: boolean;
  manutencao: boolean;
  tipoUh: string;
  chegada: boolean;
  obsChegada: string;
  hospede: string;
  checkin: string | null; // aaaa-mm-dd
  checkout: string | null; // aaaa-mm-dd
  observacoes: string;
}

export interface RelatorioGovernanca {
  pms: string;
  hotel: string;
  dia: string; // aaaa-mm-dd
  uhs: UhPms[];
}

const DATA = /(\d{2})\/(\d{2})\/(\d{4})/;
const paraIso = (d: string) => {
  const m = d.match(DATA);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const simNao = (v: string) => /^sim$/i.test(v);

// linha da UH: "3 Sujo Sim Não 03 Sim [obs da chegada]"
const LINHA_UH = /^(\S+)\s+(.+?)\s+(Sim|Não|Nao)\s+(Sim|Não|Nao)\s+(\S+)\s+(Sim|Não|Nao)\b\s*(.*)$/i;

/** Perfil Erbon — relatório "Governança". Devolve null se não reconhecer o arquivo. */
export function lerGovernancaErbon(linhas: string[]): RelatorioGovernanca | null {
  const texto = linhas.join('\n');
  if (!/erbon/i.test(texto) || !/Governan[çc]a/i.test(texto)) return null;

  const linhaDia = linhas.find((l) => /^Dia\s+\d{2}\/\d{2}\/\d{4}/i.test(l));
  const dia = linhaDia ? paraIso(linhaDia) : null;
  if (!dia) return null;

  // nome do hotel: no rodapé, logo antes da linha "www.erbonsoftware.com.br ..." (repete por página)
  const iRodape = linhas.findIndex((l) => /erbonsoftware/i.test(l));
  const hotel = iRodape > 0 ? linhas[iRodape - 1] : '';

  const uhs: UhPms[] = [];
  let atual: UhPms | null = null;
  for (const linha of linhas) {
    if (/^Andar\b/i.test(linha) || /erbonsoftware|Processado por computador/i.test(linha) || (hotel && linha === hotel)) {
      atual = null;
      continue;
    }
    const m = linha.match(LINHA_UH);
    if (m && !/^UH$/i.test(m[1])) {
      atual = {
        uh: m[1],
        status: m[2].trim(),
        livre: simNao(m[3]),
        manutencao: simNao(m[4]),
        tipoUh: m[5],
        chegada: simNao(m[6]),
        obsChegada: m[7].trim(),
        hospede: '',
        checkin: null,
        checkout: null,
        observacoes: '',
      };
      uhs.push(atual);
      continue;
    }
    if (!atual) continue;
    // linha do hóspede in house: nome ... dd/mm/aaaa dd/mm/aaaa [Ad Cr BB]
    const datas = [...linha.matchAll(/\d{2}\/\d{2}\/\d{4}/g)].map((x) => x[0]);
    if (datas.length >= 2 && !atual.hospede) {
      atual.hospede = linha.slice(0, linha.indexOf(datas[0])).trim();
      atual.checkin = paraIso(datas[0]);
      atual.checkout = paraIso(datas[1]);
    } else if (!/^(UH|Hóspede In House|Observações da Reserva|Status Limpeza|Check-in|Livre\?|Ad\. Cr|Em Manut)/i.test(linha)) {
      atual.observacoes = [atual.observacoes, linha].filter(Boolean).join(' ');
    }
  }
  if (uhs.length === 0) return null;
  return { pms: 'Erbon', hotel, dia, uhs };
}

/** Sugestão de serviço para a UH no dia do relatório, com o motivo em português. */
export function sugerirServico(uh: UhPms, dia: string): { servico: ServicoSugerido; motivo: string } {
  if (uh.manutencao) return { servico: null, motivo: 'Em manutenção' };
  const inHouse = !uh.livre || !!uh.hospede;
  if (inHouse) {
    if (uh.checkout === dia) {
      return { servico: 'check_out', motivo: uh.chegada ? 'Sai hoje e tem chegada prevista' : 'Hóspede sai hoje' };
    }
    return { servico: 'permanencia', motivo: uh.checkout ? `Hóspede fica até ${uh.checkout.split('-').reverse().join('/')}` : 'Hóspede in house' };
  }
  if (uh.chegada) return { servico: 'check_in', motivo: 'Livre, com chegada prevista' };
  if (/limp|vistori|inspec/i.test(uh.status)) return { servico: null, motivo: `Livre e ${uh.status.toLowerCase()}` };
  return { servico: 'suite_livre', motivo: `Livre e ${uh.status.toLowerCase() || 'sem status'}` };
}

/** Tenta casar a UH do PMS com a suíte cadastrada ("1" ↔ "Suíte 1", "101" ↔ "101"). */
export function casarSuite<T extends { id: string; name: string }>(uh: string, suites: T[]): T | null {
  const norm = (v: string) => v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^(suite|su[ií]te|uh|apto|apartamento|quarto)\s*/i, '').replace(/\s+/g, '').replace(/^0+(?=\d)/, '');
  const alvo = norm(uh);
  return suites.find((s) => norm(s.name) === alvo) || null;
}
