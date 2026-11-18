import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  Gift,
  History,
  Hourglass,
  Info,
  Package,
  RefreshCw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { confirmar, notificar } from '../../lib/feedback';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState, LoadingState } from '../ui/Estados';
import { ESTILO_FAIXA, Faixa, FaixaBadge, SeloBadge, faixaValida, fmtNum } from '../Dashboard/meritocracia';

// Página do colaborador: saldo na moeda de recompensa da empresa (nome
// configurável, padrão "Lhamas"), quanto o mês atual vai render, catálogo de
// prêmios, pedidos de troca e extrato. Nunca mostra dinheiro: só a moeda.

const FUSO = 'America/Sao_Paulo';
const POR_PAGINA = 30;
/** Só se o banco não devolver o nome (falha ao carregar a configuração). */
const MOEDA_PADRAO = 'Lhamas';

interface PremiosConfig {
  nome_moeda: string;
  credito_ouro: number;
  credito_prata: number;
  credito_bronze: number;
  credito_selo: number;
  validade_meses: number;
  perda_mensal_pct: number;
  prazo_entrega_dias: number;
  gestores_participam: boolean;
}

interface Resumo {
  nome_moeda: string;
  saldo: number;
  vencido: number;
  proximo_vencimento: string | null;
  proximo_vencimento_qtd: number;
  perda_mensal_pct: number;
  validade_meses: number;
  reservado: number;
}

interface Premio {
  id: string;
  nome: string;
  descricao: string | null;
  foto_url: string | null;
  custo: number;
}

type TipoMovimento = 'credito' | 'troca' | 'estorno' | 'perda_validade' | 'perda_desligamento' | 'ajuste';

interface Movimento {
  id: string;
  tipo: TipoMovimento;
  quantidade: number;
  descricao: string | null;
  criado_em: string;
}

type StatusResgate = 'solicitado' | 'entregue' | 'cancelado';

interface Resgate {
  id: string;
  premio_nome: string;
  custo: number;
  status: StatusResgate;
  solicitado_em: string;
  prazo_entrega: string | null;
  entregue_em: string | null;
  motivo_cancelamento: string | null;
}

interface DesempenhoMes {
  faixa: string | null;
  selo_100: boolean | null;
  indice_medio: number | null;
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const ROTULO_MOVIMENTO: Record<TipoMovimento, string> = {
  credito: 'Crédito do mês',
  troca: 'Troca por prêmio',
  estorno: 'Estorno de troca',
  perda_validade: 'Perda por validade',
  perda_desligamento: 'Perda por desligamento',
  ajuste: 'Ajuste',
};

// ---------- formatação (pt-BR) ----------

const num = (v: unknown, padrao = 0) => (v === null || v === undefined || isNaN(Number(v)) ? padrao : Number(v));

/** Inteiro no padrão brasileiro: 1.250 */
function fmtQtd(valor: number): string {
  return Math.round(valor).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/** 'aaaa-mm-dd' (ou início de um timestamp) → dd/mm/aaaa, sem mexer no fuso. */
function fmtDataISO(data: string | null | undefined): string {
  if (!data) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

/** Timestamp → dd/mm/aaaa no horário de Brasília. */
function fmtDataHora(ts: string | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return fmtDataISO(ts);
  return d.toLocaleDateString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Ano e mês de hoje no horário de Brasília. */
function mesAtualSP(): { ano: number; mes: number } {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date()
  );
  const [ano, mes] = hoje.split('-').map(Number);
  return { ano, mes };
}

function normalizarConfig(bruto: unknown): PremiosConfig {
  const c = (bruto && typeof bruto === 'object' ? bruto : {}) as Record<string, unknown>;
  return {
    nome_moeda: typeof c.nome_moeda === 'string' && c.nome_moeda.trim() ? c.nome_moeda.trim() : '',
    credito_ouro: num(c.credito_ouro),
    credito_prata: num(c.credito_prata),
    credito_bronze: num(c.credito_bronze),
    credito_selo: num(c.credito_selo),
    validade_meses: num(c.validade_meses),
    perda_mensal_pct: num(c.perda_mensal_pct),
    prazo_entrega_dias: num(c.prazo_entrega_dias),
    gestores_participam: c.gestores_participam !== false,
  };
}

function normalizarResumo(bruto: unknown): Resumo {
  const r = (bruto && typeof bruto === 'object' ? bruto : {}) as Record<string, unknown>;
  return {
    nome_moeda: typeof r.nome_moeda === 'string' && r.nome_moeda.trim() ? r.nome_moeda.trim() : '',
    saldo: num(r.saldo),
    vencido: num(r.vencido),
    proximo_vencimento: typeof r.proximo_vencimento === 'string' && r.proximo_vencimento ? r.proximo_vencimento : null,
    proximo_vencimento_qtd: num(r.proximo_vencimento_qtd),
    perda_mensal_pct: num(r.perda_mensal_pct),
    validade_meses: num(r.validade_meses),
    reservado: num(r.reservado),
  };
}

/** Mensagem amigável para os erros conhecidos das funções do banco. */
function mensagemErro(error: any, padrao: string): string {
  const texto = String(error?.message || '').toLowerCase();
  if (texto.includes('saldo insuficiente')) return 'Saldo insuficiente para este prêmio.';
  if (texto.includes('prêmio não encontrado') || texto.includes('premio nao encontrado'))
    return 'Este prêmio não está mais disponível.';
  if (texto.includes('failed to fetch') || texto.includes('network'))
    return 'Sem conexão. Verifique a internet e tente novamente.';
  return error?.message ? `${padrao}: ${error.message}` : `${padrao}. Tente novamente.`;
}

// ---------- peças visuais ----------

function Secao({
  icone: Icone,
  titulo,
  children,
  acoes,
}: {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  children: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Icone className="w-5 h-5 text-purple-600" />
          {titulo}
        </h2>
        {acoes}
      </div>
      {children}
    </section>
  );
}

function StatusResgateBadge({ resgate }: { resgate: Resgate }) {
  if (resgate.status === 'entregue') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Entregue em {fmtDataHora(resgate.entregue_em)}
      </span>
    );
  }
  if (resgate.status === 'cancelado') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5" />
        Cancelada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 whitespace-nowrap">
      <Clock className="w-3.5 h-3.5" />
      Aguardando entrega{resgate.prazo_entrega ? ` — até ${fmtDataISO(resgate.prazo_entrega)}` : ''}
    </span>
  );
}

function FotoPremio({ url, nome }: { url: string | null; nome: string }) {
  const [falhou, setFalhou] = useState(false);
  if (!url || falhou) {
    return (
      <div className="h-36 w-full bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <Gift className="w-12 h-12 text-purple-300" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={nome}
      loading="lazy"
      onError={() => setFalhou(true)}
      className="h-36 w-full object-cover bg-gray-100"
    />
  );
}

// ---------- página ----------

const Premios: React.FC = () => {
  const { user } = useAuth();
  const usuarioId = user?.id;
  const empresaId = user?.empresaId || null;

  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const [config, setConfig] = useState<PremiosConfig | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [premios, setPremios] = useState<Premio[]>([]);
  const [resgates, setResgates] = useState<Resgate[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [temMaisMovimentos, setTemMaisMovimentos] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [desempenho, setDesempenho] = useState<DesempenhoMes | null>(null);
  const [emAndamento, setEmAndamento] = useState<string | null>(null);
  const [comoFuncionaAberto, setComoFuncionaAberto] = useState(false);

  const moeda = resumo?.nome_moeda || config?.nome_moeda || MOEDA_PADRAO;

  const carregarResumo = useCallback(async () => {
    const { data, error } = await supabase.rpc('lhamas_resumo');
    if (error) throw error;
    setResumo(normalizarResumo(data));
  }, []);

  const carregarResgates = useCallback(async () => {
    if (!usuarioId) return;
    const { data, error } = await supabase
      .from('resgates')
      .select('id, premio_nome, custo, status, solicitado_em, prazo_entrega, entregue_em, motivo_cancelamento')
      .eq('usuario_id', usuarioId)
      .order('solicitado_em', { ascending: false })
      .limit(50);
    if (error) throw error;
    setResgates((data as Resgate[]) || []);
  }, [usuarioId]);

  /** Busca uma página do extrato; pede 1 a mais para saber se há "ver mais". */
  const buscarMovimentos = useCallback(
    async (inicio: number) => {
      if (!usuarioId) return [] as Movimento[];
      const { data, error } = await supabase
        .from('lhamas_movimentos')
        .select('id, tipo, quantidade, descricao, criado_em')
        .eq('usuario_id', usuarioId)
        .order('criado_em', { ascending: false })
        .range(inicio, inicio + POR_PAGINA);
      if (error) throw error;
      return (data as Movimento[]) || [];
    },
    [usuarioId]
  );

  const carregarMovimentos = useCallback(async () => {
    const lista = await buscarMovimentos(0);
    setTemMaisMovimentos(lista.length > POR_PAGINA);
    setMovimentos(lista.slice(0, POR_PAGINA));
  }, [buscarMovimentos]);

  const carregarTudo = useCallback(async () => {
    if (!usuarioId || !empresaId) return;
    setCarregando(true);
    setErroCarga(false);
    const { ano, mes } = mesAtualSP();
    try {
      const [cfg, premiosRes, desempenhoRes] = await Promise.all([
        supabase.rpc('premios_config'),
        supabase
          .from('premios')
          .select('id, nome, descricao, foto_url, custo')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('ordem', { ascending: true, nullsFirst: false })
          .order('custo', { ascending: true }),
        supabase
          .from('performance_mensal')
          .select('faixa, selo_100, indice_medio')
          .eq('usuario_id', usuarioId)
          .eq('ano', ano)
          .eq('mes', mes)
          .maybeSingle(),
        carregarResumo(),
        carregarResgates(),
        carregarMovimentos(),
      ]);
      if (cfg.error) throw cfg.error;
      if (premiosRes.error) throw premiosRes.error;
      setConfig(normalizarConfig(cfg.data));
      setPremios(((premiosRes.data as Premio[]) || []).map((p) => ({ ...p, custo: num(p.custo) })));
      if (desempenhoRes.error) {
        // sem o desempenho do mês a página ainda funciona
        console.error('Erro ao carregar desempenho do mês:', desempenhoRes.error);
        setDesempenho(null);
      } else {
        setDesempenho((desempenhoRes.data as DesempenhoMes) || null);
      }
    } catch (error: any) {
      console.error('Erro ao carregar prêmios:', error);
      setErroCarga(true);
      notificar(mensagemErro(error, 'Erro ao carregar seus prêmios'), 'erro');
    } finally {
      setCarregando(false);
    }
  }, [usuarioId, empresaId, carregarResumo, carregarResgates, carregarMovimentos]);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  /** Depois de uma troca ou cancelamento: saldo, trocas e extrato. */
  const recarregarSaldo = async () => {
    try {
      await Promise.all([carregarResumo(), carregarResgates(), carregarMovimentos()]);
    } catch (error: any) {
      console.error('Erro ao atualizar saldo:', error);
      notificar(mensagemErro(error, 'Erro ao atualizar o saldo'), 'erro');
    }
  };

  const verMaisMovimentos = async () => {
    setCarregandoMais(true);
    try {
      const lista = await buscarMovimentos(movimentos.length);
      setTemMaisMovimentos(lista.length > POR_PAGINA);
      setMovimentos((atual) => [...atual, ...lista.slice(0, POR_PAGINA)]);
    } catch (error: any) {
      console.error('Erro ao carregar extrato:', error);
      notificar(mensagemErro(error, 'Erro ao carregar o extrato'), 'erro');
    } finally {
      setCarregandoMais(false);
    }
  };

  const trocar = async (premio: Premio) => {
    const prazo = config?.prazo_entrega_dias || 0;
    const ok = await confirmar(
      `Trocar ${fmtQtd(premio.custo)} ${moeda} por "${premio.nome}"? ` +
        `A gestão recebe o seu pedido e entrega${prazo > 0 ? ` em até ${prazo} ${prazo === 1 ? 'dia' : 'dias'}` : ''}.`,
      { perigoso: false, textoConfirmar: 'Sim, trocar' }
    );
    if (!ok) return;
    setEmAndamento(premio.id);
    try {
      const { error } = await supabase.rpc('solicitar_troca', { p_premio: premio.id });
      if (error) throw error;
      notificar(`Pedido enviado com sucesso! Acompanhe em "Minhas trocas".`, 'sucesso');
    } catch (error: any) {
      console.error('Erro ao solicitar troca:', error);
      notificar(mensagemErro(error, 'Não foi possível fazer a troca'), 'erro');
    } finally {
      await recarregarSaldo();
      setEmAndamento(null);
    }
  };

  const cancelar = async (resgate: Resgate) => {
    const ok = await confirmar(
      `Cancelar o pedido de "${resgate.premio_nome}"? As ${fmtQtd(resgate.custo)} ${moeda} voltam para o seu saldo.`,
      { perigoso: true, textoConfirmar: 'Sim, cancelar pedido' }
    );
    if (!ok) return;
    setEmAndamento(resgate.id);
    try {
      const { error } = await supabase.rpc('cancelar_troca', {
        p_resgate: resgate.id,
        p_motivo: 'Cancelado pelo colaborador',
      });
      if (error) throw error;
      notificar(`Pedido cancelado. As ${moeda} voltaram para o seu saldo.`, 'sucesso');
    } catch (error: any) {
      console.error('Erro ao cancelar troca:', error);
      notificar(mensagemErro(error, 'Não foi possível cancelar o pedido'), 'erro');
    } finally {
      await recarregarSaldo();
      setEmAndamento(null);
    }
  };

  // ---------- estados de tela ----------

  if (!user) return <LoadingState texto="Carregando..." />;

  if (!empresaId) {
    return (
      <div className="space-y-6">
        <PageHeader titulo="Prêmios" />
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <EmptyState
            icon={Gift}
            titulo="Disponível para quem é de uma empresa"
            descricao="O saldo e as trocas de prêmios aparecem para os colaboradores de cada empresa."
          />
        </div>
      </div>
    );
  }

  if (carregando && !resumo) return <LoadingState texto="Carregando seus prêmios..." />;

  if (erroCarga && !resumo) {
    return (
      <div className="space-y-6">
        <PageHeader titulo="Prêmios" />
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <EmptyState
            icon={AlertTriangle}
            titulo="Não foi possível carregar seus prêmios"
            descricao="Verifique a internet e tente de novo."
            acao={
              <button
                onClick={carregarTudo}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar de novo
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const saldo = resumo?.saldo ?? 0;
  const validade = resumo?.validade_meses || config?.validade_meses || 0;
  const perdaPct = resumo?.perda_mensal_pct ?? config?.perda_mensal_pct ?? 0;
  const prazoEntrega = config?.prazo_entrega_dias || 0;
  const textoMeses = (n: number) => `${n} ${n === 1 ? 'mês' : 'meses'}`;
  const textoDias = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

  // ---------- este mês ----------
  const { ano, mes } = mesAtualSP();
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const faixa: Faixa | null = faixaValida(desempenho?.faixa);
  const creditoPorFaixa: Record<Faixa, number> = {
    ouro: config?.credito_ouro ?? 0,
    prata: config?.credito_prata ?? 0,
    bronze: config?.credito_bronze ?? 0,
  };
  const creditoSelo = config?.credito_selo ?? 0;
  const temSelo = !!desempenho?.selo_100 && creditoSelo > 0;
  const previsaoMes = (faixa ? creditoPorFaixa[faixa] : 0) + (temSelo ? creditoSelo : 0);
  const gestorForaDoPrograma = user.profile === 'gestor' && config?.gestores_participam === false;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Prêmios"
        subtitulo={`Junte ${moeda} com o seu desempenho e troque por prêmios`}
        acoes={
          <button
            onClick={carregarTudo}
            disabled={carregando}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        }
      />

      {/* 1. Saldo */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-md p-5 sm:p-6">
        <p className="text-sm font-medium text-purple-100">Seu saldo</p>
        <p className="mt-1 flex items-baseline gap-2 flex-wrap">
          <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">{fmtQtd(saldo)}</span>
          <span className="text-xl font-semibold text-purple-50">{moeda}</span>
        </p>
        {(resumo?.reservado ?? 0) > 0 && (
          <p className="mt-2 text-sm text-purple-100">
            {fmtQtd(resumo!.reservado)} {moeda} em trocas aguardando entrega.
          </p>
        )}

        {(resumo?.vencido ?? 0) > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-white/95 text-amber-900 p-3 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
            <p>
              <strong>
                {fmtQtd(resumo!.vencido)} {moeda}
              </strong>{' '}
              passaram de {textoMeses(validade)} e perdem {fmtNum(perdaPct)}% por mês — troque logo.
            </p>
          </div>
        )}

        {resumo?.proximo_vencimento && resumo.proximo_vencimento_qtd > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-purple-100">
            <Hourglass className="w-3.5 h-3.5 flex-shrink-0" />
            {fmtQtd(resumo.proximo_vencimento_qtd)} {moeda} completam {textoMeses(validade)} em{' '}
            {fmtDataISO(resumo.proximo_vencimento)}.
          </p>
        )}
      </div>

      {/* 2. Este mês */}
      <Secao icone={Sparkles} titulo={`Este mês (${MESES[mes - 1]} de ${ano})`}>
        {gestorForaDoPrograma ? (
          <p className="text-sm text-gray-600">
            Nesta empresa a gestão não acumula {moeda} pelo desempenho do mês. O catálogo e as suas trocas continuam abaixo.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <FaixaBadge faixa={faixa} />
              {desempenho?.selo_100 && <SeloBadge />}
              {desempenho?.indice_medio !== null && desempenho?.indice_medio !== undefined && (
                <span className="text-sm text-gray-600">
                  Índice médio até agora: <strong className="text-gray-800">{fmtNum(desempenho.indice_medio)}</strong>
                </span>
              )}
            </div>

            {faixa ? (
              <p className="text-sm text-gray-800">
                Se o mês acabasse hoje, você ganharia{' '}
                <strong className="text-purple-700">
                  {fmtQtd(previsaoMes)} {moeda}
                </strong>
                {temSelo ? ` (${fmtQtd(creditoPorFaixa[faixa])} da faixa ${ESTILO_FAIXA[faixa].rotulo} + ${fmtQtd(creditoSelo)} do Selo 100%)` : ''}.
              </p>
            ) : (
              <p className="text-sm text-gray-800">
                {desempenho?.indice_medio !== null && desempenho?.indice_medio !== undefined
                  ? 'Você ainda não chegou a uma faixa neste mês. '
                  : 'Ainda não há desempenho calculado neste mês. '}
                Chegue a <strong>70</strong> de índice médio para ganhar{' '}
                <strong className="text-purple-700">
                  {fmtQtd(creditoPorFaixa.bronze)} {moeda}
                </strong>{' '}
                — e quanto mais alto, mais você ganha!
              </p>
            )}

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(['ouro', 'prata', 'bronze'] as Faixa[]).map((f) => (
                <div
                  key={f}
                  className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 ${
                    faixa === f ? 'border-purple-300 bg-purple-50' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FaixaBadge faixa={f} compacto />
                    <span className="text-xs text-gray-500">{ESTILO_FAIXA[f].regra}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                    {fmtQtd(creditoPorFaixa[f])} {moeda}
                  </span>
                </div>
              ))}
            </div>
            {creditoSelo > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                Selo 100% Performaxis: mais {fmtQtd(creditoSelo)} {moeda}.
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              O crédito do mês entra no dia 1º de {MESES[proximoMes - 1]}, pela faixa em que você fechar {MESES[mes - 1]}.
            </p>
          </>
        )}
      </Secao>

      {/* 3. Catálogo */}
      <Secao icone={Gift} titulo="Catálogo de prêmios">
        {premios.length === 0 ? (
          <EmptyState
            icon={Package}
            titulo="A gestão ainda não cadastrou prêmios"
            descricao={`Continue juntando ${moeda}: assim que houver prêmios, eles aparecem aqui.`}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {premios.map((p) => {
              const podeTrocar = saldo >= p.custo;
              const faltam = Math.max(0, p.custo - saldo);
              const progresso = p.custo > 0 ? Math.min(100, Math.round((saldo / p.custo) * 100)) : 100;
              const ocupado = emAndamento === p.id;
              return (
                <div key={p.id} className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <FotoPremio url={p.foto_url} nome={p.nome} />
                  <div className="flex flex-1 flex-col p-3">
                    <h3 className="font-semibold text-gray-800 break-words">{p.nome}</h3>
                    {p.descricao && <p className="mt-1 text-sm text-gray-600 break-words">{p.descricao}</p>}
                    <p className="mt-2 text-lg font-bold text-purple-700">
                      {fmtQtd(p.custo)} <span className="text-sm font-semibold">{moeda}</span>
                    </p>
                    <div className="mt-auto pt-3">
                      {podeTrocar ? (
                        <button
                          onClick={() => trocar(p)}
                          disabled={emAndamento !== null}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                        >
                          {ocupado ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          ) : (
                            <Gift className="w-4 h-4" />
                          )}
                          Trocar
                        </button>
                      ) : (
                        <div>
                          <div
                            className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={progresso}
                            aria-label={`Progresso para ${p.nome}`}
                          >
                            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${progresso}%` }} />
                          </div>
                          <p className="mt-1.5 text-xs text-gray-600">
                            Faltam <strong className="text-gray-800">{fmtQtd(faltam)} {moeda}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Secao>

      {/* 4. Minhas trocas */}
      <Secao icone={Award} titulo="Minhas trocas">
        {resgates.length === 0 ? (
          <p className="text-sm text-gray-500">Você ainda não fez nenhuma troca.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {resgates.map((r) => (
              <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 break-words">{r.premio_nome}</p>
                    <p className="text-xs text-gray-500">
                      {fmtQtd(num(r.custo))} {moeda} · pedido em {fmtDataHora(r.solicitado_em)}
                    </p>
                    {r.status === 'cancelado' && r.motivo_cancelamento && (
                      <p className="mt-1 text-xs text-gray-600">Motivo: {r.motivo_cancelamento}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <StatusResgateBadge resgate={r} />
                    {r.status === 'solicitado' && (
                      <button
                        onClick={() => cancelar(r)}
                        disabled={emAndamento !== null}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {emAndamento === r.id ? (
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-red-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        Cancelar pedido
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      {/* 5. Extrato */}
      <Secao icone={History} titulo="Extrato">
        {movimentos.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma movimentação ainda.</p>
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {movimentos.map((m) => {
                const qtd = num(m.quantidade);
                const perda = m.tipo === 'perda_validade' || m.tipo === 'perda_desligamento';
                const cor = qtd > 0 ? 'text-emerald-700' : perda ? 'text-gray-500' : qtd < 0 ? 'text-red-600' : 'text-gray-500';
                const sinal = qtd > 0 ? '+' : qtd < 0 ? '−' : '';
                return (
                  <li key={m.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{ROTULO_MOVIMENTO[m.tipo] || 'Movimentação'}</p>
                      <p className="text-xs text-gray-500 break-words">
                        {fmtDataHora(m.criado_em)}
                        {m.descricao ? ` · ${m.descricao}` : ''}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold whitespace-nowrap ${cor}`}>
                      {sinal}
                      {fmtQtd(Math.abs(qtd))} {moeda}
                    </span>
                  </li>
                );
              })}
            </ul>
            {temMaisMovimentos && (
              <button
                onClick={verMaisMovimentos}
                disabled={carregandoMais}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {carregandoMais && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />}
                Ver mais
              </button>
            )}
          </>
        )}
      </Secao>

      {/* 6. Como funciona */}
      <section className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
        <button
          onClick={() => setComoFuncionaAberto((v) => !v)}
          aria-expanded={comoFuncionaAberto}
          className="flex w-full items-center justify-between gap-3 p-4 sm:px-5 text-left"
        >
          <span className="flex items-center gap-2 font-semibold text-purple-900">
            <Info className="w-5 h-5 text-purple-600" />
            Como funciona
          </span>
          <ChevronDown className={`w-5 h-5 text-purple-600 transition-transform ${comoFuncionaAberto ? 'rotate-180' : ''}`} />
        </button>
        {comoFuncionaAberto && (
          <ul className="px-4 pb-4 sm:px-5 text-sm text-purple-800 space-y-1.5 list-disc pl-9 sm:pl-10">
            <li>
              Todo mês você ganha {moeda} pela faixa da meritocracia: Ouro {fmtQtd(creditoPorFaixa.ouro)}, Prata{' '}
              {fmtQtd(creditoPorFaixa.prata)} e Bronze {fmtQtd(creditoPorFaixa.bronze)}
              {creditoSelo > 0 ? `, mais ${fmtQtd(creditoSelo)} com o Selo 100% Performaxis` : ''}. O crédito entra no dia 1º do mês seguinte.
            </li>
            {validade > 0 && (
              <li>
                Suas {moeda} valem por {textoMeses(validade)}.
                {perdaPct > 0 ? ` Depois disso, perdem ${fmtNum(perdaPct)}% por mês até serem trocadas.` : ''}
              </li>
            )}
            <li>
              Escolha um prêmio do catálogo e toque em <strong>Trocar</strong>. A gestão recebe o pedido e entrega
              {prazoEntrega > 0 ? ` em até ${textoDias(prazoEntrega)}` : ''}.
            </li>
            <li>Enquanto o pedido estiver aguardando entrega, você pode cancelar e as {moeda} voltam para o seu saldo.</li>
          </ul>
        )}
      </section>
    </div>
  );
};

export default Premios;
