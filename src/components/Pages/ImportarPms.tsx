import { useMemo, useState } from 'react';
import { FileUp, X, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { emLotes } from '../../lib/paginacao';
import { obterContextoUsuario } from '../../services/supabaseService';
import { formatarData, getDataAtual } from '../../utils/dateUtils';
import { nomeSuite } from '../../utils/nomeSuite';
import { notificar } from '../../lib/feedback';
import { pdfParaLinhas } from '../../lib/pdfLinhas';
import { casarSuite, lerGovernancaErbon, RelatorioGovernanca, sugerirServico, UhPms } from '../../lib/pmsGovernanca';
import type { ServicoOpcao } from './ProgramacaoEmLote';

interface Props {
  suites: { id: string; name: string }[];
  servicos: ServicoOpcao[];
  jaProgramadas: (data: string) => string[];
  usuarioId: string;
  onFechar: () => void;
  onSalvo: () => Promise<void> | void;
}

interface Linha {
  uh: UhPms;
  suiteId: string; // '' = sem suíte
  servico: string; // '' = não programar
  motivo: string;
}

const NOMES_PADRAO: Record<string, string> = {
  check_in: 'Check-in',
  check_out: 'Check-out',
  permanencia: 'Permanência',
  suite_livre: 'Suíte livre',
};

/** Lê o relatório de governança do PMS (PDF) e sugere a programação do dia; a gestão confere e confirma. */
export default function ImportarPms({ suites, servicos, jaProgramadas, usuarioId, onFechar, onSalvo }: Props) {
  const [lendo, setLendo] = useState(false);
  const [relatorio, setRelatorio] = useState<RelatorioGovernanca | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [salvando, setSalvando] = useState(false);

  // serviços do hotel + os quatro padrão (se o hotel não tiver cadastrado algum)
  const opcoesServico = useMemo(() => {
    const mapa = new Map(servicos.map((s) => [s.valor, s.nome]));
    for (const [valor, nome] of Object.entries(NOMES_PADRAO)) if (!mapa.has(valor)) mapa.set(valor, nome);
    return [...mapa.entries()].map(([valor, nome]) => ({ valor, nome }));
  }, [servicos]);

  const ocupadas = useMemo(() => new Set(relatorio ? jaProgramadas(relatorio.dia) : []), [relatorio, jaProgramadas]);
  const suitesOrdenadas = useMemo(
    () => [...suites].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' })),
    [suites]
  );

  const ler = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setLendo(true);
    try {
      const rel = lerGovernancaErbon(await pdfParaLinhas(arquivo));
      if (!rel) {
        notificar('Não reconheci este PDF. Por enquanto o sistema lê o relatório "Governança" do Erbon.', 'aviso');
        return;
      }
      setRelatorio(rel);
      setLinhas(
        rel.uhs.map((uh) => {
          const s = sugerirServico(uh, rel.dia);
          return { uh, suiteId: casarSuite(uh.uh, suites)?.id || '', servico: s.servico || '', motivo: s.motivo };
        })
      );
    } catch (erro) {
      console.error('[Importar PMS] Erro ao ler o PDF:', erro);
      notificar('Não foi possível ler o PDF. Confira se é o arquivo exportado pelo PMS.', 'erro');
    } finally {
      setLendo(false);
    }
  };

  const atualizar = (i: number, campo: 'suiteId' | 'servico', valor: string) =>
    setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));

  const aProgramar = linhas.filter((l) => l.servico && l.suiteId && !ocupadas.has(l.suiteId));
  const semSuite = linhas.filter((l) => l.servico && !l.suiteId).length;
  const contagem = opcoesServico
    .map((o) => ({ ...o, total: aProgramar.filter((l) => l.servico === o.valor).length }))
    .filter((o) => o.total > 0);

  const salvar = async () => {
    if (!relatorio || aProgramar.length === 0) {
      notificar('Nada para programar.', 'aviso');
      return;
    }
    setSalvando(true);
    try {
      const { userData } = await obterContextoUsuario();
      if (!userData?.empresa_id) {
        notificar('Usuário sem empresa vinculada.', 'erro');
        return;
      }
      const data = relatorio.dia;
      // confere no banco (alguém pode ter programado enquanto a prévia estava aberta)
      // em lotes: centenas de suítes não cabem numa URL só (lança o erro)
      const existentes = await emLotes(aProgramar.map((l) => l.suiteId), (lote) =>
        supabase
          .from('registros_camararia')
          .select('suite_id')
          .eq('empresa_id', userData.empresa_id)
          .eq('status', 'programado')
          .eq('data', data)
          .in('suite_id', lote)
      );
      const repetidas = new Set(existentes.map((r) => r.suite_id));
      const novas = aProgramar
        .filter((l) => !repetidas.has(l.suiteId))
        .map((l) => ({
          data,
          suite_id: l.suiteId,
          tipo_servico: l.servico,
          usuario_id: usuarioId,
          empresa_id: userData.empresa_id,
          status: 'programado' as const,
          hora_inicio: `${data}T00:00:00Z`,
          atividades: [],
          observacoes: [l.uh.obsChegada && `Chegada: ${l.uh.obsChegada}`, l.uh.observacoes].filter(Boolean).join(' · ').slice(0, 500),
          fotos: [],
        }));
      if (novas.length > 0) {
        const { error } = await supabase.from('registros_camararia').insert(novas);
        if (error) throw error;
      }
      await onSalvo();
      notificar(
        `${novas.length} suíte(s) programada(s) para ${formatarData(data)} a partir do PMS.` +
          (repetidas.size ? ` ${repetidas.size} já estavam programadas e foram ignoradas.` : ''),
        'sucesso'
      );
      onFechar();
    } catch (erro) {
      console.error('[Importar PMS] Erro ao salvar:', erro);
      notificar('Não foi possível salvar a programação. Tente novamente.', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-lg shadow-2xl max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FileUp className="w-5 h-5 text-green-600" /> Importar do PMS
          </h2>
          <button onClick={onFechar} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {!relatorio ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Exporte do PMS o relatório de <strong>Governança</strong> do dia em PDF e escolha o arquivo abaixo.
                O sistema sugere o serviço de cada suíte; você confere antes de confirmar.
              </p>
              <ul className="text-xs text-gray-600 list-disc pl-5 space-y-0.5">
                <li>Hóspede sai no dia → Check-out · fica → Permanência</li>
                <li>Livre com chegada prevista → Check-in</li>
                <li>Livre, sem chegada e suja → Suíte livre · limpa → nada a fazer</li>
                <li>Em manutenção → fica de fora</li>
              </ul>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 cursor-pointer">
                <FileUp className="w-4 h-4" />
                {lendo ? 'Lendo o PDF...' : 'Escolher PDF'}
                <input type="file" accept="application/pdf" className="hidden" disabled={lendo}
                  onChange={(e) => { ler(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              <p className="text-xs text-gray-500">Por enquanto: relatório “Governança” do Erbon. Outros PMS entram conforme os clientes.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold text-gray-800">{relatorio.hotel || 'Relatório'} · {formatarData(relatorio.dia)}</span>
                <span className="text-gray-500">{relatorio.pms} · {relatorio.uhs.length} UHs</span>
              </div>
              {relatorio.dia !== getDataAtual() && (
                <p className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  O relatório é de {formatarData(relatorio.dia)}, não de hoje. A programação será criada para essa data.
                </p>
              )}

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                {linhas.map((l, i) => {
                  const jaTem = l.suiteId && ocupadas.has(l.suiteId);
                  return (
                    <div key={l.uh.uh + i} className={`grid grid-cols-1 sm:grid-cols-[1fr_9rem_10rem] gap-2 px-3 py-2 ${jaTem ? 'bg-gray-50' : ''}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          UH {l.uh.uh}
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            {l.uh.status}{l.uh.livre ? ' · livre' : ' · ocupada'}{l.uh.chegada ? ' · chegada prevista' : ''}{l.uh.manutencao ? ' · em manutenção' : ''}
                          </span>
                        </p>
                        {l.uh.hospede && (
                          <p className="text-xs text-gray-600 truncate">
                            {l.uh.hospede}
                            {l.uh.checkout ? ` · saída ${l.uh.checkout.split('-').reverse().join('/')}` : ''}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-500">{jaTem ? 'Já programada nesta data — será ignorada' : l.motivo}</p>
                      </div>
                      <select
                        value={l.suiteId}
                        onChange={(e) => atualizar(i, 'suiteId', e.target.value)}
                        className={`px-2 py-1.5 border rounded-md text-sm ${l.suiteId ? 'border-gray-300' : 'border-red-300 text-red-700'}`}
                        aria-label={`Suíte da UH ${l.uh.uh}`}
                      >
                        <option value="">Suíte?</option>
                        {suitesOrdenadas.map((s) => (
                          <option key={s.id} value={s.id}>{nomeSuite(s.name)}</option>
                        ))}
                      </select>
                      <select
                        value={l.servico}
                        onChange={(e) => atualizar(i, 'servico', e.target.value)}
                        disabled={!!jaTem}
                        className="px-2 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                        aria-label={`Serviço da UH ${l.uh.uh}`}
                      >
                        <option value="">Não programar</option>
                        {opcoesServico.map((o) => (
                          <option key={o.valor} value={o.valor}>{o.nome}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {relatorio && (
          <div className="px-5 py-3 border-t border-gray-200 space-y-2">
            <p className="text-xs text-gray-600">
              {aProgramar.length} a programar{contagem.length ? `: ${contagem.map((c) => `${c.total} ${c.nome}`).join(' · ')}` : ''}
              {semSuite ? ` · ${semSuite} sem suíte escolhida (ficam de fora)` : ''}
            </p>
            <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={() => { setRelatorio(null); setLinhas([]); }} disabled={salvando}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                Outro PDF
              </button>
              <button onClick={salvar} disabled={salvando || aProgramar.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                <Save className="w-4 h-4" />
                {salvando ? 'Programando...' : `Programar ${aProgramar.length} suíte(s)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
