import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getDataAtual } from '../../utils/dateUtils';

// Quadros do dia da governança: liberados, tipos de serviço, limpas e por fazer.

interface Contagem {
  total: number;
  liberados: number;
  check_out: number;
  permanencia: number;
  check_in: number;
  suite_livre: number;
  limpas: number;
  porFazer: number;
  emLimpeza: number;
}

const VAZIO: Contagem = { total: 0, liberados: 0, check_out: 0, permanencia: 0, check_in: 0, suite_livre: 0, limpas: 0, porFazer: 0, emLimpeza: 0 };

export function ResumoSuitesDia({ atualizar = 0 }: { atualizar?: number }) {
  const { user } = useAuth();
  const [c, setC] = useState<Contagem>(VAZIO);

  const carregar = async () => {
    if (!user?.empresaId) return;
    const { data } = await supabase
      .from('registros_camararia')
      .select('tipo_servico, status, quarto_liberado_em')
      .eq('empresa_id', user.empresaId)
      .eq('data', getDataAtual())
      .in('status', ['programado', 'em_andamento', 'concluido']);
    const regs = (data as { tipo_servico: string; status: string; quarto_liberado_em: string | null }[]) || [];
    const n = { ...VAZIO, total: regs.length };
    for (const r of regs) {
      if (r.tipo_servico in n) (n as any)[r.tipo_servico] += 1;
      if (r.quarto_liberado_em && r.tipo_servico !== 'suite_livre') n.liberados += 1;
      if (r.status === 'concluido') n.limpas += 1;
      else n.porFazer += 1;
      if (r.status === 'em_andamento') n.emLimpeza += 1;
    }
    setC(n);
  };

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60_000);
    return () => clearInterval(t);
  }, [user?.empresaId, atualizar]);

  if (c.total === 0) return null;

  const precisamLiberar = c.total - c.suite_livre;
  const quadros: { rotulo: string; valor: number; detalhe?: string; cor: string }[] = [
    { rotulo: 'Quartos liberados', valor: c.liberados, detalhe: `de ${precisamLiberar}`, cor: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
    { rotulo: 'Check-out', valor: c.check_out, cor: 'border-gray-200 bg-white text-gray-800' },
    { rotulo: 'Permanência', valor: c.permanencia, cor: 'border-gray-200 bg-white text-gray-800' },
    { rotulo: 'Check-in', valor: c.check_in, cor: 'border-gray-200 bg-white text-gray-800' },
    { rotulo: 'Suíte livre', valor: c.suite_livre, cor: 'border-gray-200 bg-white text-gray-800' },
    { rotulo: 'Suítes limpas', valor: c.limpas, detalhe: `de ${c.total}`, cor: 'border-blue-200 bg-blue-50 text-blue-800' },
    { rotulo: 'Por fazer', valor: c.porFazer, detalhe: c.emLimpeza ? `${c.emLimpeza} em limpeza` : undefined, cor: 'border-amber-200 bg-amber-50 text-amber-800' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {quadros.map((q) => (
        <div key={q.rotulo} className={`rounded-lg border px-3 py-2 ${q.cor}`}>
          <p className="text-xs opacity-80">{q.rotulo}</p>
          <p className="text-2xl font-bold leading-tight">{q.valor}</p>
          {q.detalhe && <p className="text-[11px] opacity-75">{q.detalhe}</p>}
        </div>
      ))}
    </div>
  );
}
