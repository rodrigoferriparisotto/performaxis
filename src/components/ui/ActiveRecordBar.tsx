import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { TEMAS_MODULO, ModuloChave } from '../../constants/moduleTheme';

const COR_BARRA: Record<ModuloChave, string> = {
  recepcao: 'bg-blue-600',
  camararia: 'bg-green-600',
  revisao: 'bg-yellow-500',
  areas_comuns: 'bg-indigo-600',
  cozinha: 'bg-teal-600',
  gestao: 'bg-purple-600',
  vendas: 'bg-pink-600',
  atividades_extras: 'bg-sky-600',
  atividades_diarias: 'bg-slate-600',
  manutencao: 'bg-orange-600',
};

interface ActiveRecordBarProps {
  modulo: ModuloChave;
  icon: React.ComponentType<{ className?: string }>;
  /** detalhe do registro (tipo, suíte...) */
  detalhe?: React.ReactNode;
  concluidas: number;
  total: number;
  /** início do registro (ISO) */
  inicio?: string | null;
  menuRecolhido: boolean;
}

function minutosDesde(inicio?: string | null): number {
  if (!inicio) return 0;
  const t = new Date(inicio).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 60000));
}

/**
 * Barra fixa de progresso do registro em andamento. No celular ocupa duas
 * linhas (antes era uma linha só que não cabia em 375px). O contador de
 * minutos tem o próprio relógio, sem re-renderizar a tela inteira.
 */
export function ActiveRecordBar({
  modulo,
  icon: Icone,
  detalhe,
  concluidas,
  total,
  inicio,
  menuRecolhido,
}: ActiveRecordBarProps) {
  const tema = TEMAS_MODULO[modulo];
  const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0;
  const [minutos, setMinutos] = useState(() => minutosDesde(inicio));

  useEffect(() => {
    setMinutos(minutosDesde(inicio));
    const id = setInterval(() => setMinutos(minutosDesde(inicio)), 30000);
    return () => clearInterval(id);
  }, [inicio]);

  return (
    <>
      <div
        className={`fixed top-[60px] lg:top-0 left-0 right-0 z-[50] bg-white shadow-lg border-b border-gray-200 transition-all duration-300 ${
          menuRecolhido ? 'lg:left-20' : 'lg:left-72'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`p-1.5 rounded-md ${tema.chip}`}>
              <Icone className="w-4 h-4" />
            </span>
            <span className="font-medium text-gray-800">{tema.nome}</span>
            {detalhe && <span className="text-sm text-gray-600 truncate">· {detalhe}</span>}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 sm:w-32 sm:flex-none bg-gray-200 rounded-full h-2.5">
              <div
                className={`${COR_BARRA[modulo]} h-2.5 rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-bold text-gray-800 tabular-nums">{pct}%</span>
            <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
              {concluidas}/{total}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5" />
              {minutos} min
            </span>
          </div>
        </div>
      </div>
      {/* espaço reservado para a barra fixa */}
      <div className="h-20 sm:h-14" />
    </>
  );
}
