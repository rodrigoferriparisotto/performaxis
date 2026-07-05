import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle, AlertCircle, Clock, TrendingUp, Calendar, Users, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { buscarLogsCalculo } from '../../services/performanceService';
import { format } from 'date-fns';

interface LogCalculo {
  id: string;
  empresa_id: string;
  data_calculo: string;
  tipo_calculo: string;
  usuarios_processados: number;
  usuarios_com_erro: number;
  tempo_execucao_ms: number;
  status: string;
  mensagem_erro: string | null;
  detalhes_json: any;
  created_at: string;
}

const MonitoramentoPerformance: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogCalculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  useEffect(() => {
    carregarLogs();
  }, [user]);

  const carregarLogs = async () => {
    setLoading(true);
    setErro(null);
    try {
      if (!user?.empresaId) {
        setErro('Empresa não identificada. Entre em contato com o suporte.');
        setLogs([]);
        return;
      }

      if (user.profile !== 'admin') {
        setErro('Apenas administradores podem visualizar os logs de monitoramento.');
        setLogs([]);
        return;
      }

      const dados = await buscarLogsCalculo(user.empresaId, 100);
      setLogs(dados);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      setErro('Erro ao carregar logs. Tente novamente mais tarde.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const logsFiltrados = logs.filter(log => {
    if (filtroTipo !== 'todos' && log.tipo_calculo !== filtroTipo) return false;
    if (filtroStatus !== 'todos' && log.status !== filtroStatus) return false;
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'parcial':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'erro':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sucesso':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'parcial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'erro':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'diario':
        return 'bg-blue-100 text-blue-800';
      case 'mensal':
        return 'bg-teal-100 text-teal-800';
      case 'retroativo':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatarTempo = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const segundos = Math.floor(ms / 1000);
    if (segundos < 60) return `${segundos}s`;
    const minutos = Math.floor(segundos / 60);
    const segsRestantes = segundos % 60;
    return `${minutos}min ${segsRestantes}s`;
  };

  const formatarDataHora = (dataISO: string) => {
    try {
      const data = new Date(dataISO);
      return format(data, 'dd/MM/yyyy HH:mm:ss');
    } catch {
      return dataISO;
    }
  };

  const calcularEstatisticas = () => {
    const totalCalclos = logs.length;
    const sucessos = logs.filter(l => l.status === 'sucesso').length;
    const parciais = logs.filter(l => l.status === 'parcial').length;
    const erros = logs.filter(l => l.status === 'erro').length;
    const totalUsuarios = logs.reduce((sum, l) => sum + l.usuarios_processados, 0);
    const tempoTotal = logs.reduce((sum, l) => sum + l.tempo_execucao_ms, 0);
    const tempoMedio = totalCalclos > 0 ? tempoTotal / totalCalclos : 0;

    return {
      totalCalclos,
      sucessos,
      parciais,
      erros,
      totalUsuarios,
      tempoMedio,
    };
  };

  const stats = calcularEstatisticas();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-lg">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Monitoramento de Performance</h1>
                <p className="text-gray-600 mt-1">Acompanhe o histórico de cálculos e processamento</p>
              </div>
            </div>
            <button
              onClick={carregarLogs}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-red-900 font-medium">{erro}</p>
              </div>
            </div>
          </div>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Total de Cálculos</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalCalclos}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Sucessos</span>
            </div>
            <p className="text-3xl font-bold text-green-900">{stats.sucessos}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.parciais} parciais • {stats.erros} erros
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Users className="w-6 h-6 text-slate-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Usuários Processados</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalUsuarios}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Tempo Médio</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatarTempo(stats.tempoMedio)}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Cálculo</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos</option>
                <option value="diario">Diário</option>
                <option value="mensal">Mensal</option>
                <option value="retroativo">Retroativo</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos</option>
                <option value="sucesso">Sucesso</option>
                <option value="parcial">Parcial</option>
                <option value="erro">Erro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Logs */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            {logsFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Nenhum log encontrado</p>
                <p className="text-gray-400 text-sm mt-2">
                  {filtroTipo !== 'todos' || filtroStatus !== 'todos'
                    ? 'Tente ajustar os filtros'
                    : 'Os logs aparecerão aqui após os cálculos'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Data/Hora</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Data Cálculo</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Tipo</th>
                    <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700">Usuários</th>
                    <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700">Erros</th>
                    <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700">Tempo</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logsFiltrados.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {formatarDataHora(log.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-900 font-medium">
                          {new Date(log.data_calculo).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTipoBadge(log.tipo_calculo)}`}>
                          {log.tipo_calculo.charAt(0).toUpperCase() + log.tipo_calculo.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="text-sm font-semibold text-gray-900">
                          {log.usuarios_processados}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`text-sm font-semibold ${
                          log.usuarios_com_erro > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {log.usuarios_com_erro}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {formatarTempo(log.tempo_execucao_ms)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(log.status)}`}>
                            {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Info sobre Cron Job */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-2">Cálculo Automático Diário:</p>
              <p className="text-blue-800">
                O sistema executa automaticamente o cálculo de performance todos os dias às <strong>23h59</strong>.
                Todos os usuários ativos são processados e o ranking é atualizado automaticamente.
                Você pode acompanhar cada execução nesta página.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoramentoPerformance;
