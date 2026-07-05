import React, { useState, useEffect } from 'react';
import { atividadeService, registroRecepcaoService, cancelamentoService } from '../../services/supabaseService';
import { supabase } from '../../lib/supabase';
import { getDataAtual, getDataHoraAtual } from '../../utils/dateUtils';
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
  X,
  ChevronDown,
  Phone
} from 'lucide-react';
import { getRandomMotivationalPhrase, getMotivationalColor, getMotivationalBgColor } from '../../utils/motivationalPhrases';
import { useAchievementTracker } from '../../hooks/useAchievementTracker';
import AchievementModal from '../common/AchievementModal';

const NovoRegistroRecepcao: React.FC = () => {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const [registroAtivo, setRegistroAtivo] = useState<any>(null);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [todasAtividades, setTodasAtividades] = useState<any[]>([]);
  const [tiposRecepcao, setTiposRecepcao] = useState<any[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [showOldRecordModal, setShowOldRecordModal] = useState(false);
  const [oldRecord, setOldRecord] = useState<any>(null);

  useEffect(() => {
    carregarDados();
  }, [user]);

  useEffect(() => {
    // Filtrar atividades quando o tipo for selecionado
    if (registroAtivo && registroAtivo.atividades && registroAtivo.atividades.length > 0) {
      // PRIORIDADE 1: Se há registro ativo, carregar atividades baseado nos IDs do registro
      const idsAtividades = registroAtivo.atividades.map((a: any) => a.atividade_id);
      const atividadesDoRegistro = todasAtividades.filter(atividade => 
        idsAtividades.includes(atividade.id)
      );
      setAtividades(atividadesDoRegistro);
    } else if (tipoSelecionado && todasAtividades.length > 0) {
      // PRIORIDADE 2: Para novos registros, filtrar por tipo
      const atividadesFiltradas = todasAtividades.filter(atividade => 
        atividade.tipos_recepcao && 
        atividade.tipos_recepcao.includes(tipoSelecionado)
      );
      setAtividades(atividadesFiltradas);
    } else {
      setAtividades([]);
    }
  }, [tipoSelecionado, todasAtividades, registroAtivo]);

  const carregarDados = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Carregar atividades de recepção e tipos de recepção
      const [atividadesRecepcao, tiposData] = await Promise.all([
        atividadeService.getAtividadesByType('recepcao'),
        carregarTiposRecepcaoComEmpresa()
      ]);

      setTodasAtividades(atividadesRecepcao);
      
      setTiposRecepcao(tiposData);

      // Verificar se há registro em andamento
      const registroEmAndamento = await registroRecepcaoService.getRegistroEmAndamento(user.id, getDataAtual());
      
      if (registroEmAndamento) {
        // Sempre carregar o registro em andamento, independente da data
        setRegistroAtivo(registroEmAndamento);
        
        // Definir tipo baseado no registro ou inferir do primeiro tipo disponível
        if (registroEmAndamento.tipo_recepcao_id && tiposData.some(t => t.id === registroEmAndamento.tipo_recepcao_id)) {
          setTipoSelecionado(registroEmAndamento.tipo_recepcao_id);
        } else if (registroEmAndamento.atividades && registroEmAndamento.atividades.length > 0) {
          // Inferir tipo baseado nas atividades do registro
          const primeiraAtividade = registroEmAndamento.atividades[0];
          const atividadeCompleta = atividadesRecepcao.find(a => a.id === primeiraAtividade.atividade_id);
          
          if (atividadeCompleta && atividadeCompleta.tipos_recepcao && atividadeCompleta.tipos_recepcao.length > 0) {
            const tipoInferido = atividadeCompleta.tipos_recepcao[0];
            setTipoSelecionado(tipoInferido);
          } else if (tiposData && tiposData.length > 0) {
            setTipoSelecionado(tiposData[0].id);
          }
        } else if (tiposData && tiposData.length > 0) {
          setTipoSelecionado(tiposData[0].id);
        }
        
        setObservacoes(registroEmAndamento.observacoes || '');
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
      const atividadesFinais = (oldRecord.atividades || []).map((a: any) => ({
        ...a,
        status: a.status === 'pendente' ? 'nao_realizada' : a.status
      }));

      const dadosFinalizacao = {
        atividades: atividadesFinais,
        observacoes: oldRecord.observacoes || 'Registro finalizado automaticamente após mudança de data',
        hora_fim: getDataHoraAtual(),
        status: 'concluido' as const
      };

      const resultado = await registroRecepcaoService.updateRegistro(oldRecord.id, dadosFinalizacao);
      if (resultado) {
        await activityMarkingService.limparRastreamentoCompleto();
        setOldRecord(null);
        setShowOldRecordModal(false);
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
        tipo: 'registro_recepcao',
        usuario_id: user?.id || '',
        data_hora: getDataHoraAtual(),
        registro_id: oldRecord.id,
        motivo: 'Cancelamento de registro de dia anterior'
      };
      
      await cancelamentoService.saveCancelamento(cancelamentoData);
      
      // Excluir o registro
      const sucesso = await registroRecepcaoService.deleteRegistro(oldRecord.id);
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
    if (oldRecord.tipo_recepcao_id) {
      setTipoSelecionado(oldRecord.tipo_recepcao_id);
    }
    setObservacoes(oldRecord.observacoes || '');
    setOldRecord(null);
    setShowOldRecordModal(false);
  };

  const carregarTiposRecepcaoComEmpresa = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {

        return [];
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {

        return [];
      }

      const { data, error } = await supabase
        .from('tipos_recepcao')
        .select('*')
        .eq('ativo', true)
        .eq('empresa_id', userData.empresa_id)
        .order('nome');

      if (error) {

        return [];
      }

      return data || [];
    } catch (error) {

      return [];
    }
  };
  
  const iniciarRegistro = async () => {
    if (!tipoSelecionado) {
      alert('Por favor, selecione o tipo de recepção');
      return;
    }

    if (atividades.length === 0) {
      alert('Não há atividades cadastradas para este tipo de recepção');
      return;
    }

    setSaving(true);
    const novoRegistro = {
      data: getDataAtual(),
      usuario_id: user?.id,
      hora_inicio: getDataHoraAtual(),
      tipo_recepcao_id: tipoSelecionado,
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
      const resultado = await registroRecepcaoService.saveRegistro(novoRegistro);
      if (resultado) {
        setRegistroAtivo(resultado);
        await activityMarkingService.registrarInicio('recepcao');
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
      await registroRecepcaoService.updateRegistro(registroAtivo.id, {
        atividades: atividadesAtualizadas,
        observacoes
      });
      await activityMarkingService.registrarAtividadeMarcada('recepcao');
    } catch (error) {
    }
  };

  const encerrarRegistro = async () => {
    if (!registroAtivo) return;

    setSaving(true);
    const atividadesFinais = registroAtivo.atividades.map((a: any) => ({
      ...a,
      status: a.status === 'pendente' ? 'nao_realizada' : a.status
    }));

    const dadosFinalizacao = {
      atividades: atividadesFinais,
      observacoes,
      hora_fim: getDataHoraAtual(),
      status: 'concluido' as const
    };

    try {
      const resultado = await registroRecepcaoService.updateRegistro(registroAtivo.id, dadosFinalizacao);
      if (resultado) {
        await activityMarkingService.limparRastreamentoCompleto();
        setRegistroAtivo(null);
        setTipoSelecionado('');
        setObservacoes('');
        alert('Registro encerrado com sucesso!');
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
            tipo: 'registro_recepcao',
            usuario_id: user?.id || '',
            data_hora: getDataHoraAtual(),
            registro_id: registroAtivo.id,
            motivo: 'Cancelamento manual pelo usuário'
          };
          
          await cancelamentoService.saveCancelamento(cancelamentoData);
          
          // Excluir o registro
          const sucesso = await registroRecepcaoService.deleteRegistro(registroAtivo.id);
          if (sucesso) {
            setRegistroAtivo(null);
            setTipoSelecionado('');
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

  const getTipoRecepcaoNome = (tipoId: string) => {
    const tipo = tiposRecepcao.find(t => t.id === tipoId);
    return tipo?.nome || 'Tipo não encontrado';
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

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const dataAtual = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const tempoDecorrido = registroAtivo ? 
    Math.floor((new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getTime() - new Date(registroAtivo.hora_inicio).getTime()) / (1000 * 60)) : 0;

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

      {/* Indicador de Progresso Fixo */}
      {registroAtivo && (
        <div className={`fixed top-[60px] lg:top-0 left-0 right-0 z-[50] bg-white shadow-lg border-b border-gray-200 space-y-2 transition-all duration-300 ${
          isCollapsed ? 'lg:left-20' : 'lg:left-72'
        }`}>
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-800">Recepção</span>
                </div>
                <div className="text-sm text-gray-600">
                  {getTipoRecepcaoNome(registroAtivo.tipo_recepcao_id || tipoSelecionado)}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {progressPercentage}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {registroAtivo.atividades.filter((a: any) => a.status === 'realizada').length}/{registroAtivo.atividades.length} concluídas
                  </div>
                </div>
                
                <div className="w-32 bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${progressPercentage}%` 
                    }}
                  ></div>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{Math.floor((new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getTime() - new Date(registroAtivo.hora_inicio).getTime()) / (1000 * 60))} min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Espaçamento para o indicador fixo */}
      {registroAtivo && <div className="h-16"></div>}
      
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Novo Registro - Recepção</h1>
        <p className="text-gray-600">Registre as atividades diárias da recepção</p>
      </div>

      {/* Data Atual */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
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
        </div>

        {/* Seleção de Tipo de Recepção */}
        {!registroAtivo && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Selecione seu turno *
            </label>
            {tiposRecepcao.length > 0 ? (
              <div className="relative">
                <select
                  value={tipoSelecionado}
                  onChange={(e) => setTipoSelecionado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  required
                >
                  <option value="">Selecione o tipo de recepção</option>
                  {tiposRecepcao.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Nenhum tipo de recepção cadastrado.</strong>
                </p>
                <p className="text-yellow-700 text-xs mt-1">
                  Cadastre tipos de recepção primeiro em Cadastros → Tipos de Recepção
                </p>
              </div>
            )}
            
            {/* Mostrar quantas atividades estão disponíveis */}
            {tipoSelecionado && (
              <p className="text-sm text-gray-600 mt-2">
                {atividades.length} atividades disponíveis para {getTipoRecepcaoNome(tipoSelecionado)}
              </p>
            )}
          </div>
        )}

        {/* Informação do tipo selecionado quando há registro ativo */}
        {registroAtivo && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">
                Turno: {getTipoRecepcaoNome(registroAtivo.tipo_recepcao_id || tipoSelecionado)}
              </span>
            </div>
          </div>
        )}

        {!registroAtivo && (
          <div className="mt-4">
            <button
              onClick={iniciarRegistro}
              disabled={saving || !tipoSelecionado}
              className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200 ${
                saving || !tipoSelecionado
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Play className="w-5 h-5" />
              <span>{saving ? 'Iniciando...' : 'Iniciar Registro'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Lista de Atividades */}
      {registroAtivo && (
        <>
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Atividades da Recepção</h3>
              <p className="text-sm text-gray-600">
                {getTipoRecepcaoNome(registroAtivo.tipo_recepcao_id || tipoSelecionado)} - Clique nas atividades para marcar como realizadas
              </p>
            </div>

            <div className="p-6">
              {atividades.length > 0 ? (
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
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Phone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma atividade vinculada</h3>
                  <p className="text-gray-600">
                    Não há atividades cadastradas para o tipo "{getTipoRecepcaoNome(registroAtivo.tipo_recepcao_id || tipoSelecionado)}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Observações e Fotos */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Observações</h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Observações do Dia
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Escreva observações sobre as atividades realizadas hoje..."
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
                  Atividades não marcadas serão registradas como "não realizadas"
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal para Registro de Dia Anterior */}
      {showOldRecordModal && oldRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Registro Anterior Encontrado
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm mb-2">
                  <strong>Você tem um registro em andamento do dia {formatarData(oldRecord.data)}</strong>
                </p>
                <p className="text-yellow-700 text-xs">
                  Tipo: {getTipoRecepcaoNome(oldRecord.tipo_recepcao_id)}<br/>
                  Iniciado em: {new Date(oldRecord.hora_inicio).toLocaleString('pt-BR')}<br/>
                  Atividades: {(oldRecord.atividades || []).filter((a: any) => a.status === 'realizada').length}/{(oldRecord.atividades || []).length} realizadas
                </p>
              </div>

              <p className="text-gray-600 text-sm">
                O que você gostaria de fazer com este registro?
              </p>

              <div className="space-y-3">
                <button
                  onClick={continuarRegistroAntigo}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Continuar Registro Anterior
                </button>
                
                <button
                  onClick={finalizarRegistroAntigo}
                  disabled={saving}
                  className={`w-full px-4 py-2 rounded-lg transition-colors duration-200 ${
                    saving 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {saving ? 'Finalizando...' : 'Finalizar Registro Anterior'}
                </button>
                
                <button
                  onClick={cancelarRegistroAntigo}
                  disabled={saving}
                  className={`w-full px-4 py-2 rounded-lg transition-colors duration-200 ${
                    saving 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {saving ? 'Cancelando...' : 'Cancelar Registro Anterior'}
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Você precisa decidir o que fazer com o registro anterior antes de iniciar um novo
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NovoRegistroRecepcao;