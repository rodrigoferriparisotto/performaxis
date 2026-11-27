import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Gauge,
  Package,
  RefreshCw,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { confirmar, notificar } from '../../lib/feedback';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState, LoadingState } from '../ui/Estados';
import { ESTILO_FAIXA, Faixa, FaixaBadge, SeloBadge, estiloFaixa, fmtNum } from '../Dashboard/meritocracia';
import { formatarData, getBrazilDate, getDataAtual } from '../../utils/dateUtils';

// Painel do grupo: visão consolidada dos hotéis (empresas) de um grupo para a
// gestão corporativa — governança do dia, manutenção, equipe, achados e
// perdidos e meritocracia do mês, mais o ranking único do grupo.

interface Grupo {
  grupo_id: string;
  nome: string;
  hoteis: number | unknown[] | null;
}

interface HotelPainel {
  empresa_id: string;
  hotel: string;
  suites: number;
  gov_total: number;
  gov_limpas: number;
  gov_em_limpeza: number;
  gov_por_fazer: number;
  quartos_liberados: number;
  manut_abertas: number;
  manut_vencidas: number;
  equipe_ativa: number;
  usaram_hoje: number;
  indice_mes: number | null;
  ouro: number;
  prata: number;
  bronze: number;
  sem_faixa: number;
  objetos_guardados: number;
}

interface LinhaRanking {
  usuario_id: string;
  nome: string;
  perfil: string;
  hotel: string;
  indice_medio: number | null;
  faixa: string | null;
  selo_100: boolean;
  dias: number;
  dias_sem_uso: number;
  posicao: number;
}

interface MinhaEmpresa {
  empresa_id: string;
  nome: string;
  grupo_id: string | null;
  grupo_nome: string | null;
  ativa: boolean;
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const ROTULO_PERFIL: Record<string, string> = {
  admin: 'Administração',
  gestor: 'Gestão',
  recepcao: 'Recepção',
  camararia: 'Governança',
  revisao: 'Revisão',
  areas_comuns: 'Áreas Comuns',
  manutencao: 'Manutenção',
  cozinha: 'Cozinha',
  vendas: 'Vendas',
  atividades_diarias: 'Atividades Diárias',
  atividades_extras: 'Atividades Extras',
};

const rotuloPerfil = (perfil: string | null | undefined) => (perfil ? ROTULO_PERFIL[perfil] ?? perfil : '—');

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

/** numeric do Postgres pode chegar como texto; nulo/inválido vira 0. */
const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/** índice pode ser nulo (sem dados no mês). */
const indiceOuNulo = (v: unknown): number | null =>
  v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);

/** Faixa correspondente a um índice (para colorir o número). */
const faixaDoIndice = (indice: number | null): Faixa | null => {
  if (indice === null) return null;
  if (indice >= 90) return 'ouro';
  if (indice >= 80) return 'prata';
  if (indice >= 70) return 'bronze';
  return null;
};

const qtdHoteis = (h: Grupo['hoteis']): number | null => {
  if (Array.isArray(h)) return h.length;
  if (h === null || h === undefined || !Number.isFinite(Number(h))) return null;
  return Number(h);
};

const mensagemErro = (e: unknown) => (e as { message?: string } | null)?.message || 'tente novamente.';

const CLASSE_CAMPO =
  'px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';

/** Quadro pequeno de número (mesmo visual do resumo de suítes do dia). */
function Quadro({
  rotulo,
  valor,
  detalhe,
  cor = 'border-gray-200 bg-white text-gray-800',
  detalheCor,
}: {
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: React.ReactNode;
  cor?: string;
  detalheCor?: string;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${cor}`}>
      <p className="text-xs opacity-80">{rotulo}</p>
      <p className="text-2xl font-bold leading-tight">{valor}</p>
      {detalhe && <p className={`text-[11px] ${detalheCor ?? 'opacity-75'}`}>{detalhe}</p>}
    </div>
  );
}

/** Contagem de pessoas por faixa, nas cores dos selos de faixa. */
function ContagemFaixas({ h }: { h: HotelPainel }) {
  const itens: { chave: Faixa | 'nenhuma'; qtd: number }[] = [
    { chave: 'ouro', qtd: n(h.ouro) },
    { chave: 'prata', qtd: n(h.prata) },
    { chave: 'bronze', qtd: n(h.bronze) },
    { chave: 'nenhuma', qtd: n(h.sem_faixa) },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {itens.map((i) => (
        <span
          key={i.chave}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
            ESTILO_FAIXA[i.chave].badge
          } ${i.qtd === 0 ? 'opacity-50' : ''}`}
          title={ESTILO_FAIXA[i.chave].regra}
        >
          {ESTILO_FAIXA[i.chave].rotulo}
          <span className="tabular-nums">{i.qtd}</span>
        </span>
      ))}
    </div>
  );
}

function CartaoHotel({
  h,
  ativo,
  podeAbrir,
  abrindo,
  mesRotulo,
  onAbrir,
}: {
  h: HotelPainel;
  ativo: boolean;
  podeAbrir: boolean;
  abrindo: boolean;
  mesRotulo: string;
  onAbrir: () => void;
}) {
  const total = n(h.gov_total);
  const limpas = n(h.gov_limpas);
  const pct = total > 0 ? Math.min(100, Math.round((limpas / total) * 100)) : 0;
  const vencidas = n(h.manut_vencidas);
  const indice = indiceOuNulo(h.indice_mes);
  const corIndice = estiloFaixa(faixaDoIndice(indice)).numero;

  return (
    <div
      className={`bg-white rounded-lg border shadow-sm p-4 flex flex-col gap-4 ${
        ativo ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <h3 className="font-semibold text-gray-800 truncate" title={h.hotel}>
            {h.hotel}
          </h3>
        </div>
        {ativo && (
          <span className="flex-shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
            Hotel ativo
          </span>
        )}
      </div>

      {/* Governança do dia */}
      <div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="flex items-center gap-1.5 font-medium text-gray-700">
            <BedDouble className="w-4 h-4 text-gray-500" />
            Governança
          </span>
          <span className="text-gray-600 tabular-nums">
            {total > 0 ? `${limpas} de ${total} limpas` : 'Sem suítes no dia'}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
          <span>{n(h.gov_em_limpeza)} em limpeza</span>
          <span>{n(h.gov_por_fazer)} por fazer</span>
          <span className="text-emerald-700">{n(h.quartos_liberados)} {plural(n(h.quartos_liberados), 'liberado', 'liberados')}</span>
          <span className="text-gray-400">{n(h.suites)} {plural(n(h.suites), 'suíte', 'suítes')} no hotel</span>
        </div>
      </div>

      {/* Manutenção, equipe e achados */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-gray-50 px-2 py-2">
          <Wrench className="w-4 h-4 text-gray-500 mx-auto" />
          <p className="text-lg font-bold text-gray-800 leading-tight tabular-nums">{n(h.manut_abertas)}</p>
          <p className="text-[11px] text-gray-500 leading-tight">{plural(n(h.manut_abertas), 'manutenção aberta', 'manutenções abertas')}</p>
          {vencidas > 0 && (
            <p className="mt-0.5 text-[11px] font-semibold text-red-600">
              {vencidas} {plural(vencidas, 'atrasada', 'atrasadas')}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-gray-50 px-2 py-2">
          <Users className="w-4 h-4 text-gray-500 mx-auto" />
          <p className="text-lg font-bold text-gray-800 leading-tight tabular-nums">
            {n(h.usaram_hoje)}
            <span className="text-sm font-medium text-gray-400">/{n(h.equipe_ativa)}</span>
          </p>
          <p className="text-[11px] text-gray-500 leading-tight">usaram no dia</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-2 py-2">
          <Package className="w-4 h-4 text-gray-500 mx-auto" />
          <p className="text-lg font-bold text-gray-800 leading-tight tabular-nums">{n(h.objetos_guardados)}</p>
          <p className="text-[11px] text-gray-500 leading-tight">{plural(n(h.objetos_guardados), 'objeto guardado', 'objetos guardados')}</p>
        </div>
      </div>

      {/* Meritocracia do mês */}
      <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-purple-900">
            <Gauge className="w-4 h-4 text-purple-600" />
            Meritocracia de {mesRotulo}
          </span>
          <span className={`text-xl font-bold tabular-nums ${indice === null ? 'text-gray-400' : corIndice}`} title="Índice médio do mês">
            {fmtNum(indice)}
          </span>
        </div>
        <ContagemFaixas h={h} />
      </div>

      {podeAbrir && !ativo && (
        <button
          onClick={onAbrir}
          disabled={abrindo}
          className="mt-auto flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
        >
          {abrindo ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
          Abrir este hotel
        </button>
      )}
    </div>
  );
}

function PosicaoBadge({ posicao }: { posicao: number }) {
  const cor =
    posicao === 1
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : posicao === 2
      ? 'bg-slate-100 text-slate-700 border-slate-300'
      : posicao === 3
      ? 'bg-orange-100 text-orange-800 border-orange-300'
      : 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center justify-center min-w-[2rem] h-8 rounded-full border px-1 text-sm font-bold tabular-nums ${cor}`}>
      {posicao}º
    </span>
  );
}

const PainelGrupo: React.FC = () => {
  const { user } = useAuth();

  const hoje = getBrazilDate();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [erroGrupos, setErroGrupos] = useState(false);
  const [grupoId, setGrupoId] = useState('');
  const [minhasEmpresas, setMinhasEmpresas] = useState<MinhaEmpresa[]>([]);

  const [data, setData] = useState<string>(getDataAtual());
  const [atualizar, setAtualizar] = useState(0);

  const [hoteis, setHoteis] = useState<HotelPainel[]>([]);
  const [carregandoPainel, setCarregandoPainel] = useState(false);
  const [erroPainel, setErroPainel] = useState(false);

  const [ano, setAno] = useState(anoAtual);
  const [mes, setMes] = useState(mesAtual);
  const [ranking, setRanking] = useState<LinhaRanking[]>([]);
  const [carregandoRanking, setCarregandoRanking] = useState(false);
  const [erroRanking, setErroRanking] = useState(false);

  const [abrindo, setAbrindo] = useState<string | null>(null);

  // ignora respostas que chegaram depois de uma troca de filtro
  const seqPainel = useRef(0);
  const seqRanking = useRef(0);

  const carregarGrupos = useCallback(async () => {
    setErroGrupos(false);
    const [g, e] = await Promise.all([supabase.rpc('meus_grupos'), supabase.rpc('minhas_empresas')]);
    if (g.error) {
      console.error('Erro ao carregar grupos:', g.error);
      notificar(`Erro ao carregar os grupos de hotéis: ${mensagemErro(g.error)}`, 'erro');
      setErroGrupos(true);
      setGrupos([]);
      return;
    }
    if (e.error) console.error('Erro ao carregar hotéis do usuário:', e.error);
    const lista = ((g.data as Grupo[]) || []).slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const empresas = (e.data as MinhaEmpresa[]) || [];
    setMinhasEmpresas(empresas);
    setGrupos(lista);
    setGrupoId((atual) => {
      if (atual && lista.some((x) => x.grupo_id === atual)) return atual;
      // começa pelo grupo do hotel ativo, se houver
      const doAtivo = empresas.find((x) => x.ativa)?.grupo_id;
      return (doAtivo && lista.find((x) => x.grupo_id === doAtivo)?.grupo_id) || lista[0]?.grupo_id || '';
    });
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    carregarGrupos();
  }, [userId, carregarGrupos]);

  // painel do dia
  useEffect(() => {
    if (!grupoId) return;
    const seq = ++seqPainel.current;
    setCarregandoPainel(true);
    setErroPainel(false);
    (async () => {
      const params: Record<string, string> = { p_grupo: grupoId };
      if (data) params.p_data = data;
      const { data: linhas, error } = await supabase.rpc('painel_grupo', params);
      if (seq !== seqPainel.current) return;
      if (error) {
        console.error('Erro ao carregar painel do grupo:', error);
        notificar(`Erro ao carregar o painel do grupo: ${mensagemErro(error)}`, 'erro');
        setErroPainel(true);
        setHoteis([]);
      } else {
        setHoteis((linhas as HotelPainel[]) || []);
      }
      setCarregandoPainel(false);
    })();
  }, [grupoId, data, atualizar]);

  // ranking do mês
  useEffect(() => {
    if (!grupoId) return;
    const seq = ++seqRanking.current;
    setCarregandoRanking(true);
    setErroRanking(false);
    (async () => {
      const { data: linhas, error } = await supabase.rpc('ranking_grupo', { p_grupo: grupoId, p_ano: ano, p_mes: mes });
      if (seq !== seqRanking.current) return;
      if (error) {
        console.error('Erro ao carregar ranking do grupo:', error);
        notificar(`Erro ao carregar o ranking do grupo: ${mensagemErro(error)}`, 'erro');
        setErroRanking(true);
        setRanking([]);
      } else {
        const lista = ((linhas as LinhaRanking[]) || []).slice().sort((a, b) => n(a.posicao) - n(b.posicao));
        setRanking(lista);
      }
      setCarregandoRanking(false);
    })();
  }, [grupoId, ano, mes, atualizar]);

  const empresasPorId = useMemo(() => {
    const m = new Map<string, MinhaEmpresa>();
    minhasEmpresas.forEach((e) => m.set(e.empresa_id, e));
    return m;
  }, [minhasEmpresas]);

  const total = useMemo(() => {
    const soma = (campo: keyof HotelPainel) => hoteis.reduce((acc, h) => acc + n(h[campo]), 0);
    return {
      gov_total: soma('gov_total'),
      gov_limpas: soma('gov_limpas'),
      gov_em_limpeza: soma('gov_em_limpeza'),
      gov_por_fazer: soma('gov_por_fazer'),
      quartos_liberados: soma('quartos_liberados'),
      manut_abertas: soma('manut_abertas'),
      manut_vencidas: soma('manut_vencidas'),
      equipe_ativa: soma('equipe_ativa'),
      usaram_hoje: soma('usaram_hoje'),
      objetos_guardados: soma('objetos_guardados'),
    };
  }, [hoteis]);

  const abrirHotel = async (h: HotelPainel) => {
    const ok = await confirmar(`Abrir o hotel "${h.hotel}"? O Performaxis inteiro passa a mostrar os dados deste hotel.`, {
      textoConfirmar: 'Abrir hotel',
    });
    if (!ok) return;
    setAbrindo(h.empresa_id);
    const { error } = await supabase.rpc('trocar_empresa_ativa', { p_empresa: h.empresa_id });
    if (error) {
      console.error('Erro ao trocar de hotel:', error);
      notificar(`Erro ao abrir o hotel: ${mensagemErro(error)}`, 'erro');
      setAbrindo(null);
      return;
    }
    window.location.hash = 'dashboard';
    window.location.reload();
  };

  const anos = useMemo(() => {
    const lista = [anoAtual, anoAtual - 1, anoAtual - 2];
    if (!lista.includes(ano)) lista.push(ano);
    return lista.sort((a, b) => b - a);
  }, [anoAtual, ano]);

  const ehHoje = data === getDataAtual();
  const grupoAtual = grupos?.find((g) => g.grupo_id === grupoId);
  const nHoteis = grupoAtual ? qtdHoteis(grupoAtual.hoteis) ?? hoteis.length : hoteis.length;
  const mesRotuloPainel = (() => {
    const [a, m] = (data || getDataAtual()).split('-').map(Number);
    return a === anoAtual ? MESES[m - 1] : `${MESES[m - 1]}/${a}`;
  })();

  // ---------- estados da página ----------
  if (grupos === null) {
    return <LoadingState texto="Carregando grupos de hotéis..." />;
  }

  if (grupos.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader titulo="Painel do grupo" />
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {erroGrupos ? (
            <EmptyState
              icon={AlertTriangle}
              titulo="Não foi possível carregar os grupos"
              descricao="Verifique a conexão e tente de novo."
              acao={
                <button
                  onClick={() => {
                    setGrupos(null);
                    carregarGrupos();
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Tentar de novo
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={Building2}
              titulo="Você não faz parte de nenhum grupo de hotéis"
              descricao="Quando a sua empresa estiver em um grupo, a visão consolidada dos hotéis aparece aqui."
            />
          )}
        </div>
      </div>
    );
  }

  const subtitulo = [
    grupoAtual?.nome,
    nHoteis ? `${nHoteis} ${plural(nHoteis, 'hotel', 'hotéis')}` : null,
    ehHoje ? `hoje, ${formatarData(data)}` : formatarData(data),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Painel do grupo"
        subtitulo={subtitulo}
        acoes={
          <>
            {grupos.length > 1 && (
              <select
                value={grupoId}
                onChange={(e) => setGrupoId(e.target.value)}
                aria-label="Grupo de hotéis"
                className={`w-full sm:w-auto ${CLASSE_CAMPO}`}
              >
                {grupos.map((g) => (
                  <option key={g.grupo_id} value={g.grupo_id}>
                    {g.nome}
                  </option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-2 flex-1 sm:flex-none">
              <CalendarDays className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <input
                type="date"
                lang="pt-BR"
                value={data}
                onChange={(e) => e.target.value && setData(e.target.value)}
                aria-label="Data do painel"
                className={`flex-1 sm:flex-none ${CLASSE_CAMPO}`}
              />
            </label>
            {!ehHoje && (
              <button
                onClick={() => setData(getDataAtual())}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Hoje
              </button>
            )}
            <button
              onClick={() => setAtualizar((x) => x + 1)}
              disabled={carregandoPainel || carregandoRanking}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              aria-label="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${carregandoPainel || carregandoRanking ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </>
        }
      />

      {/* 1. Total do grupo */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Total do grupo</h2>
        {carregandoPainel && hoteis.length === 0 ? (
          <LoadingState compacto texto="Carregando o painel..." />
        ) : erroPainel ? (
          <div className="bg-white rounded-lg border border-gray-200">
            <EmptyState
              icon={AlertTriangle}
              titulo="Não foi possível carregar o painel"
              acao={
                <button
                  onClick={() => setAtualizar((x) => x + 1)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Tentar de novo
                </button>
              }
            />
          </div>
        ) : (
          <div className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 ${carregandoPainel ? 'opacity-60' : ''}`}>
            <Quadro rotulo="Suítes do dia" valor={total.gov_total} />
            <Quadro
              rotulo="Limpas"
              valor={total.gov_limpas}
              detalhe={total.gov_total ? `de ${total.gov_total}` : undefined}
              cor="border-blue-200 bg-blue-50 text-blue-800"
            />
            <Quadro rotulo="Em limpeza" valor={total.gov_em_limpeza} cor="border-sky-200 bg-sky-50 text-sky-800" />
            <Quadro rotulo="Por fazer" valor={total.gov_por_fazer} cor="border-amber-200 bg-amber-50 text-amber-800" />
            <Quadro rotulo="Quartos liberados" valor={total.quartos_liberados} cor="border-emerald-200 bg-emerald-50 text-emerald-800" />
            <Quadro
              rotulo="Manutenções abertas"
              valor={total.manut_abertas}
              detalhe={
                total.manut_vencidas > 0
                  ? `${total.manut_vencidas} ${plural(total.manut_vencidas, 'atrasada', 'atrasadas')}`
                  : 'nenhuma atrasada'
              }
              detalheCor={total.manut_vencidas > 0 ? 'font-semibold text-red-600' : undefined}
            />
            <Quadro
              rotulo="Equipe que usou"
              valor={
                <>
                  {total.usaram_hoje}
                  <span className="text-base font-medium opacity-60">/{total.equipe_ativa}</span>
                </>
              }
              detalhe={total.equipe_ativa ? `${Math.round((total.usaram_hoje / total.equipe_ativa) * 100)}% da equipe ativa` : undefined}
              cor="border-purple-200 bg-purple-50 text-purple-800"
            />
            <Quadro rotulo="Objetos guardados" valor={total.objetos_guardados} detalhe="achados e perdidos" />
          </div>
        )}
      </section>

      {/* 2. Hotéis */}
      {!erroPainel && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Hotéis</h2>
          {carregandoPainel && hoteis.length === 0 ? null : hoteis.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200">
              <EmptyState icon={Building2} titulo="Nenhum hotel neste grupo" />
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ${carregandoPainel ? 'opacity-60' : ''}`}>
              {hoteis.map((h) => {
                const minha = empresasPorId.get(h.empresa_id);
                return (
                  <CartaoHotel
                    key={h.empresa_id}
                    h={h}
                    ativo={!!minha?.ativa}
                    podeAbrir={!!minha}
                    abrindo={abrindo === h.empresa_id}
                    mesRotulo={mesRotuloPainel}
                    onAbrir={() => abrirHotel(h)}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 3. Ranking do grupo */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
            Ranking do grupo — {MESES[mes - 1]}/{ano}
          </h2>
          <div className="flex gap-2">
            <select
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value))}
              aria-label="Mês do ranking"
              className={`flex-1 sm:flex-none capitalize ${CLASSE_CAMPO}`}
            >
              {MESES.map((nome, i) => (
                <option key={nome} value={i + 1} className="capitalize">
                  {nome.charAt(0).toUpperCase() + nome.slice(1)}
                </option>
              ))}
            </select>
            <select value={ano} onChange={(e) => setAno(parseInt(e.target.value))} aria-label="Ano do ranking" className={CLASSE_CAMPO}>
              {anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {carregandoRanking && ranking.length === 0 ? (
          <LoadingState compacto texto="Carregando o ranking..." />
        ) : erroRanking ? (
          <EmptyState
            icon={AlertTriangle}
            titulo="Não foi possível carregar o ranking"
            acao={
              <button
                onClick={() => setAtualizar((x) => x + 1)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Tentar de novo
              </button>
            }
          />
        ) : ranking.length === 0 ? (
          <EmptyState
            icon={Trophy}
            titulo="Sem ranking neste mês"
            descricao={`Ninguém do grupo tem índice calculado em ${MESES[mes - 1]} de ${ano}.`}
          />
        ) : (
          <div className={carregandoRanking ? 'opacity-60' : ''}>
            {/* celular: cartões */}
            <ul className="sm:hidden divide-y divide-gray-100">
              {ranking.map((r) => {
                const indice = indiceOuNulo(r.indice_medio);
                return (
                  <li key={`${r.usuario_id}-${r.hotel}`} className="flex items-start gap-3 px-4 py-3">
                    <PosicaoBadge posicao={n(r.posicao)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{r.nome}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {r.hotel} · {rotuloPerfil(r.perfil)}
                          </p>
                        </div>
                        <span className={`text-xl font-bold tabular-nums ${indice === null ? 'text-gray-400' : estiloFaixa(r.faixa).numero}`}>
                          {fmtNum(indice)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <FaixaBadge faixa={r.faixa} compacto />
                        {r.selo_100 && <SeloBadge compacto />}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {n(r.dias)} {plural(n(r.dias), 'dia trabalhado', 'dias trabalhados')}
                        {n(r.dias_sem_uso) > 0 && (
                          <span className="text-red-600">
                            {' '}· {n(r.dias_sem_uso)} sem uso
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* tablet/desktop: tabela */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Posição</th>
                    <th className="px-4 py-2 text-left font-semibold">Nome</th>
                    <th className="px-4 py-2 text-left font-semibold">Hotel</th>
                    <th className="px-4 py-2 text-left font-semibold">Perfil</th>
                    <th className="px-4 py-2 text-right font-semibold">Índice médio</th>
                    <th className="px-4 py-2 text-left font-semibold">Faixa</th>
                    <th className="px-4 py-2 text-right font-semibold">Dias</th>
                    <th className="px-4 py-2 text-right font-semibold">Sem uso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ranking.map((r) => {
                    const indice = indiceOuNulo(r.indice_medio);
                    return (
                      <tr key={`${r.usuario_id}-${r.hotel}`} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <PosicaoBadge posicao={n(r.posicao)} />
                        </td>
                        <td className="px-4 py-2 font-medium text-gray-800">{r.nome}</td>
                        <td className="px-4 py-2 text-gray-600">{r.hotel}</td>
                        <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{rotuloPerfil(r.perfil)}</td>
                        <td
                          className={`px-4 py-2 text-right text-base font-bold tabular-nums ${
                            indice === null ? 'text-gray-400' : estiloFaixa(r.faixa).numero
                          }`}
                        >
                          {fmtNum(indice)}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <FaixaBadge faixa={r.faixa} compacto />
                            {r.selo_100 && <SeloBadge compacto />}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-700">{n(r.dias)}</td>
                        <td className={`px-4 py-2 text-right tabular-nums ${n(r.dias_sem_uso) > 0 ? 'font-semibold text-red-600' : 'text-gray-400'}`}>
                          {n(r.dias_sem_uso)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {hoteis.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-gray-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Índice médio e faixas do mês de {mesRotuloPainel} por hotel; o ranking acima segue o mês escolhido nele.
        </p>
      )}
    </div>
  );
};

export default PainelGrupo;
