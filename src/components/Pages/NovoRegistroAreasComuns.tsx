import React, { useState, useEffect } from 'react';
import { atividadeService, registroAreasComunsService, cancelamentoService } from '../../services/supabaseService';
import { supabase } from '../../lib/supabase';
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
  Building,
  X,
  ChevronDown
} from 'lucide-react';
import { getRandomMotivationalPhrase, getMotivationalColor, getMotivationalBgColor } from '../../utils/motivationalPhrases';
import { useAchievementTracker } from '../../hooks/useAchievementTracker';
import AchievementModal from '../common/AchievementModal';

const NovoRegistroAreasComuns: React.FC = () => {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const [registroAtivo, setRegistroAtivo] = useState<any>(null);
  const [todasAtividades, setTodasAtividades] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [tiposAreasComuns, setTiposAreasComuns] = useState<any[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [observacoes, setObservacoes] = useState('');

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
      // PRIORIDADE 2: Para novos registros, filtrar por tipo e dia

      // Obter dia da semana atual
      const hoje = new Date().getDay(); // 0=domingo, 1=segunda...
      const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
      const diaAtual = diasSemana[hoje];

      const atividadesFiltradas = todasAtividades.filter(atividade => {
        // Verificar se a atividade está vinculada ao tipo de área comum selecionado
        const temTipoAreaComum = atividade.tipos_areas_comuns && 
                                Array.isArray(atividade.tipos_areas_comuns) && 
                                atividade.tipos_areas_comuns.includes(tipoSelecionado);
        
        // Verificar se a atividade deve ser realizada hoje
        const temDiaSemana = !atividade.dias_semana || 
                            atividade.dias_semana.length === 0 || 
                            atividade.dias_semana.includes(diaAtual);
        
        return temTipoAreaComum && temDiaSemana;
      });

      setAtividades(atividadesFiltradas);
    } else {
      setAtividades([]);
    }
  }, [tipoSelecionado, todasAtividades, registroAtivo]);

  const carregarDados = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Carregar atividades de áreas comuns
      const atividadesAreasComuns = await atividadeService.getAtividadesByType('areas_comuns');
      setTodasAtividades(atividadesAreasComuns);

      // Carregar tipos de áreas comuns da empresa do usuário
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {

        setTiposAreasComuns([]);
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', authUser.id)
        .single();

      if (userError || !userData?.empresa_id) {

        setTiposAreasComuns([]);
        setLoading(false);
        return;
      }

      const { data: tiposData, error: tiposError } = await supabase
        .from('tipos_areas_comuns')
        .select('*')
        .eq('ativo', true)
        .eq('empresa_id', userData.empresa_id)
        .order('nome');

      if (tiposError) {

        setTiposAreasComuns([]);
      } else {

        setTiposAreasComuns(tiposData || []);
      }

      // Verificar se há registro em andamento
      const registroEmAndamento = await registroAreasComunsService.getRegistroEmAndamento(user.id, getDataAtual());

      if (registroEmAndamento) {
        // Sempre carregar o registro em andamento, independente da data
        setRegistroAtivo(registroEmAndamento);
        
        // Inferir tipo baseado nas atividades do registro ou usar fallback
        if (registroEmAndamento.atividades && registroEmAndamento.atividades.length > 0) {
          const primeiraAtividade = registroEmAndamento.atividades[0];
          const atividadeCompleta = atividadesAreasComuns.find(a => a.id === primeiraAtividade.atividade_id);
          
          if (atividadeCompleta && atividadeCompleta.tipos_areas_comuns && atividadeCompleta.tipos_areas_comuns.length > 0) {
            const tipoInferido = atividadeCompleta.tipos_areas_comuns[0];

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

  const iniciarRegistro = async () => {
    if (!tipoSelecionado) {
      alert('Por favor, selecione o tipo de área comum');
      return;
    }

    if (atividades.length === 0) {
      alert('Não há atividades cadastradas para este tipo de área comum no dia de hoje');
      return;
    }

    setSaving(true);
    const novoRegistro = {
      data: getDataAtual(),
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
      const resultado = await registroAreasComunsService.saveRegistro(novoRegistro);
      if (resultado) {
        setRegistroAtivo(resultado);
        await activityMarkingService.registrarInicio('areas_comuns');
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
      await registroAreasComunsService.updateRegistro(registroAtivo.id, {
        atividades: atividadesAtualizadas,
        observacoes
      });
      await activityMarkingService.registrarAtividadeMarcada('areas_comuns');
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
      hora_fim: new Date().toISOString(),
      status: 'concluido' as const
    };

    try {
      const resultado = await registroAreasComunsService.updateRegistro(registroAtivo.id, dadosFinalizacao);
      if (resultado) {
        await activityMarkingService.limparRastreamentoCompleto();
        setRegistroAtivo(null);
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
            tipo: 'registro_areas_comuns',
            usuario_id: user?.id || '',
            data_hora: new Date().toISOString(),
            registro_id: registroAtivo.id,
            motivo: 'Cancelamento manual pelo usuário'
          };
          
          await cancelamentoService.saveCancelamento(cancelamentoData);
          
          // Excluir o registro
          const sucesso = await registroAreasComunsService.deleteRegistro(registroAtivo.id);
        if (sucesso) {
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

  const getTipoAreaComumNome = (tipoId: string) => {
    const tipo = tiposAreasComuns.find(t => t.id === tipoId);
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
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
                  <Building className="w-5 h-5 text-indigo-600" />
                  <span className="font-medium text-gray-800">Áreas Comuns</span>
                </div>
                <div className="text-sm text-gray-600">
                  {getTipoAreaComumNome(tipoSelecionado)}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-lg font-bold text-indigo-600">
                    {progressPercentage}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {registroAtivo.atividades.filter((a: any) => a.status === 'realizada').length}/{registroAtivo.atividades.length} concluídas
                  </div>
                </div>
                
                <div className="w-32 bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
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
        <h1 className="text-2xl font-bold text-gray-800">Novo Registro - Áreas Comuns</h1>
        <p className="text-gray-600">Registre as atividades de limpeza e manutenção das áreas comuns</p>
      </div>

      {/* Data Atual */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Calendar className="w-6 h-6 text-indigo-600" />
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

        {/* Seleção de Tipo de Área Comum */}
        {!registroAtivo && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building className="w-4 h-4 inline mr-1" />
              Selecione o tipo de área comum *
            </label>
            {tiposAreasComuns.length > 0 ? (
              <div className="relative">
                <select
                  value={tipoSelecionado}
                  onChange={(e) => setTipoSelecionado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  required
                >
                  <option value="">Selecione o tipo de área comum</option>
                  {tiposAreasComuns.map(tipo => (
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
                  <strong>Nenhum tipo de área comum cadastrado.</strong>
                </p>
                <p className="text-yellow-700 text-xs mt-1">
                  Cadastre tipos de áreas comuns primeiro em Cadastros → Tipos de Áreas Comuns
                </p>
              </div>
            )}
            
            {/* Mostrar quantas atividades estão disponíveis */}
            {tipoSelecionado && (
              <p className="text-sm text-gray-600 mt-2">
                {atividades.length} atividades disponíveis para {getTipoAreaComumNome(tipoSelecionado)} hoje ({new Date().toLocaleDateString('pt-BR', { weekday: 'long' })})
              </p>
            )}
          </div>
        )}

        {/* Informação do tipo selecionado quando há registro ativo */}
        {registroAtivo && (
          <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span className="font-medium text-indigo-800">
                Tipo: {getTipoAreaComumNome(tipoSelecionado)}
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
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
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
              <h3 className="text-lg font-semibold text-gray-800">Atividades das Áreas Comuns</h3>
              <p className="text-sm text-gray-600">
                {getTipoAreaComumNome(tipoSelecionado)} - Clique nas atividades para marcar como realizadas
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
                  <Building className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma atividade programada para hoje</h3>
                  <p className="text-gray-600">
                    Não há atividades de "{getTipoAreaComumNome(tipoSelecionado)}" programadas para {new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}
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
                  Observações das Atividades
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  placeholder="Escreva observações sobre as atividades das áreas comuns realizadas..."
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
    </div>
  );
};

export default NovoRegistroAreasComuns;