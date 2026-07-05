import React, { useState, useEffect } from 'react';
import { atividadeService, registroRevisaoService, registroCamarariaService, suiteService, usuarioService, cancelamentoService } from '../../services/supabaseService';
import { getDataAtual } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { activityMarkingService } from '../../services/activityMarkingService';
import {
  Calendar,
  Play,
  Square,
  CheckSquare,
  FileText,
  Clock,
  Save,
  AlertCircle,
  Eye,
  Plus,
  Home,
  ChevronDown,
  User,
  Bed,
  X
} from 'lucide-react';
import { getRandomMotivationalPhrase, getMotivationalColor, getMotivationalBgColor } from '../../utils/motivationalPhrases';
import { useAchievementTracker } from '../../hooks/useAchievementTracker';
import AchievementModal from '../common/AchievementModal';

const NovoRegistroRevisao: React.FC = () => {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const [registroAtivo, setRegistroAtivo] = useState<any>(null);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [todasAtividades, setTodasAtividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [registrosCamararia, setRegistrosCamararia] = useState<any[]>([]);
  const [suites, setSuites] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [showNovoRegistro, setShowNovoRegistro] = useState(false);
  const [suiteSelecionada, setSuiteSelecionada] = useState('');
  const [registroSelecionado, setRegistroSelecionado] = useState<any>(null);
  const [showOldRecordModal, setShowOldRecordModal] = useState(false);
  const [oldRecord, setOldRecord] = useState<any>(null);

  useEffect(() => {
    carregarDados();
  }, [user]);

  const carregarDados = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Carregar dados em paralelo
      const [atividadesRevisao, todasAtividadesData, suitesData, usuariosData, registroEmAndamento, registrosPendentes] = await Promise.all([
        atividadeService.getAtividadesByType('revisao'),
        atividadeService.getAtividades(), // Carregar todas as atividades para o modal
        suiteService.getSuites(),
        usuarioService.getUsuarios(),
        registroRevisaoService.getRegistroEmAndamento(user.id, getDataAtual()),
        registroRevisaoService.getRegistrosPendentesRevisao(getDataAtual())
      ]);

      // Usar apenas atividades de revisão
      setAtividades(atividadesRevisao);
      setTodasAtividades(todasAtividadesData);
      setSuites(suitesData);
      setUsuarios(usuariosData);
      setRegistrosCamararia(registrosPendentes);

      if (registroEmAndamento) {
        // Sempre carregar o registro em andamento, independente da data
        setRegistroAtivo(registroEmAndamento);
        
        // Para registro ativo de revisão, carregar atividades baseado no registro
        if (registroEmAndamento.atividades && registroEmAndamento.atividades.length > 0) {
          const idsAtividades = registroEmAndamento.atividades.map((a: any) => a.atividade_id);
          const atividadesDoRegistro = atividadesRevisao.filter(atividade =>
            idsAtividades.includes(atividade.id)
          );
          setAtividades(atividadesDoRegistro);
        } else {
          // Se não há atividades no registro, usar todas as atividades de revisão
          setAtividades(atividadesRevisao);
        }
        
        setObservacoes(registroEmAndamento.observacoes || '');
      } else {
        // Para novos registros, usar todas as atividades de revisão
        setAtividades(atividadesRevisao);
      }
    } catch (error) {
      alert('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const finalizarRegistroAntigo = async () => {
    if (!oldRecord) return;
    
    setSaving(true);
    try {
      // Marcar atividades pendentes como não realizadas
      const atividadesFinais = (oldRecord.atividades || []).map((a: any) => ({
        ...a,
        status: a.status === 'pendente' ? 'pendente' : a.status
      }));

      const dadosFinalizacao = {
        atividades: atividadesFinais,
        observacoes: oldRecord.observacoes || 'Registro finalizado após mudança de data',
        hora_fim: new Date().toISOString(),
        status: 'concluido' as const
      };

      const resultado = await registroRevisaoService.updateRegistro(oldRecord.id, dadosFinalizacao);
      if (resultado) {
        setOldRecord(null);
        setShowOldRecordModal(false);
        // Recarregar dados para atualizar a lista
        await carregarDados();
        alert('Registro anterior finalizado com sucesso!');
      } else {
        alert('Erro ao finalizar registro anterior');
      }
    } catch (error) {
      alert('Erro ao finalizar registro anterior');
    } finally {
      setSaving(false);
    }
  };

  const cancelarRegistroAntigo = async () => {
    if (!oldRecord) return;
    
    setSaving(true);
    try {
      // Salvar cancelamento para auditoria
      const cancelamentoData = {
        tipo: 'registro_revisao',
        usuario_id: user?.id || '',
        data_hora: new Date().toISOString(),
        registro_id: oldRecord.id,
        suite_id: oldRecord.suite_id,
        motivo: 'Cancelamento de registro de dia anterior'
      };
      
      await cancelamentoService.saveCancelamento(cancelamentoData);
      
      // Excluir o registro
      const sucesso = await registroRevisaoService.deleteRegistro(oldRecord.id);
      if (sucesso) {
        await activityMarkingService.limparRastreamentoCompleto();
        setOldRecord(null);
        setShowOldRecordModal(false);
        alert('Registro anterior cancelado com sucesso!');
      } else {
        alert('Erro ao cancelar registro anterior');
      }
    } catch (error) {
      alert('Erro ao cancelar registro anterior');
    } finally {
      setSaving(false);
    }
  };

  const continuarRegistroAntigo = () => {
    if (!oldRecord) return;
    
    // Carregar o registro antigo como ativo
    setRegistroAtivo(oldRecord);
    setObservacoes(oldRecord.observacoes || '');
    setOldRecord(null);
    setShowOldRecordModal(false);
  };

  const iniciarRegistroExistente = async (registroCamararia: any) => {
    setSaving(true);
    
    const novoRegistro = {
      data: getDataAtual(),
      suite_id: registroCamararia.suite_id,
      tipo_servico: 'suite_livre' as const,
      usuario_id: user?.id,
      hora_inicio: new Date().toISOString(),
      atividades: atividades.map(a => ({
        atividade_id: a.id,
        nome: a.name,
        status: 'pendente' as const
      })),
      observacoes: '',
      fotos: [],
      status: 'em_andamento' as const,
      registro_camararia_id: registroCamararia.id
    };

    try {
      const resultado = await registroRevisaoService.saveRegistro(novoRegistro);
      if (resultado) {
        setRegistroAtivo(resultado);
        await activityMarkingService.registrarInicio('revisao');
      } else {
        alert('Erro ao iniciar registro');
      }
    } catch (error) {
      alert('Erro ao iniciar registro');
    } finally {
      setSaving(false);
    }
  };

  const iniciarNovoRegistro = async () => {
    if (!suiteSelecionada) {
      alert('Por favor, selecione uma suíte');
      return;
    }

    setSaving(true);
    
    const novoRegistro = {
      data: getDataAtual(),
      suite_id: suiteSelecionada,
      tipo_servico: 'suite_livre' as const,
      usuario_id: user?.id,
      hora_inicio: new Date().toISOString(),
      atividades: atividades.map(a => ({
        atividade_id: a.id,
        nome: a.name,
        status: 'pendente' as const
      })),
      observacoes: '',
      fotos: [],
      status: 'em_andamento' as const
    };

    try {
      const resultado = await registroRevisaoService.saveRegistro(novoRegistro);
      if (resultado) {
        setRegistroAtivo(resultado);
        await activityMarkingService.registrarInicio('revisao');
        setShowNovoRegistro(false);
        setSuiteSelecionada('');
      } else {
        alert('Erro ao iniciar registro');
      }
    } catch (error) {
      alert('Erro ao iniciar registro');
    } finally {
      setSaving(false);
    }
  };

  const toggleAtividade = async (atividadeId: string) => {
    if (!registroAtivo) return;

    const atividadesAtualizadas = registroAtivo.atividades.map((a: any) => {
      if (a.atividade_id === atividadeId) {
        return {
          ...a,
          status: a.status === 'pendente' ? 'realizada' : 'pendente'
        };
      }
      return a;
    });

    const registroAtualizado = {
      ...registroAtivo,
      atividades: atividadesAtualizadas,
      observacoes
    };

    setRegistroAtivo(registroAtualizado);

    try {
      await registroRevisaoService.updateRegistro(registroAtivo.id, {
        atividades: atividadesAtualizadas,
        observacoes
      });
      await activityMarkingService.registrarAtividadeMarcada('revisao');
    } catch (error) {
    }
  };

  const encerrarRegistro = async () => {
    if (!registroAtivo) return;

    setSaving(true);

    // Marcar atividades pendentes como não realizadas
    const atividadesFinais = registroAtivo.atividades.map((a: any) => ({
      ...a,
      status: a.status === 'pendente' ? 'pendente' : a.status
    }));

    const dadosFinalizacao = {
      atividades: atividadesFinais,
      observacoes,
      hora_fim: new Date().toISOString(),
      status: 'concluido' as const
    };

    try {
      const resultado = await registroRevisaoService.updateRegistro(registroAtivo.id, dadosFinalizacao);

      if (resultado) {
        await activityMarkingService.limparRastreamentoCompleto();
        setRegistroAtivo(null);
        setObservacoes('');

        try {
          const registrosPendentes = await registroRevisaoService.getRegistrosPendentesRevisao(getDataAtual());
          setRegistrosCamararia(registrosPendentes);
        } catch (reloadError) {
        }

        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });

        alert('Registro de revisão encerrado com sucesso!');
      } else {
        alert('Erro ao encerrar registro');
      }
    } catch (error) {
      alert('Erro ao encerrar registro');
    } finally {
      setSaving(false);
    }
  };

  const cancelarRegistro = () => {
    if (confirm('Tem certeza que deseja cancelar? Todos os dados serão perdidos.')) {
      setSaving(true);
      
      const cancelarAsync = async () => {
        try {
          // Salvar cancelamento para auditoria
          const cancelamentoData = {
            tipo: 'registro_revisao',
            usuario_id: user?.id || '',
            data_hora: new Date().toISOString(),
            registro_id: registroAtivo.id,
            suite_id: registroAtivo.suite_id,
            motivo: 'Cancelamento manual pelo usuário'
          };
          
          await cancelamentoService.saveCancelamento(cancelamentoData);
          
          // Excluir o registro
          const sucesso = await registroRevisaoService.deleteRegistro(registroAtivo.id);
          if (sucesso) {
            await activityMarkingService.limparRastreamentoCompleto();
            setRegistroAtivo(null);
            setObservacoes('');
            alert('Registro cancelado e salvo na auditoria!');
          } else {
            alert('Erro ao cancelar registro');
          }
        } catch (error) {
          alert('Erro ao cancelar registro');
        } finally {
          setSaving(false);
        }
      };
      
      cancelarAsync();
    }
  };

  const visualizarRegistroCamararia = (registro: any) => {
    setRegistroSelecionado(registro);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'realizada':
        return <CheckSquare className="w-5 h-5 text-green-600" />;
      case 'pendente':
        return <Square className="w-5 h-5 text-gray-400" />;
      default:
        return <Square className="w-5 h-5 text-gray-400" />;
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

  const getSuiteNome = (suiteId: string) => {
    const suite = suites.find(s => s.id === suiteId);
    return suite ? `Suíte ${suite.name}` : 'Suíte não encontrada';
  };

  const getUsuarioNome = (usuarioId: string) => {
    const usuario = usuarios.find(u => u.id === usuarioId);
    return usuario?.name || 'Usuário não encontrado';
  };

  const getAtividadeNome = (atividadeId: string) => {
    // Buscar em todas as atividades carregadas, não apenas as de revisão
    const atividade = todasAtividades.find(a => a.id === atividadeId);
    return atividade?.name || 'Atividade não encontrada';
  };

  const getTipoServicoLabel = (tipo: string) => {
    switch (tipo) {
      case 'suite_livre': return 'Suíte Livre';
      case 'permanencia': return 'Permanência';
      case 'check_out': return 'Check-out';
      default: return tipo;
    }
  };

  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const tempoDecorrido = registroAtivo ? 
    Math.floor((Date.now() - new Date(registroAtivo.hora_inicio).getTime()) / (1000 * 60)) : 0;

  // Calcular progresso e frase motivacional
  const progressPercentage = registroAtivo ? 
    Math.round((registroAtivo.atividades.filter((a: any) => a.status === 'realizada').length / registroAtivo.atividades.length) * 100) : 0;
  
  const motivationalPhrase = getRandomMotivationalPhrase(progressPercentage, registroAtivo?.id, user?.name);
  const motivationalTextColor = getMotivationalColor(progressPercentage);
  const motivationalBgColor = getMotivationalBgColor(progressPercentage);

  // Hook para rastrear conquistas
  const { currentAchievement, dismissAchievement } = useAchievementTracker({
    currentPercentage: progressPercentage,
    userName: user?.name,
    registroId: registroAtivo?.id,
    enabled: !!registroAtivo
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative min-h-screen">
      {/* Modal de Conquista */}
      <AchievementModal
        isOpen={!!currentAchievement}
        onClose={dismissAchievement}
        percentage={currentAchievement?.percentage || 0}
        message={getRandomMotivationalPhrase(
          currentAchievement?.percentage || 0,
          registroAtivo?.id,
          user?.name
        )}
      />

      {/* Modal de Registro Antigo */}
      {showOldRecordModal && oldRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Registro Anterior Encontrado</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Você possui um registro de revisão em andamento de {oldRecord.data}. O que deseja fazer?
              </p>
              <div className="space-y-3">
                <button
                  onClick={continuarRegistroAntigo}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Continuar Registro Anterior
                </button>
                <button
                  onClick={finalizarRegistroAntigo}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:bg-gray-400"
                >
                  {saving ? 'Finalizando...' : 'Finalizar Registro Anterior'}
                </button>
                <button
                  onClick={cancelarRegistroAntigo}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:bg-gray-400"
                >
                  {saving ? 'Cancelando...' : 'Cancelar Registro Anterior'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de Progresso Fixo */}
      {registroAtivo && (
        <div className={`fixed top-[60px] lg:top-0 left-0 right-0 z-[50] bg-white shadow-lg border-b border-gray-200 space-y-2 transition-all duration-300 ${
          isCollapsed ? 'lg:left-20' : 'lg:left-72'
        }`}>
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-gray-800">Revisão</span>
                </div>
                <div className="text-sm text-gray-600">
                  {getSuiteNome(registroAtivo.suite_id)}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-lg font-bold text-yellow-600">
                    {progressPercentage}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {registroAtivo.atividades.filter((a: any) => a.status === 'realizada').length}/{registroAtivo.atividades.length} concluídas
                  </div>
                </div>
                
                <div className="w-32 bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-yellow-600 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${progressPercentage}%` 
                    }}
                  ></div>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{Math.floor((Date.now() - new Date(registroAtivo.hora_inicio).getTime()) / (1000 * 60))} min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Espaçamento para o indicador fixo */}
      {registroAtivo && <div className="h-16"></div>}
      
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Novo Registro - Revisão</h1>
        <p className="text-gray-600">Revise os registros da camararia ou crie novos registros de revisão</p>
      </div>

      {/* Data Atual */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Data do Registro</h2>
              <p className="text-gray-600 capitalize">{dataAtual}</p>
            </div>
          </div>
          
          {registroAtivo && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Tempo decorrido: {tempoDecorrido} min</span>
            </div>
          )}

          {!registroAtivo && (
            <button
              onClick={() => setShowNovoRegistro(true)}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 flex items-center space-x-2 transition-colors duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Registro</span>
            </button>
          )}
        </div>
      </div>

      {/* Registros da Camararia para Revisão */}
      {!registroAtivo && !showNovoRegistro && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Registros da Camararia para Revisão</h3>
            <p className="text-sm text-gray-600">{registrosCamararia.length} registros concluídos hoje</p>
          </div>

          <div className="p-6">
            {registrosCamararia.length > 0 ? (
              <div className="space-y-4">
                {registrosCamararia.map((registro) => (
                  <div key={registro.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Home className="w-4 h-4 text-yellow-600" />
                          <span className="font-medium text-gray-800">{getSuiteNome(registro.suite_id)}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            {getTipoServicoLabel(registro.tipo_servico)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{getUsuarioNome(registro.usuario_id)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(registro.hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => visualizarRegistroCamararia(registro)}
                          className="px-3 py-1 text-blue-600 hover:bg-blue-100 rounded text-sm transition-colors duration-200"
                        >
                          <Eye className="w-4 h-4 inline mr-1" />
                          Visualizar
                        </button>
                        <button 
                          onClick={() => iniciarRegistroExistente(registro)}
                          disabled={saving}
                          className={`px-3 py-1 rounded text-sm transition-colors duration-200 ${
                            saving 
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-yellow-600 text-white hover:bg-yellow-700'
                          }`}
                        >
                          <Play className="w-4 h-4 inline mr-1" />
                          Iniciar Revisão
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Bed className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum registro da camararia hoje</h3>
                <p className="text-gray-600">Não há registros concluídos da camararia para revisar</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Visualização do Registro da Camararia */}
      {registroSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Registro da Camararia - {getSuiteNome(registroSelecionado.suite_id)}
                </h3>
                <button
                  onClick={() => setRegistroSelecionado(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Funcionário:</span>
                  <p className="text-gray-600">{getUsuarioNome(registroSelecionado.usuario_id)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Tipo de Serviço:</span>
                  <p className="text-gray-600">{getTipoServicoLabel(registroSelecionado.tipo_servico)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Hora Início:</span>
                  <p className="text-gray-600">{new Date(registroSelecionado.hora_inicio).toLocaleTimeString('pt-BR')}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Hora Fim:</span>
                  <p className="text-gray-600">{new Date(registroSelecionado.hora_fim).toLocaleTimeString('pt-BR')}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Atividades Realizadas:</h4>
                <div className="space-y-2">
                  {registroSelecionado.atividades.map((atividade: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      {atividade.status === 'realizada' ? (
                        <CheckSquare className="w-4 h-4 text-green-600" />
                      ) : (
                        <Square className="w-4 h-4 text-red-600" />
                      )}
                      <span className={atividade.status === 'realizada' ? 'text-gray-800' : 'text-red-600'}>
                        {getAtividadeNome(atividade.atividade_id || atividade.atividadeId)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({atividade.status === 'realizada' ? 'Realizada' : 
                          atividade.status === 'nao_realizada' ? 'Não Realizada' : 'Pendente'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {registroSelecionado.observacoes && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Observações:</h4>
                  <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded">{registroSelecionado.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formulário Novo Registro */}
      {showNovoRegistro && !registroAtivo && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Novo Registro de Revisão</h3>
            <p className="text-sm text-gray-600 mt-1">Tipo de Serviço: Suíte Livre</p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Home className="w-4 h-4 inline mr-1" />
                Selecionar Suíte *
              </label>
              <div className="relative">
                <select
                  value={suiteSelecionada}
                  onChange={(e) => setSuiteSelecionada(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none"
                  required
                >
                  <option value="">Selecione uma suíte</option>
                  {suites.map(suite => (
                    <option key={suite.id} value={suite.id}>
                      Suíte {suite.name} - {suite.type}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Este registro será automaticamente configurado como revisão de suíte livre
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowNovoRegistro(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={iniciarNovoRegistro}
                disabled={!suiteSelecionada || saving}
                className={`flex-1 px-4 py-2 rounded-md flex items-center justify-center space-x-2 transition-colors duration-200 ${
                  suiteSelecionada && !saving
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>{saving ? 'Iniciando...' : 'Iniciar Registro'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Atividades de Revisão */}
      {registroAtivo && (
        <>
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Atividades de Revisão</h3>
              <p className="text-sm text-gray-600">
                {getSuiteNome(registroAtivo.suite_id)} - Clique nas atividades para marcar como realizadas
              </p>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {atividades.map((atividade) => {
                  const atividadeStatus = registroAtivo.atividades.find(
                    (a: any) => a.atividade_id === atividade.id
                  )?.status || 'pendente';

                  return (
                    <button
                      key={atividade.id}
                      onClick={() => toggleAtividade(atividade.id)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 hover:shadow-md ${getStatusColor(atividadeStatus)}`}
                    >
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(atividadeStatus)}
                        <div className="flex-1">
                          <h4 className="font-medium">{atividade.name}</h4>
                          {atividade.description && (
                            <p className="text-sm text-gray-600 mt-1">{atividade.description}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Observações</h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Observações da Revisão
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  rows={4}
                  placeholder="Escreva observações sobre a revisão realizada..."
                />
              </div>

              {/* Botão Encerrar */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  <button
                    onClick={cancelarRegistro}
                    disabled={saving}
                    className={`flex-1 px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors duration-200 ${
                      saving 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gray-500 text-white hover:bg-gray-600'
                    }`}
                  >
                    <X className="w-5 h-5" />
                    <span>{saving ? 'Cancelando...' : 'Cancelar Registro'}</span>
                  </button>
                  <button
                    onClick={encerrarRegistro}
                    disabled={saving}
                    className={`flex-1 px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors duration-200 ${
                      saving 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    <Save className="w-5 h-5" />
                    <span>{saving ? 'Encerrando...' : 'Encerrar Registro'}</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  O registro será salvo com todas as atividades marcadas
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NovoRegistroRevisao;