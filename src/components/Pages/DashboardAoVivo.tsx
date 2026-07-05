import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardService } from '../../services/dashboardService';
import { realtimeService } from '../../services/realtimeService';
import {
  Activity,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Target,
  Eye,
  Maximize,
  Filter,
  Search,
  Zap,
  Calendar,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import StatsHeader from '../Dashboard/StatsHeader';
import HistoricalComparison from '../Dashboard/HistoricalComparison';
import RankingPanel from '../Dashboard/RankingPanel';
import DepartmentCard from '../Dashboard/DepartmentCard';
import DetailModal from '../Dashboard/DetailModal';
import { DepartmentData, UsuarioAtivo } from '../../types/dashboard';

const DashboardAoVivo: React.FC = () => {
  const { user, empresa } = useAuth();
  const [loading, setLoading] = useState(true);
  const [registrosAtivos, setRegistrosAtivos] = useState<any[]>([]);
  const [concluidosHoje, setConcluidosHoje] = useState(0);
  const [historicData, setHistoricData] = useState<any>({});
  const [ranking, setRanking] = useState<any[]>([]);
  const [departamentos, setDepartamentos] = useState<DepartmentData[]>([]);
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioAtivo | null>(null);
  const [tvMode, setTvMode] = useState(false);
  const [filteredDepartments, setFilteredDepartments] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('connecting');
  const [realtimeEventsCount, setRealtimeEventsCount] = useState(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<Date>(new Date());

  const loadDashboardData = useCallback(async (showUpdating = false) => {
    if (!empresa?.id) return;

    if (showUpdating) {
      setIsUpdating(true);
    }

    try {
      const [
        ativos,
        concluidos,
        historic,
        rankingData
      ] = await Promise.all([
        DashboardService.getRegistrosAtivos(empresa.id),
        DashboardService.getConcluidosHoje(empresa.id),
        DashboardService.getHistoricData(empresa.id, 7),
        DashboardService.getRankingUsuarios(empresa.id)
      ]);

      setRegistrosAtivos(ativos);
      setConcluidosHoje(concluidos);
      setHistoricData(historic);
      setRanking(rankingData);

      processarDepartamentos(ativos);

      const now = new Date();
      setLastUpdateTime(now);
      lastUpdateRef.current = now;
      setRealtimeConnected(true);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setRealtimeConnected(false);
    } finally {
      setLoading(false);
      if (showUpdating) {
        setTimeout(() => setIsUpdating(false), 1000);
      }
    }
  }, [empresa]);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    await loadDashboardData(true);

    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000);
  };

  const processarDepartamentos = (registros: any[]) => {
    const departamentosMap = new Map<string, DepartmentData>();

    registros.forEach((registro) => {
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

      const isManutencao = registro.table === 'manutencoes';
      const progresso = isManutencao
        ? (registro.status === 'pausada' ? 50 : 75)
        : DashboardService.calcularProgresso(registro.atividades);

      // Usar método centralizado que aplica lógica de pausas
      const tempoDecorrido = DashboardService.calcularTempoDecorridoComPausas(registro);

      // Gerar descrição da atividade
      let descricaoAtividade = '';
      if (isManutencao) {
        const tiposMap: { [key: string]: string } = {
          'correcao': 'Correção',
          'conserto': 'Conserto',
          'nova_instalacao': 'Nova Instalação',
          'preventiva': 'Preventiva',
          'substituicao': 'Substituição'
        };
        const tipoLabel = registro.tipo ? tiposMap[registro.tipo] || registro.tipo : 'Manutenção';
        const statusSuffix = registro.status === 'pausada' ? ' (Pausada)' : '';
        descricaoAtividade = `${tipoLabel}: ${registro.local}${statusSuffix}`;
      } else if (registro.tipo_atividade?.nome) {
        descricaoAtividade = registro.tipo_atividade.nome;
      } else if (registro.tipos_servicos_camararia?.nome) {
        descricaoAtividade = registro.tipos_servicos_camararia.nome;
      } else if (registro.tipos_recepcao?.nome) {
        descricaoAtividade = registro.tipos_recepcao.nome;
      } else if (registro.tipos_areas_comuns?.nome) {
        descricaoAtividade = registro.tipos_areas_comuns.nome;
      } else if (registro.tipos_cozinha?.nome) {
        descricaoAtividade = registro.tipos_cozinha.nome;
      } else if (registro.tipos_gestao?.nome) {
        descricaoAtividade = registro.tipos_gestao.nome;
      } else if (registro.tipos_funcoes_comerciais?.nome) {
        descricaoAtividade = registro.tipos_funcoes_comerciais.nome;
      } else if (registro.tipos_extras?.nome) {
        descricaoAtividade = registro.tipos_extras.nome;
      } else if (registro.suites?.name) {
        descricaoAtividade = `Suíte ${registro.suites.name}`;
      } else if (registro.local) {
        descricaoAtividade = registro.local;
      } else {
        descricaoAtividade = DashboardService.getDepartamentoNome(dept);
      }

      const usuarioAtivo: UsuarioAtivo = {
        id: registro.usuarios.id,
        nome: registro.usuarios.name,
        progresso,
        totalAtividades: registro.atividades?.length || 0,
        atividadesCompletas: registro.atividades?.filter((a: any) => a.status === 'realizada').length || 0,
        tempoDecorrido,
        registroId: registro.id,
        horaInicio: registro.hora_inicio,
        departamento: dept,
        local: isManutencao
          ? `${registro.local}${registro.status === 'pausada' ? ' (Pausada)' : ''}`
          : (registro.suites?.name ? `Suíte ${registro.suites.name}` : registro.local || DashboardService.getDepartamentoNome(dept)),
        observacoes: registro.observacoes || '',
        atividades: registro.atividades || [],
        isManutencao: isManutencao || registro.isManutencao || false,
        tipo: registro.tipo,
        prioridade: registro.prioridade,
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

    setDepartamentos(Array.from(departamentosMap.values()));
  };

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!empresa?.id) return;

    realtimeService.enableDebug(true);

    const handleRealtimeUpdate = (payload: any) => {
      setRealtimeEventsCount(prev => prev + 1);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        loadDashboardData(true);
      }, 300);
    };

    const handleStatusChange = (status: string) => {
      setRealtimeStatus(status);
      if (status === 'connected') {
        setRealtimeConnected(true);
      } else if (status === 'error' || status === 'timeout') {
        setRealtimeConnected(false);
      }
    };

    const unsubscribe = realtimeService.subscribeToMultipleTables(
      [
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
      ],
      handleRealtimeUpdate,
      handleStatusChange
    );

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      unsubscribe();
    };
  }, [empresa, loadDashboardData]);

  const getTimeSinceUpdate = () => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdateTime.getTime()) / 1000);

    if (diff < 5) return 'agora';
    if (diff < 60) return `há ${diff}s`;
    const minutes = Math.floor(diff / 60);
    if (minutes === 1) return 'há 1 min';
    return `há ${minutes} min`;
  };

  const [timeSinceUpdate, setTimeSinceUpdate] = useState('agora');

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSinceUpdate(getTimeSinceUpdate());
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdateTime]);

  const toggleTvMode = () => {
    setTvMode(!tvMode);
    if (!tvMode) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const filteredDepartamentos = departamentos.filter(dept => {
    const matchesFilter = filteredDepartments.length === 0 || filteredDepartments.includes(dept.id);
    const matchesSearch = searchTerm === '' ||
      dept.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.usuarios.some(u => u.nome.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const usuariosAtivos = registrosAtivos.length;
  const tempoMedioGeral = Math.round(
    registrosAtivos.reduce((acc, r) => {
      return acc + DashboardService.calcularTempoDecorridoComPausas(r);
    }, 0) / (registrosAtivos.length || 1)
  );

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
                <span className="text-xs sm:text-sm font-medium text-red-800 whitespace-nowrap">Offline</span>
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

          <span className={`text-xs sm:text-sm ${tvMode ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap hidden sm:inline`}>
            {realtimeEventsCount > 0 ? `${realtimeEventsCount} eventos` : `Atualizado ${timeSinceUpdate}`}
          </span>

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
                  onClickUsuario={(usuario) => setSelectedUsuario(usuario)}
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
