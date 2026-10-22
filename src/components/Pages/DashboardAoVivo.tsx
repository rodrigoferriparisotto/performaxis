import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { notificar } from '../../lib/feedback';
import { DashboardService } from '../../services/dashboardService';
import { realtimeService } from '../../services/realtimeService';
import {
  Activity,
  Maximize,
  Search,
  Zap,
  RefreshCw
} from 'lucide-react';
import StatsHeader from '../Dashboard/StatsHeader';
import HistoricalComparison from '../Dashboard/HistoricalComparison';
import RankingPanel from '../Dashboard/RankingPanel';
import DepartmentCard from '../Dashboard/DepartmentCard';
import DetailModal from '../Dashboard/DetailModal';
import { Atividade, DepartmentData, UsuarioAtivo } from '../../types/dashboard';

// ---- Formato devolvido pela RPC dashboard_ao_vivo -------------------------

interface AtivoAoVivo {
  id: string;
  tabela: string;
  departamento: string;
  status: string;
  hora_inicio: string | null;
  atividades: Atividade[] | null;
  observacoes: string | null;
  suite_nome: string | null;
  local: string | null;
  tipo: string | null;
  prioridade: string | null;
  pausas: unknown[];
  usuario: { id: string; name: string; profile: string };
}

interface RankingAoVivo {
  usuario: { id: string; name: string; profile: string };
  totalConcluidos: number;
  tempoTotal: number;
  tempoMedio: number;
}

interface DadosAoVivo {
  empresa_id: string | null;
  hoje: string;
  ativos: AtivoAoVivo[];
  concluidos_hoje: Record<string, number>;
  historico: Record<string, number>;
  ranking: RankingAoVivo[];
}

const TABELAS_REALTIME = [
  'registros_recepcao',
  'registros_camararia',
  'registros_revisao',
  'registros_areas_comuns',
  'registros_gestao',
  'registros_cozinha',
  'registros_vendas',
  'registros_atividades_diarias',
  'registros_atividades_extras',
  'manutencoes'
];

// Eventos realtime recarregam no máximo 1 vez a cada 8 s (sempre com uma
// recarga final depois do último evento).
const INTERVALO_MIN_RECARGA_MS = 8000;
const DIAS_HISTORICO = 7;

const TIPOS_MANUTENCAO: { [key: string]: string } = {
  'correcao': 'Correção',
  'conserto': 'Conserto',
  'nova_instalacao': 'Nova Instalação',
  'preventiva': 'Preventiva',
  'substituicao': 'Substituição'
};

// O cálculo de tempo (com pausas de manutenção) espera o campo `table`.
const tempoDecorrido = (a: AtivoAoVivo) =>
  DashboardService.calcularTempoDecorridoComPausas({ ...a, table: a.tabela });

const montarDepartamentos = (ativos: AtivoAoVivo[]): DepartmentData[] => {
  const departamentosMap = new Map<string, DepartmentData>();

  ativos.forEach((registro) => {
    const dept = registro.departamento;
    if (!departamentosMap.has(dept)) {
      departamentosMap.set(dept, {
        id: dept,
        nome: DashboardService.getDepartamentoNome(dept),
        cor: DashboardService.getDepartamentoCor(dept),
        atividadesEmAndamento: 0,
        usuarios: [],
        progresso: 0,
        tempoMedio: 0
      });
    }

    const deptData = departamentosMap.get(dept)!;
    deptData.atividadesEmAndamento++;

    const isManutencao = registro.tabela === 'manutencoes';
    const atividades = registro.atividades || [];
    const progresso = isManutencao
      ? (registro.status === 'pausada' ? 50 : 75)
      : DashboardService.calcularProgresso(atividades);
    const sufixoPausa = isManutencao && registro.status === 'pausada' ? ' (Pausada)' : '';

    let descricaoAtividade: string;
    if (isManutencao) {
      const tipoLabel = registro.tipo ? TIPOS_MANUTENCAO[registro.tipo] || registro.tipo : 'Manutenção';
      descricaoAtividade = `${tipoLabel}: ${registro.local}${sufixoPausa}`;
    } else if (registro.suite_nome) {
      descricaoAtividade = `Suíte ${registro.suite_nome}`;
    } else if (registro.local) {
      descricaoAtividade = registro.local;
    } else {
      descricaoAtividade = DashboardService.getDepartamentoNome(dept);
    }

    const usuarioAtivo: UsuarioAtivo = {
      id: registro.usuario.id,
      nome: registro.usuario.name,
      progresso,
      totalAtividades: atividades.length,
      atividadesCompletas: atividades.filter((a) => a.status === 'realizada').length,
      tempoDecorrido: tempoDecorrido(registro),
      registroId: registro.id,
      horaInicio: registro.hora_inicio || '',
      departamento: dept,
      local: isManutencao
        ? `${registro.local}${sufixoPausa}`
        : (registro.suite_nome ? `Suíte ${registro.suite_nome}` : registro.local || DashboardService.getDepartamentoNome(dept)),
      observacoes: registro.observacoes || '',
      atividades,
      isManutencao,
      tipo: registro.tipo ?? undefined,
      prioridade: registro.prioridade ?? undefined,
      pausas: registro.pausas || [],
      descricaoAtividade
    };

    deptData.usuarios.push(usuarioAtivo);
  });

  departamentosMap.forEach((dept) => {
    dept.progresso = Math.round(
      dept.usuarios.reduce((acc, u) => acc + u.progresso, 0) / (dept.usuarios.length || 1)
    );
    dept.tempoMedio = Math.round(
      dept.usuarios.reduce((acc, u) => acc + u.tempoDecorrido, 0) / (dept.usuarios.length || 1)
    );
  });

  return Array.from(departamentosMap.values());
};

const textoDesdeAtualizacao = (ultima: Date) => {
  const diff = Math.floor((Date.now() - ultima.getTime()) / 1000);
  if (diff < 5) return 'agora';
  if (diff < 60) return `há ${diff}s`;
  const minutes = Math.floor(diff / 60);
  if (minutes === 1) return 'há 1 min';
  return `há ${minutes} min`;
};

// Isolado num componente próprio: o tique de 1 s re-renderiza só este texto,
// não a página nem os gráficos.
const IndicadorAtualizacao: React.FC<{
  ultimaAtualizacao: Date;
  eventosRef: React.MutableRefObject<number>;
  tvMode: boolean;
}> = ({ ultimaAtualizacao, eventosRef, tvMode }) => {
  const [, setTique] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTique((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const eventos = eventosRef.current;
  return (
    <span className={`text-xs sm:text-sm ${tvMode ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap hidden sm:inline`}>
      {eventos > 0 ? `${eventos} eventos` : `Atualizado ${textoDesdeAtualizacao(ultimaAtualizacao)}`}
    </span>
  );
};

const DashboardAoVivo: React.FC = () => {
  const { user } = useAuth();
  const empresaId = user?.empresaId ?? null;
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<DadosAoVivo | null>(null);
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioAtivo | null>(null);
  const [tvMode, setTvMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(() => new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('connecting');
  // tempos decorridos dos cards avançam de minuto em minuto, sem nova consulta
  const [minutoAtual, setMinutoAtual] = useState(() => Date.now());

  const eventosRef = useRef(0);
  const ultimaCargaRef = useRef(0);
  const recargaPendenteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequenciaRef = useRef(0);
  const montadoRef = useRef(true);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  const loadDashboardData = useCallback(async (showUpdating = false, avisarErro = false) => {
    if (!empresaId) return;

    const sequencia = ++sequenciaRef.current;
    ultimaCargaRef.current = Date.now();

    if (showUpdating) {
      setIsUpdating(true);
    }

    try {
      const { data, error } = await supabase.rpc('dashboard_ao_vivo', { p_dias: DIAS_HISTORICO });
      if (error) throw error;

      // descarta respostas atrasadas de uma carga anterior
      if (!montadoRef.current || sequencia !== sequenciaRef.current) return;

      const resposta = (data || {}) as Partial<DadosAoVivo>;
      setDados({
        empresa_id: resposta.empresa_id ?? null,
        hoje: resposta.hoje ?? '',
        ativos: resposta.ativos ?? [],
        concluidos_hoje: resposta.concluidos_hoje ?? {},
        historico: resposta.historico ?? {},
        ranking: resposta.ranking ?? []
      });
      setLastUpdateTime(new Date());
      setMinutoAtual(Date.now());
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      if (avisarErro && montadoRef.current) {
        notificar('Não foi possível atualizar o Dashboard ao Vivo. Tente novamente.', 'erro');
      }
    } finally {
      if (montadoRef.current) {
        setLoading(false);
        if (showUpdating) {
          setTimeout(() => {
            if (montadoRef.current) setIsUpdating(false);
          }, 1000);
        }
      }
    }
  }, [empresaId]);

  const loadRef = useRef(loadDashboardData);
  loadRef.current = loadDashboardData;

  const handleManualRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    await loadDashboardData(true, true);

    setTimeout(() => {
      if (montadoRef.current) setIsRefreshing(false);
    }, 2000);
  };

  useEffect(() => {
    loadDashboardData(false, true);
  }, [loadDashboardData]);

  useEffect(() => {
    const id = setInterval(() => setMinutoAtual(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!empresaId) return;

    // Throttle: no máximo 1 recarga a cada 8 s. Se já há uma recarga
    // agendada, ela roda depois deste evento e já o inclui.
    const agendarRecarga = () => {
      if (recargaPendenteRef.current) return;
      const espera = Math.max(0, ultimaCargaRef.current + INTERVALO_MIN_RECARGA_MS - Date.now());
      recargaPendenteRef.current = setTimeout(() => {
        recargaPendenteRef.current = null;
        loadRef.current(true);
      }, espera);
    };

    const handleRealtimeUpdate = () => {
      eventosRef.current += 1;
      agendarRecarga();
    };

    const handleStatusChange = (status: string) => {
      setRealtimeStatus(status);
    };

    const unsubscribe = realtimeService.subscribeToMultipleTables(
      TABELAS_REALTIME,
      handleRealtimeUpdate,
      handleStatusChange,
      empresaId
    );

    return () => {
      if (recargaPendenteRef.current) {
        clearTimeout(recargaPendenteRef.current);
        recargaPendenteRef.current = null;
      }
      unsubscribe();
    };
  }, [empresaId]);

  const toggleTvMode = () => {
    setTvMode(!tvMode);
    if (!tvMode) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const registrosAtivos = useMemo(() => dados?.ativos ?? [], [dados?.ativos]);

  const departamentos = useMemo(
    () => montarDepartamentos(registrosAtivos),
    // minutoAtual: recalcula os tempos decorridos a cada minuto
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registrosAtivos, minutoAtual]
  );

  const tempoMedioGeral = useMemo(
    () => Math.round(
      registrosAtivos.reduce((acc, r) => acc + tempoDecorrido(r), 0) / (registrosAtivos.length || 1)
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registrosAtivos, minutoAtual]
  );

  const concluidosHoje = useMemo(
    () => Object.values(dados?.concluidos_hoje ?? {}).reduce((acc, n) => acc + (Number(n) || 0), 0),
    [dados?.concluidos_hoje]
  );

  const historicData = useMemo(() => dados?.historico ?? {}, [dados?.historico]);
  const ranking = useMemo(() => dados?.ranking ?? [], [dados?.ranking]);

  const filteredDepartamentos = departamentos.filter(dept => {
    const termo = searchTerm.toLowerCase();
    return searchTerm === '' ||
      dept.nome.toLowerCase().includes(termo) ||
      dept.usuarios.some(u => u.nome.toLowerCase().includes(termo));
  });

  const usuariosAtivos = registrosAtivos.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando Dashboard Ao Vivo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${tvMode ? 'fixed inset-0 z-50 bg-gray-900 overflow-auto p-4 sm:p-6 lg:p-12' : 'space-y-6'}`}>
      <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 ${tvMode ? 'text-white mb-10' : 'mb-6'}`}>
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="p-2 sm:p-3 bg-blue-600 rounded-xl flex-shrink-0">
            <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${tvMode ? 'text-white' : 'text-gray-900'} truncate`}>
              Dashboard Ao Vivo
            </h1>
            <p className={`text-xs sm:text-sm ${tvMode ? 'text-gray-300' : 'text-gray-600'} hidden sm:block`}>
              Monitoramento em tempo real de todas as atividades
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-shrink-0 ${
            realtimeStatus === 'error' || realtimeStatus === 'timeout'
              ? 'bg-red-100'
              : realtimeStatus === 'connecting'
              ? 'bg-yellow-100'
              : isUpdating
              ? 'bg-blue-100'
              : 'bg-green-100'
          }`}>
            {isUpdating ? (
              <>
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 animate-pulse flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-blue-800 whitespace-nowrap">Atualizando...</span>
              </>
            ) : realtimeStatus === 'error' || realtimeStatus === 'timeout' ? (
              <>
                <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                <span className="text-xs sm:text-sm font-medium text-red-800 whitespace-nowrap">Sem conexão</span>
              </>
            ) : realtimeStatus === 'connecting' ? (
              <>
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse flex-shrink-0"></div>
                <span className="text-xs sm:text-sm font-medium text-yellow-800 whitespace-nowrap">Conectando...</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                <span className="text-xs sm:text-sm font-medium text-green-800 whitespace-nowrap">Ao Vivo</span>
              </>
            )}
          </div>

          <IndicadorAtualizacao
            ultimaAtualizacao={lastUpdateTime}
            eventosRef={eventosRef}
            tvMode={tvMode}
          />

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={`p-2 sm:p-3 rounded-lg transition-colors flex-shrink-0 ${
              tvMode
                ? 'bg-gray-800 hover:bg-gray-700 text-white disabled:bg-gray-900 disabled:opacity-50'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:bg-gray-100 disabled:opacity-50'
            }`}
            title="Atualizar dados manualmente"
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={toggleTvMode}
            className={`p-2 sm:p-3 rounded-lg transition-colors flex-shrink-0 ${
              tvMode
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title={tvMode ? 'Sair do modo TV' : 'Modo TV'}
          >
            <Maximize className={`w-4 h-4 sm:w-5 sm:h-5`} />
          </button>
        </div>
      </div>

      {tvMode && (
        <div className="flex items-center justify-center mb-10">
          <img
            src="/logo_performaxis.png"
            alt="Logo PERFORMAXIS"
            className="h-20 w-auto drop-shadow-2xl"
          />
        </div>
      )}

      <div className={tvMode ? 'mb-10' : 'mb-6'}>
        <div className={`${tvMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg ${tvMode ? 'p-6 sm:p-8' : 'p-4 sm:p-6'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className={`text-lg sm:text-xl font-bold ${tvMode ? 'text-white' : 'text-gray-900'}`}>
              Departamentos Ativos
            </h2>

            <div className="flex items-center">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full sm:w-auto pl-10 pr-4 py-2 rounded-lg border ${
                    tvMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${tvMode ? 'gap-6' : 'gap-4'}`}>
            {filteredDepartamentos.length > 0 ? (
              filteredDepartamentos.map((dept) => (
                <DepartmentCard
                  key={dept.id}
                  department={dept}
                  onClickUsuario={setSelectedUsuario}
                  tvMode={tvMode}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Activity className={`w-16 h-16 mx-auto mb-4 ${tvMode ? 'text-gray-600' : 'text-gray-300'}`} />
                <h3 className={`text-lg font-medium mb-2 ${tvMode ? 'text-gray-300' : 'text-gray-800'}`}>
                  Nenhuma atividade em andamento
                </h3>
                <p className={`${tvMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  As atividades aparecerão aqui em tempo real
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={tvMode ? 'mb-10' : 'mb-6'}>
        <StatsHeader
          registrosAtivos={usuariosAtivos}
          concluidosHoje={concluidosHoje}
          usuariosAtivos={usuariosAtivos}
          tempoMedio={tempoMedioGeral}
          tvMode={tvMode}
        />
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-2 ${tvMode ? 'gap-8' : 'gap-6'}`}>
        <div>
          <HistoricalComparison historicData={historicData} tvMode={tvMode} />
        </div>

        <div>
          <RankingPanel ranking={ranking} tvMode={tvMode} />
        </div>
      </div>

      {selectedUsuario && (
        <DetailModal
          usuario={selectedUsuario}
          onClose={() => setSelectedUsuario(null)}
        />
      )}
    </div>
  );
};

export default DashboardAoVivo;
