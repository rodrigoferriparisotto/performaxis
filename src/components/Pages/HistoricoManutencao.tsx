import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { manutencaoService, usuarioService } from '../../services/supabaseService';
import { formatarData, formatarHorario } from '../../utils/dateUtils';
import Pagination from '../common/Pagination';
import {
  History,
  Calendar,
  Clock,
  User,
  MapPin,
  Settings,
  Eye,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';

const PAGE_SIZE = 15;

const HistoricoManutencao: React.FC = () => {
  const { user } = useAuth();
  const [manutencoes, setManutencoes] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [manutencaoSelecionada, setManutencaoSelecionada] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  useEffect(() => {
    carregarDados();
  }, [currentPage]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [manutencoesData, usuariosData, count] = await Promise.all([
        manutencaoService.getManutencoesByStatus(['concluida'], currentPage, PAGE_SIZE),
        usuarioService.getUsuarios(),
        manutencaoService.getManutencoesCount(['concluida'])
      ]);

      setManutencoes(manutencoesData);
      setUsuarios(usuariosData);
      setTotalRecords(count);
    } catch (error) {

      alert('Erro ao carregar histórico. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getUsuarioNome = (usuarioId: string | null | undefined) => {
    if (!usuarioId) return 'Não atribuído';
    const usuario = usuarios.find(u => u.id === usuarioId);
    return usuario?.name || 'Usuário não encontrado';
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'correcao': return 'Correção';
      case 'conserto': return 'Conserto';
      case 'nova_instalacao': return 'Nova Instalação';
      case 'preventiva': return 'Preventiva';
      case 'substituicao': return 'Substituição';
      default: return tipo;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'correcao': return 'bg-yellow-100 text-yellow-800';
      case 'conserto': return 'bg-red-100 text-red-800';
      case 'nova_instalacao': return 'bg-green-100 text-green-800';
      case 'preventiva': return 'bg-blue-100 text-blue-800';
      case 'substituicao': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrioridadeLabel = (prioridade: string) => {
    switch (prioridade) {
      case 'baixa': return 'Baixa';
      case 'normal': return 'Normal';
      case 'alta': return 'Alta';
      default: return prioridade;
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'baixa': return 'bg-green-100 text-green-800';
      case 'normal': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatarTempo = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const calcularTempoPausas = (pausas: any[]) => {
    let tempoPausas = 0;
    pausas.forEach(pausa => {
      if (pausa.hora_retomada) {
        tempoPausas += new Date(pausa.hora_retomada).getTime() - new Date(pausa.hora_pausa).getTime();
      }
    });
    return Math.floor(tempoPausas / (1000 * 60)); // em minutos
  };

  const toggleDetalhes = (manutencaoId: string) => {
    setManutencaoSelecionada(manutencaoSelecionada === manutencaoId ? null : manutencaoId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Histórico - Manutenção</h1>
        <p className="text-gray-600">Consulte o histórico de manutenções realizadas</p>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <History className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Manutenções Realizadas</h2>
              <p className="text-sm text-gray-600">{totalRecords} manutenções concluídas</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {manutencoes.length > 0 ? (
            <div className="space-y-4">
              {manutencoes.map((manutencao) => (
                <div key={manutencao.id} className="border border-gray-200 rounded-lg">
                  {/* Header do Registro */}
                  <div
                    onClick={() => toggleDetalhes(manutencao.id)}
                    className="w-full p-3 lg:p-4 text-left hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-4 min-w-0 flex-1">
                        <div className="flex items-center space-x-2 min-w-0">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-800 text-sm lg:text-base truncate">
                            {formatarData(manutencao.data)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 min-w-0">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600 text-sm lg:text-base truncate">{manutencao.local}</span>
                        </div>
                        
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoColor(manutencao.tipo)} hidden lg:inline-block`}>
                          {getTipoLabel(manutencao.tipo)}
                        </span>
                        
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioridadeColor(manutencao.prioridade)} hidden lg:inline-block`}>
                          {getPrioridadeLabel(manutencao.prioridade)}
                        </span>
                        
                        <div className="flex items-center space-x-2 min-w-0">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600 text-sm lg:text-base truncate">{getUsuarioNome(manutencao.usuario_id)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 min-w-0">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600 text-sm lg:text-base">
                            {formatarTempo(manutencao.tempo_total || 0)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 lg:space-x-2 flex-shrink-0">
                        <Eye className="w-4 h-4 text-gray-400" />
                       {(user?.profile === 'admin' || user?.profile === 'gestor') && (
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             if (confirm('Tem certeza que deseja excluir esta manutenção? Esta ação não pode ser desfeita.')) {
                               manutencaoService.deleteManutencao(manutencao.id).then(success => {
                                 if (success) {
                                   carregarDados();
                                   alert('Manutenção excluída com sucesso!');
                                 } else {
                                   alert('Erro ao excluir manutenção');
                                 }
                               });
                             }
                           }}
                           className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors duration-200"
                           title="Excluir manutenção"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       )}
                        {manutencaoSelecionada === manutencao.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalhes do Registro */}
                  {manutencaoSelecionada === manutencao.id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="space-y-6">
                        {/* Informações Gerais */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Local
                            </label>
                            <p className="text-sm text-gray-600">{manutencao.local}</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tipo
                            </label>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTipoColor(manutencao.tipo)}`}>
                              {getTipoLabel(manutencao.tipo)}
                            </span>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Prioridade
                            </label>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPrioridadeColor(manutencao.prioridade)}`}>
                              {getPrioridadeLabel(manutencao.prioridade)}
                            </span>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Hora de Início
                            </label>
                            <p className="text-sm text-gray-600">
                              {formatarHorario(manutencao.hora_inicio)}
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Hora de Fim
                            </label>
                            <p className="text-sm text-gray-600">
                              {formatarHorario(manutencao.hora_fim)}
                            </p>
                          </div>
                        </div>

                        {/* Descrição */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Manutenção Realizada</h4>
                          <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-700">{manutencao.descricao}</p>
                          </div>
                        </div>

                        {/* Observações */}
                        {manutencao.observacoes && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Observações</h4>
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-700">{manutencao.observacoes}</p>
                            </div>
                          </div>
                        )}

                        {/* Pausas */}
                        {manutencao.pausas && manutencao.pausas.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Pausas</h4>
                            <div className="space-y-2">
                              {manutencao.pausas.map((pausa: any, index: number) => (
                                <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">
                                      Pausa {index + 1}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                      {new Date(pausa.hora_pausa).toLocaleTimeString('pt-BR')}
                                      {pausa.hora_retomada && (
                                        <> até {new Date(pausa.hora_retomada).toLocaleTimeString('pt-BR')}</>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Resumo de Tempo */}
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                          <h4 className="text-sm font-medium text-orange-800 mb-2">Resumo de Tempo</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-orange-700">Tempo Total:</span>
                              <span className="ml-2 font-medium text-orange-800">
                                {formatarTempo(manutencao.tempo_total || 0)}
                              </span>
                            </div>
                            {manutencao.pausas && manutencao.pausas.length > 0 && (
                              <div>
                                <span className="text-orange-700">Tempo em Pausas:</span>
                                <span className="ml-2 font-medium text-orange-800">
                                  {formatarTempo(calcularTempoPausas(manutencao.pausas))}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-orange-700">Pausas:</span>
                              <span className="ml-2 font-medium text-orange-800">
                                {manutencao.pausas ? manutencao.pausas.length : 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma manutenção encontrada</h3>
              <p className="text-gray-600">O histórico de manutenções aparecerá aqui após serem concluídas</p>
            </div>
          )}
        </div>

        {manutencoes.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {/* Estatísticas */}
      {manutencoes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <History className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Realizadas</p>
                <p className="text-2xl font-bold text-gray-800">{totalRecords}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Preventivas</p>
                <p className="text-2xl font-bold text-gray-800">
                  {manutencoes.filter(m => m.tipo === 'preventiva').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <Settings className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Consertos</p>
                <p className="text-2xl font-bold text-gray-800">
                  {manutencoes.filter(m => m.tipo === 'conserto').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Tempo Médio</p>
                <p className="text-2xl font-bold text-gray-800">
                  {manutencoes.length > 0 
                    ? formatarTempo(Math.round(manutencoes.reduce((acc, m) => acc + (m.tempo_total || 0), 0) / manutencoes.length))
                    : '0min'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricoManutencao;