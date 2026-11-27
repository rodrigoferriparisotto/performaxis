import React, { useState, useEffect } from 'react';
import { atividadeService, registroCamarariaService, suiteService, cancelamentoService, usuarioService, obterContextoUsuario } from '../../services/supabaseService';
import { supabase } from '../../lib/supabase';
import { todasPaginas } from '../../lib/paginacao';
import { activityMarkingService } from '../../services/activityMarkingService';
import { getDataAtual, getDataHoraAtual } from '../../utils/dateUtils';
import { formatarData } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import {
  Calendar,
  Play,
  Square,
  MinusSquare,
  CheckSquare,
  FileText,
  Clock,
  Save,
  AlertCircle,
  Home,
  ChevronDown,
  X,
  DoorOpen
} from 'lucide-react';
import { getRandomMotivationalPhrase, getMotivationalColor, getMotivationalBgColor } from '../../utils/motivationalPhrases';
import { useAchievementTracker } from '../../hooks/useAchievementTracker';
import AchievementModal from '../common/AchievementModal';
import { notificar, confirmar } from '../../lib/feedback';
import { ActiveRecordBar } from '../ui/ActiveRecordBar';
import { nomeSuite } from '../../utils/nomeSuite';
import { ordenarRotina, atividadeValeHoje } from '../../utils/rotina';
import { HorarioItem } from '../common/HorarioItem';
import { revisarEncerramento } from '../../lib/encerramento';
import { progressoChecklist, alternarRealizada, alternarNaoAplicavel } from '../../lib/checklist';
import { BotaoNaoSeAplica } from '../common/BotaoNaoSeAplica';
import { BotaoObjetoEsquecido } from '../common/ObjetosEsquecidos';
import { ResumoSuitesDia } from '../common/ResumoSuitesDia';

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
  // registro sem programação: fechado quando há suítes programadas (abre ao tocar)
  const [avulsoAberto, setAvulsoAberto] = useState(false);
  const formAvulsoVisivel = avulsoAberto || registrosProgramados.length === 0;
  // recepção e gestão marcam "Quarto liberado" direto no quadro da suíte
  const podeLiberarQuarto = ['recepcao', 'gestor', 'admin'].includes(user?.profile || '');
  const [liberando, setLiberando] = useState<string | null>(null);

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
    
    // PRIORIDADE 2: Para novos registros, filtrar pelo dia da semana e pelo serviço
    const atividadesDoDia = atividades.filter((a) => atividadeValeHoje(a));
    if (!servicosCamararia.length) return atividadesDoDia; // Se não há serviços cadastrados, mostrar todas do dia
    
    if (!registroAtivo) {
      // Se não há registro ativo, usar o tipo selecionado no formulário
      if (tipoServico) {
        // Encontrar o serviço selecionado
        const servicoSelecionado = servicosCamararia.find(s => 
          mapearServicoParaEnum(s.nome) === tipoServico
        );
        
        if (servicoSelecionado) {
          // Filtrar atividades que têm este serviço vinculado
          return atividadesDoDia.filter(a =>
            a.servicos_camararia && 
            Array.isArray(a.servicos_camararia) && 
            a.servicos_camararia.includes(servicoSelecionado.id)
          );
        }
      }
      return [];
    } else {
      return atividadesDoDia; // Fallback para mostrar todas do dia se não conseguir filtrar
    }
  }, [atividades, tipoServico, registroAtivo, servicosCamararia]);

  // Ordenar suítes alfabeticamente
  const suitesOrdenadas = React.useMemo(() => {
    return ordenarSuites(suites);
  }, [suites]);

  // Quartos liberados pela recepção primeiro; depois pelo nome da suíte
  const registrosProgramadosOrdenados = React.useMemo(() => {
    return [...registrosProgramados].sort((a, b) => {
      if (!!a.quarto_liberado_em !== !!b.quarto_liberado_em) return a.quarto_liberado_em ? -1 : 1;
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

  // a recepção marca "Quarto liberado": atualiza a lista do dia a cada minuto enquanto não há registro aberto
  useEffect(() => {
    if (registroAtivo) return;
    const t = setInterval(() => carregarRegistrosProgramados(), 60_000);
    return () => clearInterval(t);
  }, [registroAtivo, user]);

  const carregarServicosCamararia = async () => {
    try {
      // Obter empresa_id do usuário atual
      const { user, userData, userError } = await obterContextoUsuario();
      if (!user) {
        setServicosCamararia([]);
        return;
      }


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
      // programação do dia de hotel grande chega perto de 1.000: busca todas as páginas
      const data = await todasPaginas((de, ate) =>
        supabase
          .from('registros_camararia')
          .select('*')
          .eq('data', dataHoje)
          .eq('status', 'programado')
          .order('hora_inicio')
          .order('id')
          .range(de, ate)
      );
      setRegistrosProgramados(data);
    } catch (error) {
      console.error('Erro ao carregar registros programados:', error);
      setRegistrosProgramados([]);
    }
  };

  const alternarQuartoLiberado = async (registro: any) => {
    const liberar = !registro.quarto_liberado_em;
    if (!liberar && !(await confirmar(`Desfazer "Quarto liberado" da ${getSuiteNome(registro.suite_id)}?`))) return;
    setLiberando(registro.id);
    const { data, error } = await supabase.rpc('marcar_quarto_liberado', { p_registro: registro.id, p_liberado: liberar });
    setLiberando(null);
    if (error) {
      notificar('Não foi possível salvar. Verifique a conexão.', 'erro');
      return;
    }
    setRegistrosProgramados((lista) =>
      lista.map((r) => (r.id === registro.id ? { ...r, quarto_liberado_em: data || null } : r))
    );
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

      const atividadesDoDia = todasAtividadesCamararia.filter((a: any) => atividadeValeHoje(a));
      let atividadesParaRegistro = atividadesDoDia;

      if (servicoSelecionado) {
        // Filtrar atividades que têm este serviço vinculado
        atividadesParaRegistro = atividadesDoDia.filter(a =>
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
        tipo_servico: registro.tipo_servico,
        observacoes: registro.observacoes ? `ORIGEM:PROGRAMADO ${registro.observacoes}` : 'ORIGEM:PROGRAMADO'
      };

      // claim atômico: se outra camareira assumiu esta suíte no mesmo instante,
      // volta null e avisamos em vez de sobrescrever o registro dela
      const { registro: resultado, conflito } = await registroCamarariaService.claimRegistroProgramado(
        registro.id,
        registroAtualizado
      );

      if (!resultado) {
        notificar(
          conflito
            ? 'Esta suíte acabou de ser assumida por outra pessoa. A lista será atualizada.'
            : 'Não foi possível iniciar esta suíte agora. Verifique a internet e tente de novo.',
          conflito ? 'aviso' : 'erro'
        );
        await carregarRegistrosProgramados();
        return;
      }

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
        notificar('Erro ao iniciar registro programado');
      }
    } catch (error) {
      console.error('Erro ao iniciar registro programado:', error);
      notificar('Erro ao iniciar registro programado');
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

      setAtividades(ordenarRotina(todasAtividadesCamararia));
      setSuites(suitesData);
      setUsuarios(usuariosData);

      // Carregar serviços de governança
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
      notificar('Erro ao carregar dados. Tente novamente.');
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

        notificar('Registro anterior finalizado com sucesso!');
        await processarProximoRegistroAntigo();
      } else {
        notificar('Erro ao finalizar registro anterior');
      }
    } catch (error) {
      notificar('Erro ao finalizar registro anterior');
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
        notificar('Registro anterior cancelado com sucesso!');
        await processarProximoRegistroAntigo();
      } else {
        notificar('Erro ao cancelar registro anterior');
      }
    } catch (error) {
      notificar('Erro ao cancelar registro anterior');
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
      notificar(
        `Atenção: Você ainda tem ${registrosAntigos.length - 1} registro(s) antigo(s) pendente(s).\n\n` +
        'Após concluir este registro, será necessário processar os demais.'
      );
    }
  };

  const iniciarRegistro = () => {
    if (!suiteSelecionada || !tipoServico) {
      notificar('Por favor, selecione a suíte e o tipo de serviço');
      return;
    }

    // suíte já programada para hoje: usa a programação em vez de criar outro
    // registro (senão a programação fica como "não executada" e duplica)
    const programada = registrosProgramados.find((r) => r.suite_id === suiteSelecionada);
    if (programada) {
      iniciarRegistroProgramado({ ...programada, tipo_servico: tipoServico });
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
        notificar('Erro ao iniciar registro');
      }
      setSaving(false);
    });
  };

  const toggleAtividade = async (atividadeId: string, proximoStatus: (status: string) => string = alternarRealizada) => {
    if (!registroAtivo) return;

    const atividadesAtualizadas = registroAtivo.atividades.map((a: any) => {
      if (a.atividade_id === atividadeId) {
        return {
          ...a,
          status: proximoStatus(a.status)
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

    // Salvar no Supabase — se falhar, desfaz o check na tela e avisa
    // (antes a falha passava em silêncio e a marcação se perdia)
    const salvo = await registroCamarariaService.updateRegistro(registroAtivo.id, {
      atividades: atividadesAtualizadas,
      observacoes
    });

    if (!salvo) {
      setRegistroAtivo(registroAtivo);
      notificar('Não foi possível salvar a marcação. Verifique sua conexão e tente novamente.');
      return;
    }

    await activityMarkingService.registrarAtividadeMarcada('camararia');
  };

  const encerrarRegistro = async () => {
    if (!registroAtivo) return;

    // conferência: registro rápido (pergunta o tempo real) e itens não feitos (observação final)
    const conferencia = await revisarEncerramento({
      horaInicio: registroAtivo.hora_inicio,
      itensNaoFeitos: progressoChecklist(registroAtivo.atividades).pendentes,
      observacao: observacoes,
    });
    if (!conferencia) return;

    setSaving(true);
    try {
      // Marcar atividades pendentes como não realizadas
      const atividadesFinais = registroAtivo.atividades.map((a: any) => ({
        ...a,
        status: a.status === 'pendente' ? 'nao_realizada' : a.status
      }));

      const dadosFinalizacao = {
        atividades: atividadesFinais,
        observacoes: conferencia.observacao,
        minutos_informados: conferencia.minutosInformados,
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

        notificar('Registro encerrado com sucesso!');

        // Verificar se ainda há registros antigos pendentes
        if (registrosAntigos.length > 0) {
          setOldRecord(registrosAntigos[0]);
          setShowOldRecordModal(true);
        }
      } else {
        notificar('Erro ao encerrar registro');
      }
    } catch (error) {
      notificar('Erro ao encerrar registro');
    } finally {
      setSaving(false);
    }
  };

  const cancelarRegistro = async () => {
    if (await confirmar('Tem certeza que deseja cancelar? Todos os dados serão perdidos.')) {
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
              notificar('Registro cancelado! Voltou para a lista de programações.');

              // Verificar se ainda há registros antigos pendentes
              if (registrosAntigos.length > 0) {
                setOldRecord(registrosAntigos[0]);
                setShowOldRecordModal(true);
              }
            } else {
              notificar('Erro ao cancelar registro');
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
              notificar('Registro cancelado e salvo na auditoria!');

              // Verificar se ainda há registros antigos pendentes
              if (registrosAntigos.length > 0) {
                setOldRecord(registrosAntigos[0]);
                setShowOldRecordModal(true);
              }
            } else {
              notificar('Erro ao cancelar registro');
            }
          }
        } catch (error) {
          notificar('Erro ao cancelar registro');
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
      case 'nao_aplicavel':
        return <MinusSquare className="w-5 h-5 text-gray-400" />;
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
      case 'nao_aplicavel':
        return 'bg-gray-100 border-gray-200 text-gray-500';
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
    return suite ? nomeSuite(suite.name) : 'Suíte não encontrada';
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
  const progresso = progressoChecklist(registroAtivo?.atividades);
  const progressPercentage = progresso.percentual;

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
        <ActiveRecordBar
          modulo="camararia"
          icon={Home}
          detalhe={<>{getSuiteNome(registroAtivo.suite_id)} - {getTipoServicoLabel(registroAtivo.tipo_servico)}</>}
          concluidas={progresso.realizadas}
          total={progresso.aplicaveis}
          percentual={progresso.percentual}
          inicio={registroAtivo.hora_inicio}
          menuRecolhido={isCollapsed}
        />
      )}
      

      {/* Data Atual e Seleções (sem registro aberto e com suítes programadas, fica recolhido) */}
      <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${formAvulsoVisivel || registroAtivo ? 'p-6' : 'p-4'}`}>
        <div className={`flex items-center justify-between ${formAvulsoVisivel || registroAtivo ? 'mb-6' : ''}`}>
          <button
            type="button"
            disabled={!!registroAtivo || registrosProgramados.length === 0}
            onClick={() => setAvulsoAberto((v) => !v)}
            aria-expanded={formAvulsoVisivel}
            className="flex items-center space-x-3 text-left disabled:cursor-default"
          >
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {registroAtivo || registrosProgramados.length === 0 ? 'Data do Registro' : 'Registro sem programação'}
              </h2>
              <p className="text-gray-600 capitalize">{dataAtual}</p>
            </div>
          </button>
          {!registroAtivo && registrosProgramados.length > 0 && (
            <button
              type="button"
              onClick={() => setAvulsoAberto((v) => !v)}
              aria-label={formAvulsoVisivel ? 'Recolher' : 'Abrir'}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <ChevronDown className={`w-5 h-5 transition-transform ${formAvulsoVisivel ? 'rotate-180' : ''}`} />
            </button>
          )}
          
          {registroAtivo && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Tempo decorrido: {tempoDecorrido} min</span>
            </div>
          )}
        </div>

        {!registroAtivo && formAvulsoVisivel && (
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
                        {nomeSuite(suite.name)} - {suite.type}
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
                    Nenhum serviço de governança cadastrado. Cadastre em Cadastros → Serviços Governança
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

      {/* Quadros do dia: liberados, tipos, limpas e por fazer */}
      {!registroAtivo && <ResumoSuitesDia atualizar={registrosProgramados.length + 1000 * registrosProgramados.filter((r) => r.quarto_liberado_em).length} />}

      {/* Registros Programados para Hoje */}
      {!registroAtivo && registrosProgramados.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Registros Programados para Hoje
              </h3>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                {registrosProgramados.length} {registrosProgramados.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Toque em "Iniciar" para começar · liberadas pela recepção aparecem primeiro
            </p>
          </div>

          <div className="p-3 sm:p-4">
            {/* quadros compactos: várias suítes por linha */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {registrosProgramadosOrdenados.map((registro) => {
                const liberado = !!registro.quarto_liberado_em;
                const retrabalho = String(registro.observacoes || '').startsWith('RETRABALHO:');
                return (
                  <div
                    key={registro.id}
                    className={`relative flex flex-col rounded-lg border p-3 ${liberado ? 'border-emerald-300 bg-emerald-50' : 'border-blue-200 bg-blue-50'}`}
                  >
                    {/* recepção/gestão: "Quarto liberado" no canto do quadro */}
                    {podeLiberarQuarto && registro.tipo_servico !== 'suite_livre' && (
                      <button
                        type="button"
                        onClick={() => alternarQuartoLiberado(registro)}
                        disabled={liberando === registro.id}
                        title={liberado ? 'Desfazer "Quarto liberado"' : 'Marcar "Quarto liberado"'}
                        aria-label={liberado ? 'Desfazer quarto liberado' : 'Marcar quarto liberado'}
                        className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border disabled:opacity-50 ${
                          liberado ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700' : 'bg-white border-emerald-600 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        <DoorOpen className="w-3.5 h-3.5" />
                        {liberado ? 'Liberado' : 'Liberar'}
                      </button>
                    )}
                    <p className={`font-semibold text-gray-800 truncate ${podeLiberarQuarto ? 'pr-20' : ''}`}>{getSuiteNome(registro.suite_id)}</p>
                    <p className="text-xs text-gray-600 truncate" title={`Programado por ${getUsuarioNome(registro.usuario_id)}`}>
                      {getTipoServicoLabel(registro.tipo_servico)} · {getUsuarioNome(registro.usuario_id)}
                    </p>
                    {registro.tipo_servico !== 'suite_livre' && (
                      <p className={`mt-1 text-[11px] font-medium ${liberado ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {liberado
                          ? `Liberado às ${new Date(registro.quarto_liberado_em).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}`
                          : 'Aguardando a recepção'}
                      </p>
                    )}
                    {retrabalho && (
                      <p className="mt-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[11px] font-medium line-clamp-2">
                        Retrabalho: {String(registro.observacoes).replace('RETRABALHO:', '').trim()}
                      </p>
                    )}
                    {registro.observacoes && !retrabalho && (
                      <p className="mt-1 text-[11px] text-gray-600 line-clamp-1" title={registro.observacoes}>{registro.observacoes}</p>
                    )}
                    <div className="mt-auto pt-2">
                      <button
                        onClick={() => iniciarRegistroProgramado(registro)}
                        disabled={saving}
                        className={`w-full py-1.5 rounded-md flex items-center justify-center gap-1.5 text-sm font-medium transition-colors duration-200 ${
                          saving ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{saving ? 'Iniciando...' : 'Iniciar'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Atividades */}
      {registroAtivo && (
        <>
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Atividades da Governança</h3>
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
                    <div key={atividade.id} className="flex items-stretch gap-2">
                      <button
                        onClick={() => toggleAtividade(atividade.id)}
                        className={`flex-1 min-w-0 p-4 rounded-lg border-2 text-left transition-all duration-200 hover:shadow-md ${getStatusColor(atividadeStatus)}`}
                      >
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(atividadeStatus)}
                          <div className="flex-1">
                            <h4 className="font-medium">{atividade.name}</h4>
                            <HorarioItem horario={atividade.horario_previsto} duracao={atividade.duracao_prevista_min} status={atividadeStatus} />
                            {atividade.description && (
                              <p className="text-sm text-gray-600 mt-1">{atividade.description}</p>
                            )}
                          </div>
                        </div>
                      </button>
                      <BotaoNaoSeAplica
                        ativo={atividadeStatus === 'nao_aplicavel'}
                        onClick={() => toggleAtividade(atividade.id, alternarNaoAplicavel)}
                      />
                    </div>
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
                        Configure atividades específicas para este serviço em: Cadastros → Atividades Governança
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Observações e Fotos */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-800">Observações</h3>
              <BotaoObjetoEsquecido
                registroId={registroAtivo.id}
                suiteId={registroAtivo.suite_id}
                suiteNome={getSuiteNome(registroAtivo.suite_id)}
              />
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
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    onClick={cancelarRegistro}
                    disabled={saving}
                    className={`flex-1 px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors duration-200 ${
                      saving 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-white text-red-600 border border-red-300 hover:bg-red-50'
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
                        : 'bg-green-600 text-white hover:bg-green-700 font-semibold'
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
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