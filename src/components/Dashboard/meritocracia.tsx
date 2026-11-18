import { Award, BadgeCheck } from 'lucide-react';

// Peças visuais compartilhadas do ranking por meritocracia (diário e mensal).

export type Faixa = 'ouro' | 'prata' | 'bronze';

export interface MeritocraciaConfig {
  peso_uso: number;
  peso_qualidade: number;
  peso_ritmo: number;
  premio_selo: string;
  premio_ouro: string;
  premio_prata: string;
  premio_bronze: string;
}

export const CONFIG_PADRAO: MeritocraciaConfig = {
  peso_uso: 30,
  peso_qualidade: 50,
  peso_ritmo: 20,
  premio_selo: '',
  premio_ouro: '',
  premio_prata: '',
  premio_bronze: '',
};

/** Junta o que veio do banco com os padrões (campos ausentes/nulos). */
export function normalizarConfig(bruto: unknown): MeritocraciaConfig {
  const c = (bruto && typeof bruto === 'object' ? bruto : {}) as Record<string, unknown>;
  const num = (v: unknown, padrao: number) => (v === null || v === undefined || isNaN(Number(v)) ? padrao : Number(v));
  const txt = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    peso_uso: num(c.peso_uso, CONFIG_PADRAO.peso_uso),
    peso_qualidade: num(c.peso_qualidade, CONFIG_PADRAO.peso_qualidade),
    peso_ritmo: num(c.peso_ritmo, CONFIG_PADRAO.peso_ritmo),
    premio_selo: txt(c.premio_selo),
    premio_ouro: txt(c.premio_ouro),
    premio_prata: txt(c.premio_prata),
    premio_bronze: txt(c.premio_bronze),
  };
}

/** Número no padrão brasileiro (87,5). Nulo vira "—". */
export function fmtNum(valor: number | string | null | undefined, casas = 1): string {
  if (valor === null || valor === undefined || valor === '' || isNaN(Number(valor))) return '—';
  return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
}

export function faixaValida(faixa: string | null | undefined): Faixa | null {
  return faixa === 'ouro' || faixa === 'prata' || faixa === 'bronze' ? faixa : null;
}

export const ESTILO_FAIXA: Record<Faixa | 'nenhuma', { rotulo: string; badge: string; numero: string; borda: string; regra: string }> = {
  ouro: {
    rotulo: 'Ouro',
    badge: 'bg-gradient-to-r from-yellow-300 to-amber-400 text-yellow-900 border-yellow-400',
    numero: 'text-amber-600',
    borda: 'border-l-amber-400',
    regra: 'índice ≥ 90',
  },
  prata: {
    rotulo: 'Prata',
    badge: 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800 border-slate-400',
    numero: 'text-slate-600',
    borda: 'border-l-slate-400',
    regra: 'índice ≥ 80',
  },
  bronze: {
    rotulo: 'Bronze',
    badge: 'bg-gradient-to-r from-orange-200 to-orange-300 text-orange-900 border-orange-400',
    numero: 'text-orange-700',
    borda: 'border-l-orange-400',
    regra: 'índice ≥ 70',
  },
  nenhuma: {
    rotulo: 'Sem faixa',
    badge: 'bg-gray-100 text-gray-500 border-gray-200',
    numero: 'text-gray-700',
    borda: 'border-l-gray-200',
    regra: 'índice abaixo de 70',
  },
};

export function estiloFaixa(faixa: string | null | undefined) {
  return ESTILO_FAIXA[faixaValida(faixa) ?? 'nenhuma'];
}

export function FaixaBadge({ faixa, compacto = false }: { faixa: string | null | undefined; compacto?: boolean }) {
  const estilo = estiloFaixa(faixa);
  const temFaixa = faixaValida(faixa) !== null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold whitespace-nowrap ${estilo.badge} ${
        compacto ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
      }`}
      title={estilo.regra}
    >
      {temFaixa && <Award className={compacto ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      {estilo.rotulo}
    </span>
  );
}

export function SeloBadge({ compacto = false }: { compacto?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold whitespace-nowrap ${
        compacto ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
      }`}
      title="Todos os dias de escala: começou no horário, fechou tudo e índice ≥ 70"
    >
      <BadgeCheck className={compacto ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      Selo 100% Performaxis
    </span>
  );
}
