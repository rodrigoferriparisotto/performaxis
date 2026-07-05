import React, { useState, useEffect } from 'react';
import { registroRevisaoService, usuarioService, atividadeService, suiteService } from '../../services/supabaseService';
import { formatarData, formatarHorario } from '../../utils/dateUtils';
import { calcularTempoTotal as calcularTempo } from '../../utils/timeCalculations';
import { useAuth } from '../../contexts/AuthContext';
import Pagination from '../common/Pagination';
import {
  History,
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
 Home,
 Trash2
} from 'lucide-react';

const PAGE_SIZE = 15;

const HistoricoRevisao: React.FC = () => {
  const { user } = useAuth();
  const [registros, setRegistros] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [suites, setSuites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registroSelecionado, setRegistroSelecionado] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  useEffect(() => {
    carregarDados();
  }, [currentPage]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [registrosData, usuariosData, atividadesData, suitesData, count] = await Promise.all([
        registroRevisaoService.getRegistros(currentPage, PAGE_SIZE),
        usuarioService.getUsuarios(),
        atividadeService.getAtividades(),
        suiteService.getSuites(),
        registroRevisaoService.getRegistrosCount()
      ]);

      setRegistros(registrosData);
      setUsuarios(usuariosData);
      setAtividades(atividadesData);
      setSuites(suitesData);
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
    if (!usuarioId) return 'Não informado';
    const usuario = usuarios.find(u => u.id === usuarioId);
    return usuario?.name || 'Usuário não encontrado';
  };

  const getAtividadeNome = (atividadeId: string) => {
    const atividade = atividades.find(a => a.id === atividadeId);
    return atividade?.name || 'Atividade não encontrada';
  };

  const getSuiteNome = (suiteId: string) => {
    const suite = suites.find(s => s.id === suiteId);
    return suite ? `Suíte ${suite.name}` : 'Suíte não encontrada';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'realizada':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pendente':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'realizada':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'pendente':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'realizada':
        return 'Realizada';
      case 'pendente':
        return 'Não Realizada';
      default:
        return 'Pendente';
    }
  };

  const toggleDetalhes = (registroId: string) => {
    setRegistroSelecionado(registroSelecionado === registroId ? null : registroId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Histórico - Revisão</h1>
        <p className="text-gray-600">Consulte os registros de revisão realizados</p>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <History className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Registros de Revisão</h2>
              <p className="text-sm text-gray-600">{registros.length} registros encontrados</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {registros.length > 0 ? (
            <div className="space-y-4">
              {registros.map((registro) => (
                <div key={registro.id} className="border border-gray-200 rounded-lg">
                  {/* Header do Registro */}
                  <div
                    onClick={() => toggleDetalhes(registro.id)}
                    className="w-full p-3 lg:p-4 text-left hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-4 min-w-0 flex-1">
                        <div className="flex items-center space-x-2 min-w-0">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-800 text-sm lg:text-base truncate">
                            {formatarData(registro.data)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 min-w-0">
                          <Home className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600 text-sm lg:text-base truncate">{getSuiteNome(registro.suite_id)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 min-w-0">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600 text-sm lg:text-base truncate">{getUsuarioNome(registro.usuario_id)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 min-w-0">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className={`text-sm lg:text-base ${
                            registro.status === 'em_andamento' ? 'text-blue-600 font-medium' : 'text-gray-600'
                          }`}>
                            {calcularTempo(registro.hora_inicio, registro.hora_fim, registro.status).texto}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 lg:space-x-2 flex-shrink-0">
                        <Eye className="w-4 h-4 text-gray-400" />
                       {(user?.profile === 'admin' || user?.profile === 'gestor') && (
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             if (confirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.')) {
                               registroRevisaoService.deleteRegistro(registro.id).then(success => {
                                 if (success) {
                                   carregarDados();
                                   alert('Registro excluído com sucesso!');
                                 } else {
                                   alert('Erro ao excluir registro');
                                 }
                               });
                             }
                           }}
                           className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors duration-200"
                           title="Excluir registro"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       )}
                        {registroSelecionado === registro.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalhes do Registro */}
                  {registroSelecionado === registro.id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="space-y-6">
                        {/* Informações Gerais */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Suíte
                            </label>
                            <p className="text-sm text-gray-600">{getSuiteNome(registro.suite_id)}</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tipo de Serviço
                            </label>
                            <p className="text-sm text-gray-600">Suíte Livre</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Hora de Início
                            </label>
                            <p className="text-sm text-gray-600">
                              {formatarHorario(registro.hora_inicio)}
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Hora de Fim
                            </label>
                            <p className="text-sm text-gray-600">
                              {formatarHorario(registro.hora_fim)}
                            </p>
                          </div>
                        </div>

                        {/* Atividades Realizadas */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Atividades de Revisão</h4>
                          <div className="space-y-2">
                            {registro.atividades.map((atividade: any, index: number) => (
                              <div
                                key={index}
                                className={`p-3 rounded-lg border ${getStatusColor(atividade.status)}`}
                              >
                                <div className="flex items-center space-x-3">
                                  {getStatusIcon(atividade.status)}
                                  <div className="flex-1">
                                    <span className="font-medium">
                                      {getAtividadeNome(atividade.atividadeId || atividade.atividade_id)}
                                    </span>
                                    <span className="ml-2 text-xs">
                                      ({getStatusLabel(atividade.status)})
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Observações */}
                        {registro.observacoes && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                              <FileText className="w-4 h-4 mr-1" />
                              Observações
                            </h4>
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-700">{registro.observacoes}</p>
                            </div>
                          </div>
                        )}

                        {/* Fotos */}

                        {/* Informação sobre Registro da Camararia */}
                        {registro.registro_camararia_id && (
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                              <strong>Revisão baseada em registro da camararia</strong>
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              ID do registro: {registro.registro_camararia_id}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum registro encontrado</h3>
              <p className="text-gray-600">Os registros de revisão aparecerão aqui após serem criados</p>
            </div>
          )}
        </div>

        {registros.length > 0 && (
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
      {registros.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <History className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Registros</p>
                <p className="text-2xl font-bold text-gray-800">{totalRecords}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Atividades Realizadas</p>
                <p className="text-2xl font-bold text-gray-800">
                  {registros.reduce((acc, r) => 
                    acc + r.atividades.filter((a: any) => a.status === 'realizada').length, 0
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gray-100 rounded-lg">
                <XCircle className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Não Realizadas</p>
                <p className="text-2xl font-bold text-gray-800">
                  {registros.reduce((acc, r) => 
                    acc + r.atividades.filter((a: any) => a.status === 'pendente').length, 0
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Home className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Suítes Revisadas</p>
                <p className="text-2xl font-bold text-gray-800">
                  {new Set(registros.map(r => r.suite_id)).size}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricoRevisao;