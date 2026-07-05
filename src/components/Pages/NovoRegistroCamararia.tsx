import React, { useState, useEffect } from 'react';
import { atividadeService, registroCamarariaService, suiteService, cancelamentoService, usuarioService } from '../../services/supabaseService';
import { supabase } from '../../lib/supabase';
import { activityMarkingService } from '../../services/activityMarkingService';
import { getDataAtual, getDataHoraAtual } from '../../utils/dateUtils';
import { formatarData } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import {
  Calendar,
  Play,
  Square,
  CheckSquare,
  FileText,
  Clock,
  Save,
  AlertCircle,
  Home,
  ChevronDown,
  X,
  User
} from 'lucide-react';
import { getRandomMotivationalPhrase, getMotivationalColor, getMotivationalBgColor } from '../../utils/motivationalPhrases';
import { useAchievementTracker } from '../../hooks/useAchievementTracker';
import AchievementModal from '../common/AchievementModal';

const NovoRegistroCamararia: React.FC = () => {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const [registroAtivo, setRegistroAtivo] = useState<any>(null);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [suites, setSuites] = useState<any[]>([]);
  const [servicosCamararia, setServicosCamararia] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suiteSelecionada, setSuiteSelecionada] = useState('');
  const [tipoServico, setTipoServico] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [showOldRecordModal, setShowOldRecordModal] = useState(false);
  const [oldRecord, setOldRecord] = useState<any>(null);
  const [registrosAntigos, setRegistrosAntigos] = useState<any[]>([]);
  const [registrosProgramados, setRegistrosProgramados] = useState<any[]>([]);

  // Mapeamento de nomes de serviços para valores do enum
  const mapearServicoParaEnum = (nomeServico: string): string => {
    const nomeNormalizado = nomeServico.toLowerCase().trim();

    // Mapeamento explícito para valores do enum tipo_servico_enum
    const mapeamentos: Record<string, string> = {
      // Check-in variations
      'check-in': 'check_in',
      'checkin': 'check_in',
      'check in': 'check_in',
      'chegada': 'check_in',
      'entrada': 'check_in',

      // Check-out variations
      'check-out': 'check_out',
      'checkout': 'check_out',
      'check out': 'check_out',
      'saida': 'check_out',
      'saída': 'check_out',

      // Permanência variations
      'permanencia': 'permanencia',
      'permanência': 'permanencia',

      // Suíte livre variations
      'suite livre': 'suite_livre',
      'suite_livre': 'suite_livre',
      'suitelivre': 'suite_livre',
      'livre': 'suite_livre'
    };

    // Verificar se há mapeamento direto
    if (mapeamentos[nomeNormalizado]) {
      return mapeamentos[nomeNormalizado];
    }

    // Fallback: converter para snake_case se não houver mapeamento direto
    const fallback = nomeNormalizado
      .replace(/[áàâãä]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôõö]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '_') // Substitui espaços por underscore
      .replace(/_+/g, '_') // Remove underscores duplicados
      .replace(/^_|_$/g, ''); // Remove underscores no início/fim

    // Verificar se o fallback é um valor válido do enum
    const valoresValidosEnum = ['check_in', 'check_out', 'permanencia', 'suite_livre'];
    if (valoresValidosEnum.includes(fallback)) {
      return fallback;
    }

    // Se nada funcionar, retornar suite_livre como padrão
    return 'suite_livre';
  };

  // Função para ordenar suítes alfabeticamente (com tratamento numérico inteligente)
  const ordenarSuites = (suitesArray: any[]) => {
    return [...suitesArray].sort((a, b) => {
      const nomeA = a.name?.toString() || '';
      const nomeB = b.name?.toString() || '';

      return nomeA.localeCompare(nomeB, 'pt-BR', {
        numeric: true,
        sensitivity: 'base'
      });
    });
  };

  // Filtrar atividades baseado no tipo de serviço
  const atividadesFiltradas = React.useMemo(() => {
    // PRIORIDADE 1: Se há registro ativo com atividades, carregar baseado no registro
    if (registroAtivo && registroAtivo.atividades && registroAtivo.atividades.length > 0) {
      const idsAtividades = registroAtivo.atividades.map((a: any) => a.atividade_id);
      const atividadesDoRegistro = atividades.filter(atividade =>
        idsAtividades.includes(atividade.id)
      );
      return atividadesDoRegistro;
    }
    
    // PRIORIDADE 2: Para novos registros, filtrar por serviço
    if (!servicosCamararia.length) return atividades; // Se não há serviços cadastrados, mostrar todas
    
    if (!registroAtivo) {
      // Se não há registro ativo, usar o tipo selecionado no formulário
      if (tipoServico) {
        // Encontrar o serviço selecionado
        const servicoSelecionado = servicosCamararia.find(s => 
          mapearServicoParaEnum(s.nome) === tipoServico
        );
        
        if (servicoSelecionado) {
          // Filtrar atividades que têm este serviço vinculado
          return atividades.filter(a => 
            a.servicos_camararia && 
            Array.isArray(a.servicos_camararia) && 
            a.servicos_camararia.includes(servicoSelecionado.id)
          );
        }
      }
      return [];
    } else {
      return atividades; // Fallback para mostrar todas se não conseguir filtrar
    }
  }, [atividades, tipoServico, registroAtivo, servicosCamararia]);

  // Ordenar suítes alfabeticamente
  const suitesOrdenadas = React.useMemo(() => {
    return ordenarSuites(suites);
  }, [suites]);

  // Ordenar registros programados alfabeticamente pelo nome da suíte
  const registrosProgramadosOrdenados = React.useMemo(() => {
    return [...registrosProgramados].sort((a, b) => {
      const suiteA = suites.find(s => s.id === a.suite_id);
      const suiteB = suites.find(s => s.id === b.suite_id);

      const nomeA = suiteA?.name?.toString() || '';
      const nomeB = suiteB?.name?.toString() || '';

      return nomeA.localeCompare(nomeB, 'pt-BR', {
        numeric: true,
        sensitivity: 'base'
      });
    });
  }, [registrosProgramados, suites]);

  useEffect(() => {
    carregarDados();
  }, [user]);

  const carregarServicosCamararia = async () => {
    try {
      // Obter empresa_id do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setServicosCamararia([]);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        setServicosCamararia([]);
        return;
      }

      const { data, error } = await supabase
        .from('servicos_camararia')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .eq('ativo', true)
        .order('nome');

      if (error) {
        setServicosCamararia([]);
      } else {
        setServicosCamararia(data || []);
      }
    } catch (error) {
      setServicosCamararia([]);
    }
  };

  const carregarRegistrosProgramados = async () => {
    if (!user) return;

    try {
      const dataHoje = getDataAtual();
      const { data, error } = await supabase
        .from('registros_camararia')
        .select('*')
        .eq('data', dataHoje)
        .eq('status', 'programado')
        .order('hora_inicio');

      if (error) {
        console.error('Erro ao carregar registros programados:', error);
        setRegistrosProgramados([]);
      } else {
        setRegistrosProgramados(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar registros programados:', error);
      setRegistrosProgramados([]);
    }
  };

  const iniciarRegistroProgramado = async (registro: any) => {
    if (!user) return;

    setSaving(true);
    try {
      // Buscar atividades para o tipo de serviço
      const todasAtividadesCamararia = await atividadeService.getAtividadesByType('camararia');

      // Encontrar o serviço correspondente
      const servicoSelecionado = servicosCamararia.find(s =>
        mapearServicoParaEnum(s.nome) === registro.tipo_servico
      );

      let atividadesParaRegistro = todasAtividadesCamararia;

      if (servicoSelecionado) {
        // Filtrar atividades que têm este serviço vinculado
        atividadesParaRegistro = todasAtividadesCamararia.filter(a =>
          a.servicos_camararia &&
          Array.isArray(a.servicos_camararia) &&
          a.servicos_camararia.includes(servicoSelecionado.id)
        );
      }

      // Atualizar o registro para status "em_andamento" e adicionar atividades
      const registroAtualizado = {
        status: 'em_andamento',
        hora_inicio: getDataHoraAtual(),
        usuario_executor_id: user.id,
        atividades: atividadesParaRegistro.map(a => ({
          atividade_id: a.id,
          nome: a.name,
          status: 'pendente' as const
        })),
        observacoes: registro.observacoes ? `ORIGEM:PROGRAMADO ${registro.observacoes}` : 'ORIGEM:PROGRAMADO'
      };

      const resultado = await registroCamarariaService.updateRegistro(registro.id, registroAtualizado);

      if (resultado) {
        await activityMarkingService.registrarInicio('camararia');

        // Remover da lista de programados
        setRegistrosProgramados(prev => prev.filter(r => r.id !== registro.id));

        // Definir como registro ativo
        setRegistroAtivo({
          ...registro,
          ...registroAtualizado
        });

        setSuiteSelecionada(registro.suite_id);
        setTipoServico(registro.tipo_servico);
        setObservacoes(registroAtualizado.observacoes);
      } else {
        alert('Erro ao iniciar registro programado');
      }
    } catch (error) {
      console.error('Erro ao iniciar registro programado:', error);
      alert('Erro ao iniciar registro programado');
    } finally {
      setSaving(false);
    }
  };

  const processarProximoRegistroAntigo = async () => {
    // Remove o registro atual da lista
    const novosRegistrosAntigos = registrosAntigos.slice(1);
    setRegistrosAntigos(novosRegistrosAntigos);

    if (novosRegistrosAntigos.length > 0) {
      // Ainda há registros antigos - mostrar o próximo
      setOldRecord(novosRegistrosAntigos[0]);
      setShowOldRecordModal(true);
    } else {
      // Não há mais registros antigos - verificar se há registro da data atual
      setOldRecord(null);
      setShowOldRecordModal(false);

      // Buscar registro da data atual
      const dataAtual = getDataAtual();
      const registroAtual = await registroCamarariaService.getRegistroEmAndamento(user?.id || '', dataAtual);

      if (registroAtual) {
        setRegistroAtivo(registroAtual);
        if (registroAtual.suite_id) {
          setSuiteSelecionada(registroAtual.suite_id);
        }
        if (registroAtual.tipo_servico) {
          setTipoServico(registroAtual.tipo_servico);
        }
        setObservacoes(registroAtual.observacoes || '');
      }
    }
  };

  const carregarDados = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Carregar dados em paralelo (buscar TODOS os registros em andamento)
      const [todasAtividadesCamararia, suitesData, usuariosData, todosRegistrosEmAndamento] = await Promise.all([
        atividadeService.getAtividadesByType('camararia'),
        suiteService.getSuites(),
        usuarioService.getUsuarios(),
        registroCamarariaService.getAllRegistrosEmAndamento(user.id)
      ]);

      setAtividades(todasAtividadesCamararia);
      setSuites(suitesData);
      setUsuarios(usuariosData);

      // Carregar serviços de camararia
      await carregarServicosCamararia();

      // Carregar registros programados para hoje
      await carregarRegistrosProgramados();

      if (todosRegistrosEmAndamento && todosRegistrosEmAndamento.length > 0) {
        const dataAtual = getDataAtual();

        // Separar registros antigos dos atuais
        const registrosAntigos = todosRegistrosEmAndamento.filter(
          (reg: any) => reg.data !== dataAtual
        );
        const registroAtual = todosRegistrosEmAndamento.find(
          (reg: any) => reg.data === dataAtual
        );

        if (registrosAntigos.length > 0) {
          // Há registros de datas anteriores - mostrar modal para decisão do usuário
          // Ordenar por data (mais antigos primeiro)
          const registrosOrdenados = registrosAntigos.sort((a: any, b: any) =>
            a.data.localeCompare(b.data)
          );

          setRegistrosAntigos(registrosOrdenados);
          setOldRecord(registrosOrdenados[0]);
          setShowOldRecordModal(true);
        } else if (registroAtual) {
          // Apenas registro da data atual - carregar normalmente
          setRegistroAtivo(registroAtual);

          // Definir suite e tipo de serviço
          if (registroAtual.suite_id) {
            setSuiteSelecionada(registroAtual.suite_id);
          }
          if (registroAtual.tipo_servico) {
            setTipoServico(registroAtual.tipo_servico);
          }

          setObservacoes(registroAtual.observacoes || '');
        }
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
        status: a.status === 'pendente' ? 'nao_realizada' : a.status
      }));

      const dadosFinalizacao = {
        atividades: atividadesFinais,
        observacoes: oldRecord.observacoes || 'Registro finalizado após mudança de data',
        hora_fim: getDataHoraAtual(),
        status: 'concluido' as const
      };

      const resultado = await registroCamarariaService.updateRegistro(oldRecord.id, dadosFinalizacao);
      if (resultado) {
        await activityMarkingService.limparRastreamentoCompleto();

        alert('Registro anterior finalizado com sucesso!');
        await processarProximoRegistroAntigo();
      } else {
        alert('Erro ao finalizar registro anterior');
      }
    } catch (error) {
      alert('Erro ao finalizar registro anterior');
    } finally{
      setSaving(false);
    }
  };

  const cancelarRegistroAntigo = async () => {
    if (!oldRecord) return;

    setSaving(true);
    try {
      // Salvar cancelamento para auditoria
      const cancelamentoData = {
        tipo: 'registro_camararia',
        usuario_id: user?.id || '',
        data_hora: getDataHoraAtual(),
        registro_id: oldRecord.id,
        suite_id: oldRecord.suite_id,
        motivo: 'Cancelamento de registro de dia anterior'
      };

      await cancelamentoService.saveCancelamento(cancelamentoData);

      // Excluir o registro
      const sucesso = await registroCamarariaService.deleteRegistro(oldRecord.id);
      if (sucesso) {
        await activityMarkingService.limparRastreamentoCompleto();
        alert('Registro anterior cancelado com sucesso!');
        await processarProximoRegistroAntigo();
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

    // Verificar se há outros registros antigos pendentes
    const temOutrosRegistros = registrosAntigos.length > 1;

    // Carregar o registro antigo como ativo
    setRegistroAtivo(oldRecord);
    setSuiteSelecionada(oldRecord.suite_id);
    setTipoServico(oldRecord.tipo_servico);
    setObservacoes(oldRecord.observacoes || '');

    // Remover o registro atual da lista
    setRegistrosAntigos(registrosAntigos.slice(1));
    setOldRecord(null);
    setShowOldRecordModal(false);

    // Avisar se há outros registros pendentes
    if (temOutrosRegistros) {
      alert(
        `Atenção: Você ainda tem ${registrosAntigos.length - 1} registro(s) antigo(s) pendente(s).\n\n` +
        'Após concluir este registro, será necessário processar os demais.'
      );
    }
  };

  const iniciarRegistro = () => {
    if (!suiteSelecionada || !tipoServico) {
      alert('Por favor, selecione a suíte e o tipo de serviço');
      return;
    }

    setSaving(true);
    const novoRegistro = {
      data: getDataAtual(),
      suite_id: suiteSelecionada,
      tipo_servico: tipoServico,
      usuario_id: user?.id,
      usuario_executor_id: user?.id,
      hora_inicio: getDataHoraAtual(),
      atividades: atividadesFiltradas.map(a => ({
        atividade_id: a.id,
        nome: a.name,
        status: 'pendente' as const
      })),
      observacoes: '',
      fotos: [],
      status: 'em_andamento' as const
    };

    registroCamarariaService.saveRegistro(novoRegistro).then(resultado => {
      if (resultado) {
        setRegistroAtivo(resultado);
      } else {
        alert('Erro ao iniciar registro');
      }
      setSaving(false);
    });
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

    // Salvar no Supabase
    registroCamarariaService.updateRegistro(registroAtivo.id, {
      atividades: atividadesAtualizadas,
      observacoes
    });

    await activityMarkingService.registrarAtividadeMarcada('camararia');
  };

  const encerrarRegistro = async () => {
    if (!registroAtivo) return;

    setSaving(true);
    try {
      // Marcar atividades pendentes como não realizadas
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

      const resultado = await registroCamarariaService.updateRegistro(registroAtivo.id, dadosFinalizacao);
      if (resultado) {
        await activityMarkingService.limparRastreamentoCompleto();

        setRegistroAtivo(null);
        setSuiteSelecionada('');
        setTipoServico('');
        setObservacoes('');

        // Scroll suave para o topo da página
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });

        alert('Registro encerrado com sucesso!');

        // Verificar se ainda há registros antigos pendentes
        if (registrosAntigos.length > 0) {
          setOldRecord(registrosAntigos[0]);
          setShowOldRecordModal(true);
        }
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
          // Verificar se o registro foi originalmente programado
          // Um registro é considerado programado se tem a marca "ORIGEM:PROGRAMADO" nas observações
          const foiProgramado = registroAtivo.observacoes &&
                                registroAtivo.observacoes.includes('ORIGEM:PROGRAMADO');

          if (foiProgramado) {
            // Se foi programado, voltar ao status programado
            
            // Limpar a marca de origem das observações
            const observacoesLimpas = registroAtivo.observacoes
              .replace('ORIGEM:PROGRAMADO', '')
              .trim();
            
            const resultado = await registroCamarariaService.updateRegistro(registroAtivo.id, {
              status: 'programado',
              hora_inicio: `${registroAtivo.data}T00:00:00.000Z`,
              atividades: [],
              observacoes: observacoesLimpas
            });

            if (resultado) {
              setRegistroAtivo(null);
              setSuiteSelecionada('');
              setTipoServico('');
              setObservacoes('');
              alert('Registro cancelado! Voltou para a lista de programações.');

              // Verificar se ainda há registros antigos pendentes
              if (registrosAntigos.length > 0) {
                setOldRecord(registrosAntigos[0]);
                setShowOldRecordModal(true);
              }
            } else {
              alert('Erro ao cancelar registro');
            }
          } else {
            // Se foi criado manualmente, excluir completamente
            const cancelamentoData = {
              tipo: 'registro_camararia',
              usuario_id: user?.id || '',
              data_hora: getDataHoraAtual(),
              registro_id: registroAtivo.id,
              suite_id: registroAtivo.suite_id,
              motivo: 'Cancelamento manual pelo usuário'
            };

            await cancelamentoService.saveCancelamento(cancelamentoData);


            const sucesso = await registroCamarariaService.deleteRegistro(registroAtivo.id);
            if (sucesso) {
              await activityMarkingService.limparRastreamentoCompleto();
              setRegistroAtivo(null);
              setSuiteSelecionada('');
              setTipoServico('');
              setObservacoes('');
              alert('Registro cancelado e salvo na auditoria!');

              // Verificar se ainda há registros antigos pendentes
              if (registrosAntigos.length > 0) {
                setOldRecord(registrosAntigos[0]);
                setShowOldRecordModal(true);
              }
            } else {
              alert('Erro ao cancelar registro');
            }
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

  const getTipoServicoLabel = (tipo: string) => {
    const servico = servicosCamararia.find(s => mapearServicoParaEnum(s.nome) === tipo);
    return servico ? servico.nome : tipo;
  };

  const getSuiteNome = (suiteId: string) => {
    const suite = suites.find(s => s.id === suiteId);
    return suite ? `Suíte ${suite.name}` : 'Suíte não encontrada';
  };

  const getUsuarioNome = (usuarioId: string) => {
    const usuario = usuarios.find(u => u.id === usuarioId);
    return usuario?.name || 'Usuário não encontrado';
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
                  <Home className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-800">Camararia</span>
                </div>
                <div className="text-sm text-gray-600">
                  {getSuiteNome(registroAtivo.suite_id)} - {getTipoServicoLabel(registroAtivo.tipo_servico)}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    {progressPercentage}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {registroAtivo.atividades.filter((a: any) => a.status === 'realizada').length}/{registroAtivo.atividades.length} concluídas
                  </div>
                </div>
                
                <div className="w-32 bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-600 h-3 rounded-full transition-all duration-500 ease-out"
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
        <h1 className="text-2xl font-bold text-gray-800">Novo Registro - Camararia</h1>
        <p className="text-gray-600">Registre as atividades de limpeza das suítes</p>
      </div>

      {/* Data Atual e Seleções */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
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

        {!registroAtivo && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seleção de Suíte */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Home className="w-4 h-4 inline mr-1" />
                  Selecionar Suíte *
                </label>
                <div className="relative">
                  <select
                    value={suiteSelecionada}
                    onChange={(e) => setSuiteSelecionada(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
                    required
                  >
                    <option value="">Selecione uma suíte</option>
                    {suitesOrdenadas.map(suite => (
                      <option key={suite.id} value={suite.id}>
                        Suíte {suite.name} - {suite.type}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Tipo de Serviço */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Serviço *
                </label>
                <div className="relative">
                  <select
                    value={tipoServico}
                    onChange={(e) => setTipoServico(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
                    required
                  >
                    <option value="">Selecione o tipo</option>
                    {servicosCamararia.map(servico => (
                      <option key={servico.id} value={mapearServicoParaEnum(servico.nome)}>
                        {servico.nome}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {servicosCamararia.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Nenhum serviço de camararia cadastrado. Cadastre em Cadastros → Serviços Camararia
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={iniciarRegistro}
                disabled={!suiteSelecionada || !tipoServico}
                className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200 ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : suiteSelecionada && tipoServico
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Play className="w-5 h-5" />
                <span>{saving ? 'Iniciando...' : 'Iniciar Registro'}</span>
              </button>
            </div>
          </>
        )}

        {registroAtivo && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800">
                  {getSuiteNome(registroAtivo.suite_id)} - {getTipoServicoLabel(registroAtivo.tipo_servico)}
                </p>
                <p className="text-sm text-green-600">Registro em andamento</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Registros Programados para Hoje */}
      {!registroAtivo && registrosProgramados.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Registros Programados para Hoje
              </h3>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                {registrosProgramados.length} {registrosProgramados.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Clique em "Iniciar Registro" para começar a trabalhar
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {registrosProgramadosOrdenados.map((registro) => (
                <div
                  key={registro.id}
                  className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Home className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {getSuiteNome(registro.suite_id)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {getTipoServicoLabel(registro.tipo_servico)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <User className="w-4 h-4" />
                        <span className="font-medium">Programado por:</span>
                        <span>{getUsuarioNome(registro.usuario_id)}</span>
                      </div>
                    </div>

                    {registro.observacoes && (
                      <div className="text-xs text-gray-600 bg-white rounded p-2 border border-blue-100">
                        <p className="line-clamp-2">{registro.observacoes}</p>
                      </div>
                    )}

                    <button
                      onClick={() => iniciarRegistroProgramado(registro)}
                      disabled={saving}
                      className={`w-full mt-3 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors duration-200 ${
                        saving
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      <Play className="w-4 h-4" />
                      <span>{saving ? 'Iniciando...' : 'Iniciar Registro'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Atividades */}
      {registroAtivo && (
        <>
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Atividades da Camararia</h3>
              <p className="text-sm text-gray-600">
                Clique nas atividades para marcar como realizadas
              </p>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {atividadesFiltradas.map((atividade) => {
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
                
                {/* Aviso quando não há atividades filtradas */}
                {atividadesFiltradas.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="text-lg font-medium text-gray-800 mb-2">Nenhuma atividade vinculada</h4>
                      <p className="text-gray-600 mb-2">
                        Não há atividades cadastradas para o serviço "{getTipoServicoLabel(registroAtivo.tipo_servico)}"
                      </p>
                      <p className="text-sm text-blue-600">
                        Configure atividades específicas para este serviço em: Cadastros → Atividades Camararia
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
                  Observações do Serviço
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={4}
                  placeholder="Escreva observações sobre o serviço realizado..."
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
                {tipoServico === 'permanencia' && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {getTipoServicoLabel(tipoServico)}: Apenas atividades marcadas como permanência ({atividadesFiltradas.length} atividades)
                  </p>
                )}
                {tipoServico === 'suite_livre' && (
                  <p className="text-xs text-purple-600 mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {getTipoServicoLabel(tipoServico)}: Apenas atividades marcadas como suíte livre ({atividadesFiltradas.length} atividades)
                  </p>
                )}
                {tipoServico === 'check_out' && (
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {getTipoServicoLabel(tipoServico)}: Apenas atividades vinculadas ao check-out ({atividadesFiltradas.length} atividades)
                  </p>
                )}
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Registro Anterior Encontrado
                </h3>
                {registrosAntigos.length > 1 && (
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                    Registro 1 de {registrosAntigos.length}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 space-y-4">
              {registrosAntigos.length > 1 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800 text-sm font-medium">
                    Você tem {registrosAntigos.length} registros antigos em andamento
                  </p>
                  <p className="text-blue-700 text-xs mt-1">
                    Processando cada um por vez. Após finalizar este, o próximo será exibido automaticamente.
                  </p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm mb-2">
                  <strong>Registro em andamento do dia {formatarData(oldRecord.data)}</strong>
                </p>
                <p className="text-yellow-700 text-xs">
                  Suíte: {getSuiteNome(oldRecord.suite_id)}<br/>
                  Tipo: {getTipoServicoLabel(oldRecord.tipo_servico)}<br/>
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

export default NovoRegistroCamararia;