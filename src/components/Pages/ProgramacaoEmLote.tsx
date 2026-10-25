import { useMemo, useState } from 'react';
import { CalendarDays, Check, Eraser, Layers, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { obterContextoUsuario } from '../../services/supabaseService';
import { getDataAtual, formatarData } from '../../utils/dateUtils';
import { nomeSuite } from '../../utils/nomeSuite';
import { notificar } from '../../lib/feedback';

export interface ServicoOpcao {
  valor: string; // valor gravado em tipo_servico (check_in, check_out...)
  nome: string;  // nome cadastrado pelo hotel
}

interface Props {
  suites: { id: string; name: string; type?: string }[];
  servicos: ServicoOpcao[];
  /** suite_id já programadas por data ('aaaa-mm-dd' → ids) */
  jaProgramadas: (data: string) => string[];
  usuarioId: string;
  onFechar: () => void;
  onSalvo: () => Promise<void> | void;
}

// classes por extenso (o Tailwind só gera o que aparece literalmente no código)
const CORES = [
  { chip: 'bg-blue-600 text-white border-blue-600', pill: 'bg-blue-100 text-blue-800 border-blue-300', ponto: 'bg-blue-600' },
  { chip: 'bg-emerald-600 text-white border-emerald-600', pill: 'bg-emerald-100 text-emerald-800 border-emerald-300', ponto: 'bg-emerald-600' },
  { chip: 'bg-amber-500 text-white border-amber-500', pill: 'bg-amber-100 text-amber-800 border-amber-300', ponto: 'bg-amber-500' },
  { chip: 'bg-purple-600 text-white border-purple-600', pill: 'bg-purple-100 text-purple-800 border-purple-300', ponto: 'bg-purple-600' },
  { chip: 'bg-rose-600 text-white border-rose-600', pill: 'bg-rose-100 text-rose-800 border-rose-300', ponto: 'bg-rose-600' },
  { chip: 'bg-teal-600 text-white border-teal-600', pill: 'bg-teal-100 text-teal-800 border-teal-300', ponto: 'bg-teal-600' },
];

const ordenarPorNome = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' });

export default function ProgramacaoEmLote({ suites, servicos, jaProgramadas, usuarioId, onFechar, onSalvo }: Props) {
  const [data, setData] = useState(getDataAtual());
  const [servicoAtivo, setServicoAtivo] = useState(servicos[0]?.valor ?? '');
  // suite_id → tipo_servico
  const [plano, setPlano] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const corDe = (valor: string) => CORES[Math.max(0, servicos.findIndex((s) => s.valor === valor)) % CORES.length];
  const ocupadas = useMemo(() => new Set(jaProgramadas(data)), [jaProgramadas, data]);
  const suitesOrdenadas = useMemo(() => [...suites].sort(ordenarPorNome), [suites]);
  const livres = suitesOrdenadas.filter((s) => !ocupadas.has(s.id));

  const totalPorServico = servicos
    .map((s) => ({ ...s, total: Object.values(plano).filter((v) => v === s.valor).length }))
    .filter((s) => s.total > 0);
  const total = Object.keys(plano).length;

  const trocarData = (nova: string) => {
    setData(nova);
    // suítes que já têm programação na nova data saem do lote
    const bloqueadas = new Set(jaProgramadas(nova));
    setPlano((p) => Object.fromEntries(Object.entries(p).filter(([id]) => !bloqueadas.has(id))));
  };

  const tocarSuite = (id: string) => {
    if (ocupadas.has(id) || !servicoAtivo) return;
    setPlano((p) => {
      const novo = { ...p };
      if (novo[id] === servicoAtivo) delete novo[id];
      else novo[id] = servicoAtivo;
      return novo;
    });
  };

  const marcarTodasLivres = () => {
    if (!servicoAtivo) return;
    setPlano((p) => {
      const novo = { ...p };
      livres.forEach((s) => {
        if (!novo[s.id]) novo[s.id] = servicoAtivo;
      });
      return novo;
    });
  };

  const salvar = async () => {
    if (total === 0) {
      notificar('Toque nas suítes para montar a programação.', 'aviso');
      return;
    }
    setSalvando(true);
    try {
      const { userData } = await obterContextoUsuario();
      if (!userData?.empresa_id) {
        notificar('Usuário sem empresa vinculada.', 'erro');
        return;
      }

      // confere no banco (outra pessoa pode ter programado enquanto o lote era montado)
      const { data: existentes, error: erroBusca } = await supabase
        .from('registros_camararia')
        .select('suite_id')
        .eq('empresa_id', userData.empresa_id)
        .eq('status', 'programado')
        .eq('data', data)
        .in('suite_id', Object.keys(plano));
      if (erroBusca) throw erroBusca;
      const repetidas = new Set((existentes || []).map((r) => r.suite_id));

      const linhas = Object.entries(plano)
        .filter(([suiteId]) => !repetidas.has(suiteId))
        .map(([suiteId, tipo]) => ({
          data,
          suite_id: suiteId,
          tipo_servico: tipo,
          usuario_id: usuarioId,
          empresa_id: userData.empresa_id,
          status: 'programado' as const,
          hora_inicio: `${data}T00:00:00Z`,
          atividades: [],
          observacoes: '',
          fotos: [],
        }));

      if (linhas.length > 0) {
        const { error } = await supabase.from('registros_camararia').insert(linhas);
        if (error) throw error;
      }

      await onSalvo();
      notificar(
        repetidas.size > 0
          ? `${linhas.length} suíte(s) programada(s). ${repetidas.size} já estavam programadas por outra pessoa e foram ignoradas.`
          : `${linhas.length} suíte(s) programada(s) para ${formatarData(data)}!`,
        'sucesso'
      );
      onFechar();
    } catch (erro) {
      console.error('[Programação em lote] Erro ao salvar:', erro);
      notificar('Não foi possível salvar a programação. Nada foi gravado; tente de novo.', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[70] sm:p-4">
      <div className="bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-xl shadow-xl flex flex-col max-h-[calc(100dvh-0.5rem)] sm:max-h-[90vh]">
        {/* cabeçalho */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Programar várias suítes</h3>
          </div>
          <button onClick={onFechar} aria-label="Fechar" className="p-2 -m-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
          {/* 1. data */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
              <CalendarDays className="w-4 h-4" /> 1. Data
            </label>
            <input
              type="date"
              value={data}
              min={getDataAtual()}
              onChange={(e) => e.target.value && trocarData(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* 2. serviço */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">2. Escolha o serviço e toque nas suítes</p>
            {servicos.length === 0 ? (
              <p className="text-sm text-amber-700">Nenhum serviço de governança ativo. Cadastre em Serviços.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {servicos.map((s) => {
                  const cor = corDe(s.valor);
                  const ativo = servicoAtivo === s.valor;
                  return (
                    <button
                      key={s.valor + s.nome}
                      type="button"
                      onClick={() => setServicoAtivo(s.valor)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition ${
                        ativo ? `${cor.pill} ring-2 ring-offset-1 ring-gray-400` : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${cor.ponto}`} />
                      {s.nome}
                      {ativo && <Check className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ações rápidas */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={marcarTodasLivres}
              disabled={!servicoAtivo || livres.length === 0}
              className="px-3 py-2 text-sm rounded-md border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50"
            >
              Todas as livres ({livres.length})
            </button>
            <button
              type="button"
              onClick={() => setPlano({})}
              disabled={total === 0}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Eraser className="w-4 h-4" /> Limpar
            </button>
            {ocupadas.size > 0 && (
              <span className="text-xs text-gray-500">{ocupadas.size} já programada(s) nesta data</span>
            )}
          </div>

          {/* grade de suítes */}
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {suitesOrdenadas.map((s) => {
              const tipo = plano[s.id];
              const bloqueada = ocupadas.has(s.id);
              const cor = tipo ? corDe(tipo) : null;
              const nomeServico = tipo ? servicos.find((x) => x.valor === tipo)?.nome : null;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => tocarSuite(s.id)}
                  disabled={bloqueada}
                  title={bloqueada ? 'Já programada nesta data' : undefined}
                  className={`min-h-[56px] px-2 py-2 rounded-lg border text-left transition ${
                    bloqueada
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : cor
                      ? cor.chip
                      : 'bg-white text-gray-800 border-gray-300 hover:border-green-400 hover:bg-green-50'
                  }`}
                >
                  <span className="block text-sm font-semibold leading-tight truncate">{nomeSuite(s.name)}</span>
                  <span className="block text-[11px] leading-tight truncate opacity-90">
                    {bloqueada ? 'já programada' : nomeServico || s.type || ' '}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* rodapé com resumo */}
        <div className="border-t border-gray-200 px-4 sm:px-6 py-3 space-y-3">
          <div className="flex flex-wrap gap-2 min-h-[28px]">
            {totalPorServico.length === 0 ? (
              <span className="text-sm text-gray-500">Nenhuma suíte selecionada</span>
            ) : (
              totalPorServico.map((s) => (
                <span key={s.valor} className={`px-2.5 py-1 rounded-full border text-xs font-medium ${corDe(s.valor).pill}`}>
                  {s.total} × {s.nome}
                </span>
              ))
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              onClick={onFechar}
              className="sm:flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando || total === 0}
              className="sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {salvando ? 'Salvando...' : `Programar ${total} suíte(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
