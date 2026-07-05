import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  registroRecepcaoService,
  registroCamarariaService,
  registroRevisaoService,
  registroAreasComunsService,
  registroAtividadesExtrasService,
  registroAtividadesDiariasService,
  registroGestaoService,
  registroCozinhaService,
  registroVendasService,
  manutencaoService,
  cancelamentoService,
  usuarioService,
  suiteService,
  atividadeService
} from '../../services/supabaseService';
import { 
  formatarData, 
  formatarHorario, 
  calcularTempoDecorrido, 
  getDataAtual,
  getHorarioAtualBrasil,
  getDataAtualFormatada,
  isHoje 
} from '../../utils/dateUtils';
import {
  FileText,
  Calendar,
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  Home,
  Phone,
  Bed,
  Eye,
  Building,
  Wrench,
  ChefHat,
  Download,
  Filter,
  Activity,
  Target,
  Award,
  AlertTriangle,
  Star,
  Sun,
  Moon,
  Briefcase,
  PieChart,
  LineChart,
  MapPin,
  Timer,
  Percent,
  Hash,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  Crown,
  User,
  Zap,
  X,
  ShoppingCart
} from 'lucide-react';

const Relatorios: React.FC = () => {
  const { user } = useAuth();
  const [timeOfDay, setTimeOfDay] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [registrosAtividadesExtras, setRegistrosAtividadesExtras] = useState<any[]>([]);
  const [registrosAtividadesDiarias, setRegistrosAtividadesDiarias] = useState<any[]>([]);
  const [registrosGestao, setRegistrosGestao] = useState<any[]>([]);
  const [registrosCozinha, setRegistrosCozinha] = useState<any[]>([]);
  const [registrosVendas, setRegistrosVendas] = useState<any[]>([]);
  const [relatorioSelecionado, setRelatorioSelecionado] = useState('dashboard');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroSuite, setFiltroSuite] = useState('');
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    dataInicio: '',
    dataFim: '',
    usuario: '',
    suite: ''
  });
  const [expandedSections, setExpandedSections] = useState<string[]>(['geral']);
  const [expandedSectors, setExpandedSectors] = useState<string[]>([]);
  const [cancelamentos, setCancelamentos] = useState<any[]>([]);

  // Estados para dados
  const [estatisticas, setEstatisticas] = useState<any>({});
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [suites, setSuites] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [registrosRecepcao, setRegistrosRecepcao] = useState<any[]>([]);
  const [registrosCamararia, setRegistrosCamararia] = useState<any[]>([]);
  const [registrosRevisao, setRegistrosRevisao] = useState<any[]>([]);
  const [registrosAreasComuns, setRegistrosAreasComuns] = useState<any[]>([]);
  const [manutencoes, setManutencoes] = useState<any[]>([]);

  const [dados, setDados] = useState<any>({
    registrosRecepcao: [],
    registrosCamararia: [],
    registrosRevisao: [],
    registrosAreasComuns: [],
    manutencoes: [],
    usuarios: [],
    suites: [],
    atividades: [],
    cancelamentos: []
  });

  const setores = [
    { id: 'recepcao', label: 'Recepção', icon: Phone, color: 'blue' },
    { id: 'camararia', label: 'Camararia', icon: Bed, color: 'green' },
    { id: 'revisao', label: 'Revisão', icon: CheckCircle, color: 'yellow' },
    { id: 'areas_comuns', label: 'Áreas Comuns', icon: Building, color: 'indigo' },
    { id: 'atividades_extras', label: 'Atividades Extras', icon: Sun, color: 'amber' },
    { id: 'atividades_diarias', label: 'Atividades Diárias', icon: Moon, color: 'slate' },
    { id: 'gestao', label: 'Gestão', icon: Briefcase, color: 'purple' },
    { id: 'cozinha', label: 'Cozinha', icon: ChefHat, color: 'teal' },
    { id: 'vendas', label: 'Vendas', icon: ShoppingCart, color: 'orange' },
    { id: 'manutencao', label: 'Manutenção', icon: Wrench, color: 'red' }
  ];

  useEffect(() => {
    // Configurar horário
    const updateTimeOfDay = () => {
      // Usar horário brasileiro
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const hour = now.getHours();
      setCurrentTime(now);
      if (hour < 12) setTimeOfDay('Bom dia');
      else if (hour < 18) setTimeOfDay('Boa tarde');
      else setTimeOfDay('Boa noite');
    };
    
    updateTimeOfDay();
    
    // Atualizar horário a cada segundo
    const timeInterval = setInterval(() => {
      updateTimeOfDay();
    }, 1000);
    
    // Definir período padrão (últimos 30 dias)
    const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const trintaDiasAtras = new Date(hoje);
    trintaDiasAtras.setDate(hoje.getDate() - 30);
    
    setDataFim(hoje.toISOString().split('T')[0]);
    setDataInicio(trintaDiasAtras.toISOString().split('T')[0]);
    
    // Definir filtros aplicados iniciais
    setFiltrosAplicados({
      dataInicio: trintaDiasAtras.toISOString().split('T')[0],
      dataFim: hoje.toISOString().split('T')[0],
      usuario: '',
      suite: ''
    });
    
    return () => {
      clearInterval(timeInterval);
    };
  }, []);

  useEffect(() => {
    if (filtrosAplicados.dataInicio && filtrosAplicados.dataFim) {
      carregarDados();
    }
  }, [filtrosAplicados]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      
      const [
        registrosRecepcaoData,
        registrosCamarariaData,
        registrosRevisaoData,
        registrosAreasComunsData,
        registrosAtividadesExtrasData,
        registrosAtividadesDiariasData,
        registrosGestaoData,
        registrosCozinhaData,
        registrosVendasData,
        manutencoesData,
        cancelamentosData,
        usuariosData,
        suitesData,
        atividadesData
      ] = await Promise.all([
        registroRecepcaoService.getRegistrosByPeriodo(filtrosAplicados.dataInicio, filtrosAplicados.dataFim, filtrosAplicados.usuario),
        registroCamarariaService.getRegistrosByPeriodo(filtrosAplicados.dataInicio, filtrosAplicados.dataFim, filtrosAplicados.usuario, filtrosAplicados.suite),
        registroRevisaoService.getRegistrosByPeriodo(filtrosAplicados.dataInicio, filtrosAplicados.dataFim, filtrosAplicados.usuario, filtrosAplicados.suite),
        registroAreasComunsService.getRegistrosByPeriodo(filtrosAplicados.dataInicio, filtrosAplicados.dataFim, filtrosAplicados.usuario),
        registroAtividadesExtrasService.getRegistrosByPeriodo(filtrosAplicados.dataInicio, filtrosAplicados.dataFim, filtrosAplicados.usuario),
        registroAtividadesDiariasService.getRegistrosByPeriodo(filtrosAplicados.dataInicio, filtrosAplicados.dataFim, filtrosAplicados.usuario),
        registroGestaoService.getRegistrosByPeriodo(filtrosAplicados.dataInicio, filtrosAplicados.dataFim, filtrosAplicados.usuario),
        registroCozinhaService.getRegistrosByPeriodo(filtrosAplicados.dataInicio, filtrosAplicados.dataFim, filtrosAplicados.usuario),
        registroVendasService.getRegistrosByPeriodo(filtrosAplicados.dataInicio, filtrosAplicados.dataFim, filtrosAplicados.usuario),
        manutencaoService.getManutencoesByPeriodo(filtrosAplicados.dataInicio, filtrosAplicados.dataFim, filtrosAplicados.usuario),
        cancelamentoService.getCancelamentosByPeriodo(filtrosAplicados.dataInicio, filtrosAplicados.dataFim),
        usuarioService.getUsuarios(),
        suiteService.getSuites(),
        atividadeService.getAtividades()
      ]);

      // Atualizar estados individuais
      setRegistrosRecepcao(registrosRecepcaoData);
      setRegistrosCamararia(registrosCamarariaData);
      setRegistrosRevisao(registrosRevisaoData);
      setRegistrosAreasComuns(registrosAreasComunsData);
      setRegistrosAtividadesExtras(registrosAtividadesExtrasData);
      setRegistrosAtividadesDiarias(registrosAtividadesDiariasData);
      setRegistrosGestao(registrosGestaoData);
      setRegistrosCozinha(registrosCozinhaData);
      setRegistrosVendas(registrosVendasData);
      setManutencoes(manutencoesData);
      setCancelamentos(cancelamentosData);
      setUsuarios(usuariosData);
      setSuites(suitesData);
      setAtividades(atividadesData);

      // Calcular estatísticas
      const todosRegistros = [
        ...registrosRecepcaoData,
        ...registrosCamarariaData,
        ...registrosRevisaoData,
        ...registrosAreasComunsData,
        ...registrosAtividadesExtrasData,
        ...registrosAtividadesDiariasData,
        ...registrosGestaoData,
        ...registrosCozinhaData,
        ...registrosVendasData,
        ...manutencoesData
      ];

      const registrosConcluidos = [
        ...registrosRecepcaoData.filter(r => r.status === 'concluido'),
        ...registrosCamarariaData.filter(r => r.status === 'concluido'),
        ...registrosRevisaoData.filter(r => r.status === 'concluido'),
        ...registrosAreasComunsData.filter(r => r.status === 'concluido'),
        ...registrosAtividadesExtrasData.filter(r => r.status === 'concluido'),
        ...registrosAtividadesDiariasData.filter(r => r.status === 'concluido'),
        ...registrosGestaoData.filter(r => r.status === 'concluido'),
        ...registrosCozinhaData.filter(r => r.status === 'concluido'),
        ...registrosVendasData.filter(r => r.status === 'concluido'),
        ...manutencoesData.filter(m => m.status === 'concluida')
      ];

      const registrosEmAndamento = [
        ...registrosRecepcaoData.filter(r => r.status === 'em_andamento'),
        ...registrosCamarariaData.filter(r => r.status === 'em_andamento'),
        ...registrosRevisaoData.filter(r => r.status === 'em_andamento'),
        ...registrosAreasComunsData.filter(r => r.status === 'em_andamento'),
        ...registrosAtividadesExtrasData.filter(r => r.status === 'em_andamento'),
        ...registrosAtividadesDiariasData.filter(r => r.status === 'em_andamento'),
        ...registrosGestaoData.filter(r => r.status === 'em_andamento'),
        ...registrosCozinhaData.filter(r => r.status === 'em_andamento'),
        ...registrosVendasData.filter(r => r.status === 'em_andamento'),
        ...manutencoesData.filter(m => ['aberto', 'em_andamento', 'pausada'].includes(m.status))
      ];

      const registrosPorArea = {
        recepcao: registrosRecepcaoData,
        camararia: registrosCamarariaData,
        revisao: registrosRevisaoData,
        areas_comuns: registrosAreasComunsData,
        atividades_extras: registrosAtividadesExtrasData,
        atividades_diarias: registrosAtividadesDiariasData,
        gestao: registrosGestaoData,
        cozinha: registrosCozinhaData,
        vendas: registrosVendasData,
        manutencao: manutencoesData
      };

      // Análise tempo real (hoje)
      const hoje = getDataAtual(); // Usar função que considera fuso brasileiro
      const registrosHoje = [
        ...registrosRecepcaoData.filter(r => r.data === hoje),
        ...registrosCamarariaData.filter(r => r.data === hoje),
        ...registrosRevisaoData.filter(r => r.data === hoje),
        ...registrosAreasComunsData.filter(r => r.data === hoje),
        ...registrosAtividadesExtrasData.filter(r => r.data === hoje),
        ...registrosAtividadesDiariasData.filter(r => r.data === hoje),
        ...registrosGestaoData.filter(r => r.data === hoje),
        ...registrosCozinhaData.filter(r => r.data === hoje),
        ...registrosVendasData.filter(r => r.data === hoje),
        ...manutencoesData.filter(m => m.data === hoje)
      ];

      const estatisticasCalculadas = {
        totalRegistros: todosRegistros.length,
        registrosConcluidos: registrosConcluidos.length,
        registrosEmAndamento: registrosEmAndamento.length,
        percentualConclusao: todosRegistros.length > 0 ?
          Math.round((registrosConcluidos.length / todosRegistros.length) * 100) : 0,
        usuariosAtivos: new Set(todosRegistros.map(r => r.usuario_executor_id || r.usuario_id).filter(Boolean)).size,
        registrosPorArea,
        registrosHoje: registrosHoje.length,
        concluidosHoje: registrosHoje.filter(r => 
          r.status === 'concluido' || r.status === 'concluida'
        ).length,
        emAndamentoHoje: registrosHoje.filter(r => r.status === 'em_andamento').length,
        totalCancelamentos: cancelamentosData.length
      };

      setEstatisticas(estatisticasCalculadas);

      // Manter compatibilidade com dados antigos
      setDados({
        registrosRecepcao: registrosRecepcaoData,
        registrosCamararia: registrosCamarariaData,
        registrosRevisao: registrosRevisaoData,
        registrosAreasComuns: registrosAreasComunsData,
        manutencoes: manutencoesData,
        usuarios: usuariosData,
        suites: suitesData,
        atividades: atividadesData,
        cancelamentos: cancelamentosData
      });

    } catch (error) {
      alert('Erro ao carregar dados dos relatórios');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    if (!dataInicio || !dataFim) {
      alert('Por favor, selecione as datas de início e fim');
      return;
    }
    
    if (new Date(dataInicio) > new Date(dataFim)) {
      alert('A data de início deve ser anterior à data de fim');
      return;
    }
    
    setFiltrosAplicados({
      dataInicio,
      dataFim,
      usuario: filtroUsuario,
      suite: filtroSuite
    });
  };

  const limparFiltros = () => {
    const hoje = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(hoje.getDate() - 30);
    
    const dataInicioDefault = trintaDiasAtras.toISOString().split('T')[0];
    const dataFimDefault = hoje.toISOString().split('T')[0];
    
    setDataInicio(dataInicioDefault);
    setDataFim(dataFimDefault);
    setFiltroUsuario('');
    setFiltroSuite('');
    
    setFiltrosAplicados({
      dataInicio: dataInicioDefault,
      dataFim: dataFimDefault,
      usuario: '',
      suite: ''
    });
  };

  const toggleSector = (sectorId: string) => {
    setExpandedSectors(prev => 
      prev.includes(sectorId) 
        ? prev.filter(id => id !== sectorId)
        : [...prev, sectorId]
    );
  };

  const getUsuarioNome = (usuarioId: string) => {
    const usuario = usuarios.find(u => u.id === usuarioId);
    return usuario?.name || 'Usuário não encontrado';
  };

  const getSuiteNome = (suiteId: string) => {
    const suite = suites.find(s => s.id === suiteId);
    return suite ? `Suíte ${suite.name}` : 'Suíte não encontrada';
  };

  const getAtividadeNome = (atividadeId: string) => {
    const atividade = atividades.find(a => a.id === atividadeId);
    return atividade?.name || 'Atividade não encontrada';
  };

  const calcularEstatisticasAvancadas = () => {
    const todosRegistros = [
      ...dados.registrosRecepcao,
      ...dados.registrosCamararia,
      ...dados.registrosRevisao,
      ...dados.registrosAreasComuns,
      ...registrosAtividadesExtras,
      ...registrosAtividadesDiarias,
      ...registrosGestao,
      ...registrosCozinha,
      ...registrosVendas
    ];

    const totalRegistros = todosRegistros.length + dados.manutencoes.length;
    const totalCancelamentos = dados.cancelamentos?.length || 0;
    const registrosCancelados = new Set(dados.cancelamentos.map(c => c.registro_id).filter(Boolean));
    const registrosValidos = todosRegistros.filter(r => !registrosCancelados.has(r.id));

    const registrosConcluidos =
      registrosValidos.filter((r: any) => r.status === 'concluido').length +
      dados.manutencoes.filter((m: any) => m.status === 'concluida').length;

    const atividadesRealizadas = registrosValidos.reduce((acc, registro) => {
      return acc + (registro.atividades?.filter((a: any) => a.status === 'realizada').length || 0);
    }, 0);

    const atividadesTotal = registrosValidos.reduce((acc, registro) => {
      return acc + (registro.atividades?.length || 0);
    }, 0);

    const usuariosAtivos = new Set([
      ...registrosValidos.map((r: any) => r.usuario_executor_id || r.usuario_id),
      ...dados.manutencoes.map((m: any) => m.usuario_id).filter(Boolean)
    ]).size;

    const suitesAtendidas = new Set([
      ...dados.registrosCamararia.filter((r: any) => !registrosCancelados.has(r.id)).map((r: any) => r.suite_id),
      ...dados.registrosRevisao.filter((r: any) => !registrosCancelados.has(r.id)).map((r: any) => r.suite_id)
    ]).size;

    // Calcular tempo total e médio geral
    const registrosComTempo = registrosValidos.filter(r => r.hora_inicio && r.hora_fim);
    const tempoTotalMs = registrosComTempo.reduce((acc, registro) => {
      const inicio = new Date(registro.hora_inicio).getTime();
      const fim = new Date(registro.hora_fim).getTime();
      return acc + (fim - inicio);
    }, 0);

    const tempoTotalGeral = Math.round(tempoTotalMs / (1000 * 60)); // em minutos
    const tempoMedioGeral = registrosComTempo.length > 0 ?
      Math.round(tempoTotalMs / registrosComTempo.length / (1000 * 60)) : 0;

    // Calcular eficiência por área
    const eficienciaPorArea = {
      recepcao: calcularEficienciaArea(dados.registrosRecepcao),
      camararia: calcularEficienciaArea(dados.registrosCamararia),
      revisao: calcularEficienciaArea(dados.registrosRevisao),
      areas_comuns: calcularEficienciaArea(dados.registrosAreasComuns),
      atividades_extras: calcularEficienciaArea(registrosAtividadesExtras),
      atividades_diarias: calcularEficienciaArea(registrosAtividadesDiarias),
      gestao: calcularEficienciaArea(registrosGestao),
      cozinha: calcularEficienciaArea(registrosCozinha),
      vendas: calcularEficienciaArea(registrosVendas),
      manutencao: dados.manutencoes.filter((m: any) => m.status === 'concluida').length
    };

    return {
      totalRegistros,
      registrosConcluidos,
      atividadesRealizadas,
      atividadesTotal,
      usuariosAtivos,
      suitesAtendidas,
      tempoTotalGeral,
      tempoMedioGeral,
      percentualConclusao: totalRegistros > 0 ? Math.round((registrosConcluidos / totalRegistros) * 100) : 0,
      percentualAtividades: atividadesTotal > 0 ? Math.round((atividadesRealizadas / atividadesTotal) * 100) : 0,
      eficienciaPorArea,
      totalCancelamentos
    };
  };

  const calcularEficienciaArea = (registros: any[]) => {
    const concluidos = registros.filter(r => r.status === 'concluido').length;
    const total = registros.length;
    return total > 0 ? Math.round((concluidos / total) * 100) : 0;
  };

  const calcularProdutividadePorUsuario = () => {
    // Criar um Map para facilitar o acesso aos funcionários
    const funcionariosMap = new Map();
    
    // Primeiro, inicializar todos os usuários com dados zerados
    usuarios.forEach(usuario => {
      if (usuario.active) {
        funcionariosMap.set(usuario.id, {
          id: usuario.id,
          nome: usuario.name,
          profile: usuario.profile,
          recepcao: 0,
          camararia: 0,
          revisao: 0,
          areasComuns: 0,
          atividades_extras: 0,
          atividades_diarias: 0,
          gestao: 0,
          cozinha: 0,
          vendas: 0,
          manutencoes: 0,
          totalRegistros: 0
        });
      }
    });
    
    
    // Processar registros de recepção
    registrosRecepcao.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      const funcionario = funcionariosMap.get(executorId);
      if (funcionario) {
        funcionario.recepcao++;
        funcionario.totalRegistros++;
      }
    });

    // Processar registros de camararia
    registrosCamararia.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      const funcionario = funcionariosMap.get(executorId);
      if (funcionario) {
        funcionario.camararia++;
        funcionario.totalRegistros++;
      }
    });

    // Processar registros de revisão
    registrosRevisao.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      const funcionario = funcionariosMap.get(executorId);
      if (funcionario) {
        funcionario.revisao++;
        funcionario.totalRegistros++;
      }
    });

    // Processar registros de áreas comuns
    registrosAreasComuns.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      const funcionario = funcionariosMap.get(executorId);
      if (funcionario) {
        funcionario.areasComuns++;
        funcionario.totalRegistros++;
      }
    });

    // Processar registros diurnos
    registrosAtividadesExtras.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      const funcionario = funcionariosMap.get(executorId);
      if (funcionario) {
        funcionario.atividades_extras++;
        funcionario.totalRegistros++;
      }
    });

    // Processar registros noturnos
    registrosAtividadesDiarias.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      const funcionario = funcionariosMap.get(executorId);
      if (funcionario) {
        funcionario.atividades_diarias++;
        funcionario.totalRegistros++;
      }
    });

    // Processar registros de gestão
    registrosGestao.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      const funcionario = funcionariosMap.get(executorId);
      if (funcionario) {
        funcionario.gestao++;
        funcionario.totalRegistros++;
      }
    });

    // Processar registros de cozinha
    registrosCozinha.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      const funcionario = funcionariosMap.get(executorId);
      if (funcionario) {
        funcionario.cozinha = (funcionario.cozinha || 0) + 1;
        funcionario.totalRegistros++;
      }
    });

    // Processar registros de vendas
    registrosVendas.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      const funcionario = funcionariosMap.get(executorId);
      if (funcionario) {
        funcionario.vendas = (funcionario.vendas || 0) + 1;
        funcionario.totalRegistros++;
      }
    });

    // Processar manutenções
    manutencoes.forEach(manutencao => {
      if (manutencao.usuario_id) {            
        const funcionario = funcionariosMap.get(manutencao.usuario_id);
        if (funcionario) {
          funcionario.manutencoes++;
          funcionario.totalRegistros++;
        }
      }
    });
    
    const funcionariosArray = Array.from(funcionariosMap.values());

    // Função auxiliar para calcular tempo em minutos
    const calcularTempoMinutos = (horaInicio: string, horaFim: string) => {
      const inicio = new Date(horaInicio).getTime();
      const fim = new Date(horaFim).getTime();
      return Math.round((fim - inicio) / (1000 * 60));
    };

    // Processar registros de recepção
    registrosRecepcao.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      if (funcionariosMap.has(executorId)) {
        const funcionario = funcionariosMap.get(executorId);
        funcionario.registrosRecepcao++;
        funcionario.totalRegistros++;

        if (registro.hora_inicio && registro.hora_fim) {
          const tempo = calcularTempoMinutos(registro.hora_inicio, registro.hora_fim);
          funcionario.tempoTotal += tempo;
        }
      }
    });

    // Processar registros de camararia
    registrosCamararia.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      if (funcionariosMap.has(executorId)) {
        const funcionario = funcionariosMap.get(executorId);
        funcionario.registrosCamararia++;
        funcionario.totalRegistros++;

        if (registro.hora_inicio && registro.hora_fim) {
          const tempo = calcularTempoMinutos(registro.hora_inicio, registro.hora_fim);
          funcionario.tempoTotal += tempo;
        }
      }
    });

    // Processar registros de revisão
    registrosRevisao.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      if (funcionariosMap.has(executorId)) {
        const funcionario = funcionariosMap.get(executorId);
        funcionario.registrosRevisao++;
        funcionario.totalRegistros++;

        if (registro.hora_inicio && registro.hora_fim) {
          const tempo = calcularTempoMinutos(registro.hora_inicio, registro.hora_fim);
          funcionario.tempoTotal += tempo;
        }
      }
    });

    // Processar registros de áreas comuns
    registrosAreasComuns.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      if (funcionariosMap.has(executorId)) {
        const funcionario = funcionariosMap.get(executorId);
        funcionario.registrosAreasComuns++;
        funcionario.totalRegistros++;

        if (registro.hora_inicio && registro.hora_fim) {
          const tempo = calcularTempoMinutos(registro.hora_inicio, registro.hora_fim);
          funcionario.tempoTotal += tempo;
        }
      }
    });

    // Processar registros diurnos
    registrosAtividadesExtras.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      if (funcionariosMap.has(executorId)) {
        const funcionario = funcionariosMap.get(executorId);
        funcionario.registrosAtividadesExtras++;
        funcionario.totalRegistros++;

        if (registro.hora_inicio && registro.hora_fim) {
          const tempo = calcularTempoMinutos(registro.hora_inicio, registro.hora_fim);
          funcionario.tempoTotal += tempo;
        }
      }
    });

    // Processar registros noturnos
    registrosAtividadesDiarias.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      if (funcionariosMap.has(executorId)) {
        const funcionario = funcionariosMap.get(executorId);
        funcionario.registrosAtividadesDiarias++;
        funcionario.totalRegistros++;

        if (registro.hora_inicio && registro.hora_fim) {
          const tempo = calcularTempoMinutos(registro.hora_inicio, registro.hora_fim);
          funcionario.tempoTotal += tempo;
        }
      }
    });

    // Processar registros de gestão
    registrosGestao.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      if (funcionariosMap.has(executorId)) {
        const funcionario = funcionariosMap.get(executorId);
        funcionario.registrosGestao++;
        funcionario.totalRegistros++;

        if (registro.hora_inicio && registro.hora_fim) {
          const tempo = calcularTempoMinutos(registro.hora_inicio, registro.hora_fim);
          funcionario.tempoTotal += tempo;
        }
      }
    });

    // Processar registros de cozinha
    registrosCozinha.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      if (funcionariosMap.has(executorId)) {
        const funcionario = funcionariosMap.get(executorId);
        funcionario.registrosCozinha = (funcionario.registrosCozinha || 0) + 1;
        funcionario.totalRegistros++;

        if (registro.hora_inicio && registro.hora_fim) {
          const tempo = calcularTempoMinutos(registro.hora_inicio, registro.hora_fim);
          funcionario.tempoTotal += tempo;
        }
      }
    });

    // Processar registros de vendas
    registrosVendas.forEach(registro => {
      const executorId = registro.usuario_executor_id || registro.usuario_id;
      if (funcionariosMap.has(executorId)) {
        const funcionario = funcionariosMap.get(executorId);
        funcionario.registrosVendas = (funcionario.registrosVendas || 0) + 1;
        funcionario.totalRegistros++;

        if (registro.hora_inicio && registro.hora_fim) {
          const tempo = calcularTempoMinutos(registro.hora_inicio, registro.hora_fim);
          funcionario.tempoTotal += tempo;
        }
      }
    });

    // Processar manutenções
    manutencoes.forEach(manutencao => {
      if (funcionariosMap.has(manutencao.usuario_id)) {
        const funcionario = funcionariosMap.get(manutencao.usuario_id);
        funcionario.manutencoes++;
        funcionario.totalRegistros++;
        
        if (manutencao.tempo_total) {
          funcionario.tempoTotal += manutencao.tempo_total;
        }
      }
    });

    // Converter Map para Array e calcular estatísticas
    const funcionariosArray2 = Array.from(funcionariosMap.values()).map(funcionario => {
      const cancelamentosUsuario = (dados.cancelamentos || []).filter((c: any) => c.usuario_id === funcionario.id);
      
      const registrosUsuario = [
        ...dados.registrosRecepcao.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === funcionario.id),
        ...dados.registrosCamararia.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === funcionario.id),
        ...dados.registrosRevisao.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === funcionario.id),
        ...dados.registrosAreasComuns.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === funcionario.id),
        ...registrosAtividadesExtras.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === funcionario.id),
        ...registrosAtividadesDiarias.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === funcionario.id),
        ...registrosGestao.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === funcionario.id),
        ...registrosCozinha.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === funcionario.id),
        ...registrosVendas.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === funcionario.id),
        ...dados.manutencoes.filter((m: any) => m.usuario_id === funcionario.id)
      ];

      const registrosConcluidos = registrosUsuario.filter((r: any) => 
        r.status === 'concluido' || r.status === 'concluida'
      );

      const atividadesRealizadas = registrosUsuario.reduce((acc, registro) => {
        if (registro.atividades) {
          return acc + registro.atividades.filter((a: any) => a.status === 'realizada').length;
        }
        return acc;
      }, 0);

      const totalAtividades = registrosUsuario.reduce((acc, registro) => {
        if (registro.atividades) {
          return acc + registro.atividades.length;
        }
        return acc;
      }, 0);

      const tempoTotal = registrosUsuario.reduce((acc, registro) => {
        if (registro.hora_inicio && registro.hora_fim) {
          const inicio = new Date(registro.hora_inicio).getTime();
          const fim = new Date(registro.hora_fim).getTime();
          return acc + (fim - inicio);
        }
        if (registro.tempo_total) {
          return acc + (registro.tempo_total * 60 * 1000); // converter minutos para ms
        }
        return acc;
      }, 0);

      const tempoMedio = registrosUsuario.length > 0 ? tempoTotal / registrosUsuario.length / (1000 * 60) : 0;

      return {
        usuario: {
          id: funcionario.id,
          name: funcionario.nome,
          profile: funcionario.profile
        },
        totalRegistros: registrosUsuario.length,
        registrosConcluidos: registrosConcluidos.length,
        atividadesRealizadas,
        totalAtividades,
        cancelamentos: cancelamentosUsuario.length,
        tempoTotal: Math.round(tempoTotal / (1000 * 60)), // em minutos
        tempoMedio: Math.round(tempoMedio),
        percentualConclusao: registrosUsuario.length > 0 ?
          Math.round((registrosConcluidos.length / registrosUsuario.length) * 100) : 0,
        percentualAtividades: totalAtividades > 0 ?
          Math.round((atividadesRealizadas / totalAtividades) * 100) : 0,
        eficiencia: atividadesRealizadas / Math.max(registrosUsuario.length, 1)
      };
    }).filter(p => p.totalRegistros > 0)
      .sort((a, b) => {
        // Primeiro critério: percentual de conclusão (maior primeiro)
        if (b.percentualConclusao !== a.percentualConclusao) {
          return b.percentualConclusao - a.percentualConclusao;
        }
        // Segundo critério (em caso de empate): percentual de atividades realizadas (maior primeiro)
        if (b.percentualAtividades !== a.percentualAtividades) {
          return b.percentualAtividades - a.percentualAtividades;
        }
        // Terceiro critério (em caso de empate): tempo total trabalhado (maior primeiro)
        return b.tempoTotal - a.tempoTotal;
      });

    return funcionariosArray2;
  };

  const calcularTopPerformersHoje = () => {
    const hoje = getDataAtual(); // Usar função que considera fuso brasileiro
    
    return dados.usuarios.map((usuario: any) => {
      // Obter cancelamentos do usuário hoje
      const cancelamentosUsuarioHoje = (dados.cancelamentos || []).filter((c: any) => {
        return c.usuario_id === usuario.id && isHoje(c.data_hora);
      });
      
      const registrosUsuarioHoje = [
        ...dados.registrosRecepcao.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === usuario.id && r.data === hoje),
        ...dados.registrosCamararia.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === usuario.id && r.data === hoje),
        ...dados.registrosRevisao.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === usuario.id && r.data === hoje),
        ...dados.registrosAreasComuns.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === usuario.id && r.data === hoje),
        ...registrosAtividadesExtras.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === usuario.id && r.data === hoje),
        ...registrosAtividadesDiarias.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === usuario.id && r.data === hoje),
        ...registrosGestao.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === usuario.id && r.data === hoje),
        ...registrosCozinha.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === usuario.id && r.data === hoje),
        ...registrosVendas.filter((r: any) => (r.usuario_executor_id || r.usuario_id) === usuario.id && r.data === hoje),
        ...dados.manutencoes.filter((m: any) => m.usuario_id === usuario.id && m.data === hoje)
      ];

      const registrosConcluidosHoje = registrosUsuarioHoje.filter((r: any) => 
        r.status === 'concluido' || r.status === 'concluida'
      );

      const atividadesRealizadasHoje = registrosUsuarioHoje.reduce((acc, registro) => {
        if (registro.atividades) {
          return acc + registro.atividades.filter((a: any) => a.status === 'realizada').length;
        }
        return acc;
      }, 0);

      const tempoTotalHoje = registrosUsuarioHoje.reduce((acc, registro) => {
        if (registro.hora_inicio && registro.hora_fim) {
          const inicio = new Date(registro.hora_inicio).getTime();
          const fim = new Date(registro.hora_fim).getTime();
          return acc + (fim - inicio);
        }
        if (registro.tempo_total) {
          return acc + (registro.tempo_total * 60 * 1000); // converter minutos para ms
        }
        return acc;
      }, 0);

      return {
        usuario,
        totalRegistrosHoje: registrosUsuarioHoje.length,
        registrosConcluidosHoje: registrosConcluidosHoje.length,
        atividadesRealizadasHoje,
        cancelamentosHoje: cancelamentosUsuarioHoje.length,
        tempoTotalHoje: Math.round(tempoTotalHoje / (1000 * 60)), // em minutos
        percentualConclusaoHoje: registrosUsuarioHoje.length > 0 ? 
          Math.round((registrosConcluidosHoje.length / registrosUsuarioHoje.length) * 100) : 0,
        eficienciaHoje: atividadesRealizadasHoje / Math.max(registrosUsuarioHoje.length, 1)
      };
    }).filter(p => p.totalRegistrosHoje > 0)
      .sort((a, b) => {
        // Ordenar por: 1) Percentual de conclusão, 2) Atividades realizadas, 3) Total de registros
        if (b.percentualConclusaoHoje !== a.percentualConclusaoHoje) {
          return b.percentualConclusaoHoje - a.percentualConclusaoHoje;
        }
        if (b.atividadesRealizadasHoje !== a.atividadesRealizadasHoje) {
          return b.atividadesRealizadasHoje - a.atividadesRealizadasHoje;
        }
        return b.totalRegistrosHoje - a.totalRegistrosHoje;
      });
  };
  const calcularAnaliseTempoReal = () => {
    const hoje = getDataAtual(); // Usar função que considera fuso brasileiro
    const registrosHoje = [
      ...dados.registrosRecepcao.filter((r: any) => r.data === hoje),
      ...dados.registrosCamararia.filter((r: any) => r.data === hoje),
      ...dados.registrosRevisao.filter((r: any) => r.data === hoje),
      ...dados.registrosAreasComuns.filter((r: any) => r.data === hoje),
      ...registrosAtividadesExtras.filter((r: any) => r.data === hoje),
      ...registrosAtividadesDiarias.filter((r: any) => r.data === hoje),
      ...registrosGestao.filter((r: any) => r.data === hoje),
      ...registrosCozinha.filter((r: any) => r.data === hoje),
      ...registrosVendas.filter((r: any) => r.data === hoje)
    ];

    const manutencoesHoje = dados.manutencoes.filter((m: any) => m.data === hoje);

    return {
      registrosHoje: registrosHoje.length,
      manutencoesHoje: manutencoesHoje.length,
      concluidosHoje: registrosHoje.filter(r => r.status === 'concluido').length + 
                     manutencoesHoje.filter(m => m.status === 'concluida').length,
      emAndamentoHoje: registrosHoje.filter(r => r.status === 'em_andamento').length,
      usuariosAtivosHoje: new Set(registrosHoje.map(r => r.usuario_executor_id || r.usuario_id)).size
    };
  };

  const calcularTendencias = () => {
    const diasPeriodo = Math.ceil((new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / (1000 * 60 * 60 * 24));
    const todosRegistros = [
      ...dados.registrosRecepcao,
      ...dados.registrosCamararia,
      ...dados.registrosRevisao,
      ...dados.registrosAreasComuns,
      ...registrosAtividadesExtras,
      ...registrosAtividadesDiarias,
      ...registrosGestao,
      ...registrosCozinha,
      ...registrosVendas,
      ...dados.manutencoes
    ];

    const mediaDiaria = todosRegistros.length / Math.max(diasPeriodo, 1);
    const mediaAtividades = todosRegistros.reduce((acc, r) => acc + (r.atividades?.length || 0), 0) / Math.max(todosRegistros.length, 1);

    return {
      mediaDiaria: Math.round(mediaDiaria * 10) / 10,
      mediaAtividades: Math.round(mediaAtividades * 10) / 10,
      diasPeriodo,
      crescimento: mediaDiaria > 5 ? 'positivo' : mediaDiaria > 2 ? 'estavel' : 'baixo'
    };
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const formatarTempo = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const exportarRelatorioCompleto = () => {
    const estatisticas = calcularEstatisticasAvancadas();
    const produtividade = calcularProdutividadePorUsuario();
    const tempoReal = calcularAnaliseTempoReal();
    const tendencias = calcularTendencias();
    
    const relatorioCompleto = {
      metadata: {
        periodo: { inicio: dataInicio, fim: dataFim },
        geradoEm: new Date().toISOString(),
        totalDias: tendencias.diasPeriodo
      },
      estatisticasGerais: estatisticas,
      analiseTempoReal: tempoReal,
      tendencias,
      produtividadePorUsuario: produtividade,
      dadosDetalhados: {
        registrosPorArea: {
          recepcao: dados.registrosRecepcao.length,
          camararia: dados.registrosCamararia.length,
          revisao: dados.registrosRevisao.length,
          areasComuns: dados.registrosAreasComuns.length,
          atividadesExtras: registrosAtividadesExtras.length,
          atividadesDiarias: registrosAtividadesDiarias.length,
          gestao: registrosGestao.length,
          cozinha: registrosCozinha.length,
          vendas: registrosVendas.length,
          manutencao: dados.manutencoes.length
        },
        registrosCompletos: dados
      },
      setoresAdicionais: [
        {
          nome: 'Atividades Extras',
          registros: registrosAtividadesExtras,
          cor: 'amber',
          icone: Sun
        },
        {
          nome: 'Atividades Diárias',
          registros: registrosAtividadesDiarias,
          cor: 'slate',
          icone: Moon
        },
        {
          nome: 'Gestão',
          registros: registrosGestao,
          cor: 'purple',
          icone: Briefcase
        },
        {
          nome: 'Cozinha',
          registros: registrosCozinha,
          cor: 'teal',
          icone: ChefHat
        },
        {
          nome: 'Vendas',
          registros: registrosVendas,
          cor: 'orange',
          icone: ShoppingCart
        }
      ]
    };

    const blob = new Blob([JSON.stringify(relatorioCompleto, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-inteligencia-${dataInicio}-${dataFim}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getProfileTheme = () => {
    return {
      gradient: 'from-blue-600 via-purple-600 to-indigo-700',
      accent: 'blue',
      icon: Crown,
      title: 'Painel Executivo'
    };
  };

  const renderDashboardInteligencia = () => {
    const estatisticas = calcularEstatisticasAvancadas();
    const tempoReal = calcularAnaliseTempoReal();
    const tendencias = calcularTendencias();
    const produtividade = calcularProdutividadePorUsuario();
    const topPerformersHoje = calcularTopPerformersHoje();

    return (
      <div className="space-y-6">
        {/* Métricas Principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs lg:text-sm">Total de Registros</p>
                <p className="text-2xl lg:text-3xl font-bold">{estatisticas.totalRegistros}</p>
                <p className="text-blue-200 text-xs mt-1 hidden lg:block">
                  {tendencias.mediaDiaria}/dia em média
                </p>
              </div>
              <FileText className="w-8 h-8 lg:w-12 lg:h-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs lg:text-sm">Taxa de Conclusão</p>
                <p className="text-2xl lg:text-3xl font-bold">{estatisticas.percentualConclusao}%</p>
                <p className="text-green-200 text-xs mt-1 hidden lg:block">
                  {estatisticas.registrosConcluidos} concluídos
                </p>
              </div>
              <CheckCircle className="w-8 h-8 lg:w-12 lg:h-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs lg:text-sm">Eficiência Atividades</p>
                <p className="text-2xl lg:text-3xl font-bold">{estatisticas.percentualAtividades}%</p>
                <p className="text-purple-200 text-xs mt-1 hidden lg:block">
                  {estatisticas.atividadesRealizadas}/{estatisticas.atividadesTotal}
                </p>
              </div>
              <Target className="w-8 h-8 lg:w-12 lg:h-12 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs lg:text-sm">Tempo Total Trabalhado</p>
                <p className="text-2xl lg:text-3xl font-bold">{formatarTempo(estatisticas.tempoTotalGeral)}</p>
                <p className="text-orange-200 text-xs mt-1 hidden lg:block">
                  somatório geral
                </p>
              </div>
              <Clock className="w-8 h-8 lg:w-12 lg:h-12 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Análise em Tempo Real */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                Análise em Tempo Real - Hoje
              </h3>
              <button
                onClick={carregarDados}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
              <div className="text-center">
                <div className="text-xl lg:text-2xl font-bold text-blue-600">{tempoReal.registrosHoje}</div>
                <div className="text-xs lg:text-sm text-gray-600">Registros Hoje</div>
              </div>
              <div className="text-center">
                <div className="text-xl lg:text-2xl font-bold text-green-600">{tempoReal.concluidosHoje}</div>
                <div className="text-xs lg:text-sm text-gray-600">Concluídos</div>
              </div>
              <div className="text-center">
                <div className="text-xl lg:text-2xl font-bold text-yellow-600">{tempoReal.emAndamentoHoje}</div>
                <div className="text-xs lg:text-sm text-gray-600">Em Andamento</div>
              </div>
              <div className="text-center">
                <div className="text-xl lg:text-2xl font-bold text-purple-600">{tempoReal.usuariosAtivosHoje}</div>
                <div className="text-xs lg:text-sm text-gray-600">Usuários Ativos</div>
              </div>
              <div className="text-center">
                <div className="text-xl lg:text-2xl font-bold text-orange-600">{tempoReal.manutencoesHoje}</div>
                <div className="text-xs lg:text-sm text-gray-600">Manutenções</div>
              </div>
            </div>
          </div>
        </div>

        {/* Eficiência por Área */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-blue-500" />
              Eficiência por Área
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { area: 'Recepção', key: 'recepcao', icon: Phone, color: 'blue' },
                { area: 'Camararia', key: 'camararia', icon: Bed, color: 'green' },
                { area: 'Revisão', key: 'revisao', icon: CheckCircle, color: 'yellow' },
                { area: 'Áreas Comuns', key: 'areas_comuns', icon: Building, color: 'indigo' },
                { area: 'Atividades Extras', key: 'atividades_extras', icon: Sun, color: 'amber' },
                { area: 'Atividades Diárias', key: 'atividades_diarias', icon: Moon, color: 'slate' },
                { area: 'Gestão', key: 'gestao', icon: Briefcase, color: 'purple' },
                { area: 'Cozinha', key: 'cozinha', icon: ChefHat, color: 'teal' },
                { area: 'Vendas', key: 'vendas', icon: ShoppingCart, color: 'orange' },
                { area: 'Manutenção', key: 'manutencao', icon: Wrench, color: 'red' }
              ].map((area) => {
                const Icon = area.icon;
                const eficiencia = estatisticas.eficienciaPorArea[area.key as keyof typeof estatisticas.eficienciaPorArea];
                return (
                  <div key={area.key} className="text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 bg-${area.color}-100 rounded-full mb-3`}>
                      <Icon className={`w-6 h-6 lg:w-8 lg:h-8 text-${area.color}-600`} />
                    </div>
                    <div className="text-xl lg:text-2xl font-bold text-gray-800">{eficiencia}%</div>
                    <div className="text-xs lg:text-sm text-gray-600">{area.area}</div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`bg-${area.color}-500 h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${eficiencia}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Award className="w-5 h-5 mr-2 text-yellow-500" />
              Top Performers - Período Selecionado
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {produtividade && produtividade.length > 0 ? produtividade.slice(0, 3).map((prod, index) => (
                <div key={prod.usuario.id} className="text-center">
                  <div className={`inline-flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 rounded-full mb-3 ${
                    index === 0 ? 'bg-yellow-100' : index === 1 ? 'bg-gray-100' : 'bg-orange-100'
                  }`}>
                    {index === 0 ? (
                      <Star className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-600" />
                    ) : (
                      <Award className={`w-6 h-6 lg:w-8 lg:h-8 ${index === 1 ? 'text-gray-600' : 'text-orange-600'}`} />
                    )}
                  </div>
                  <div className="font-semibold text-gray-800 text-sm lg:text-base">{prod.usuario.name}</div>
                  <div className="text-xs lg:text-sm text-gray-600 capitalize">{prod.usuario.profile}</div>
                  <div className="text-xl lg:text-2xl font-bold text-gray-800 mt-2">{prod.percentualConclusao}%</div>
                  <div className="text-xs lg:text-sm text-gray-500">{prod.totalRegistros} registros</div>
                </div>
              )) : (
                <div className="lg:col-span-3 text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-600">Nenhum dado de produtividade disponível</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Performers do Dia */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Star className="w-5 h-5 mr-2 text-blue-500" />
              Top Performers - Hoje
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Os 3 melhores colaboradores do dia atual
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {topPerformersHoje && topPerformersHoje.length > 0 ? topPerformersHoje.slice(0, 3).map((perf, index) => (
                <div key={perf.usuario.id} className="text-center">
                  <div className={`inline-flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 rounded-full mb-3 ${
                    index === 0 ? 'bg-blue-100' : index === 1 ? 'bg-green-100' : 'bg-purple-100'
                  }`}>
                    {index === 0 ? (
                      <Star className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
                    ) : index === 1 ? (
                      <Award className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
                    ) : (
                      <Award className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600" />
                    )}
                  </div>
                  <div className="font-semibold text-gray-800 text-sm lg:text-base">{perf.usuario.name}</div>
                  <div className="text-xs lg:text-sm text-gray-600 capitalize">{perf.usuario.profile}</div>
                  <div className="text-xl lg:text-2xl font-bold text-gray-800 mt-2">{perf.percentualConclusaoHoje}%</div>
                  <div className="text-xs lg:text-sm text-gray-500">{perf.totalRegistrosHoje} registros hoje</div>
                  <div className="text-xs text-gray-400 mt-1">{perf.atividadesRealizadasHoje} atividades</div>
                </div>
              )) : (
                <div className="lg:col-span-3 text-center py-8 text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <h4 className="text-lg font-medium text-gray-800 mb-2">Nenhuma atividade hoje</h4>
                  <p className="text-gray-600">Os top performers do dia aparecerão aqui conforme as atividades forem registradas</p>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Tendências e Insights */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <LineChart className="w-5 h-5 mr-2 text-green-500" />
              Tendências e Insights
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-1 lg:space-x-2 mb-2">
                  <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                  <span className="font-medium text-blue-800 text-xs lg:text-sm">Média Diária</span>
                </div>
                <div className="text-xl lg:text-2xl font-bold text-blue-900">{tendencias.mediaDiaria}</div>
                <div className="text-xs lg:text-sm text-blue-700">registros/dia</div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center space-x-1 lg:space-x-2 mb-2">
                  <Activity className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
                  <span className="font-medium text-green-800 text-xs lg:text-sm">Atividades/Registro</span>
                </div>
                <div className="text-xl lg:text-2xl font-bold text-green-900">{tendencias.mediaAtividades}</div>
                <div className="text-xs lg:text-sm text-green-700">em média</div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center space-x-1 lg:space-x-2 mb-2">
                  <Users className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
                  <span className="font-medium text-purple-800 text-xs lg:text-sm">Usuários Ativos</span>
                </div>
                <div className="text-xl lg:text-2xl font-bold text-purple-900">{estatisticas.usuariosAtivos}</div>
                <div className="text-xs lg:text-sm text-purple-700">de {(dados.usuarios || []).length} total</div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center space-x-1 lg:space-x-2 mb-2">
                  <Home className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
                  <span className="font-medium text-orange-800 text-xs lg:text-sm">Suítes Atendidas</span>
                </div>
                <div className="text-xl lg:text-2xl font-bold text-orange-900">{estatisticas.suitesAtendidas}</div>
                <div className="text-xs lg:text-sm text-orange-700">de {(dados.suites || []).length} total</div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center space-x-1 lg:space-x-2 mb-2">
                  <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-red-600" />
                  <span className="font-medium text-red-800 text-xs lg:text-sm">Cancelamentos</span>
                </div>
                <div className="text-xl lg:text-2xl font-bold text-red-900">{estatisticas.totalCancelamentos}</div>
                <div className="text-xs lg:text-sm text-red-700">no período</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAnaliseDetalhada = () => {
    const produtividade = calcularProdutividadePorUsuario();
    
    return (
      <div className="space-y-6">
        {/* Produtividade Detalhada por Funcionário */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-500" />
              Análise Detalhada por Funcionário
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {produtividade.map((prod) => (
                <div key={prod.usuario.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{prod.usuario.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">{prod.usuario.profile}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-800">{prod.percentualConclusao}%</div>
                      <div className="text-sm text-gray-600">Eficiência</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">{prod.totalRegistros}</div>
                      <div className="text-xs text-gray-600">Total Registros</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">{prod.registrosConcluidos}</div>
                      <div className="text-xs text-gray-600">Concluídos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-purple-600">{prod.atividadesRealizadas}/{prod.totalAtividades}</div>
                      <div className="text-xs text-gray-600">Atividades ({prod.percentualAtividades}%)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-600">{prod.cancelamentos}</div>
                      <div className="text-xs text-gray-600">Cancelamentos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-orange-600">{formatarTempo(prod.tempoTotal)}</div>
                      <div className="text-xs text-gray-600">Tempo Total</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Conclusão</span>
                      <span>{prod.percentualConclusao}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${prod.percentualConclusao}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAnaliseOperacional = () => {
    const registrosPorArea = {
      recepcao: registrosRecepcao,
      camararia: registrosCamararia,
      revisao: registrosRevisao,
      areas_comuns: registrosAreasComuns,
      atividades_extras: registrosAtividadesExtras,
      atividades_diarias: registrosAtividadesDiarias,
      gestao: registrosGestao,
      cozinha: registrosCozinha,
      vendas: registrosVendas,
      manutencao: manutencoes
    };

    return (
      <div className="space-y-6">
        {/* Visão Geral por Setor */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Building className="w-5 h-5 mr-2 text-blue-500" />
              Análise Operacional por Setor
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Clique em cada setor para ver detalhes dos registros
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {setores.map((setor) => {
                const registrosSetor = registrosPorArea[setor.id] || [];
                const concluidos = registrosSetor.filter((r: any) =>
                  r.status === 'concluido' || r.status === 'concluida'
                ).length;
                const eficiencia = registrosSetor.length > 0
                  ? Math.round((concluidos / registrosSetor.length) * 100)
                  : 0;
                const funcionarios = new Set(registrosSetor.map((r: any) => r.usuario_executor_id || r.usuario_id)).size;
                const Icon = setor.icon;
                const isExpanded = expandedSectors.includes(setor.id);

                return (
                  <div key={setor.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSector(setor.id)}
                      className={`w-full p-6 bg-${setor.color}-50 border-b border-${setor.color}-200 text-left hover:bg-${setor.color}-100 transition-colors duration-200`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 bg-${setor.color}-100 rounded-lg`}>
                            <Icon className={`w-6 h-6 text-${setor.color}-600`} />
                          </div>
                          <div>
                            <h3 className={`text-lg font-semibold text-${setor.color}-800`}>{setor.label}</h3>
                            <p className={`text-sm text-${setor.color}-600`}>
                              {registrosSetor.length} registros • {eficiencia}% eficiência
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 bg-${setor.color}-200 text-${setor.color}-800 text-sm font-medium rounded-full`}>
                            {funcionarios} funcionários
                          </span>
                          {isExpanded ? (
                            <ChevronUp className={`w-5 h-5 text-${setor.color}-600`} />
                          ) : (
                            <ChevronDown className={`w-5 h-5 text-${setor.color}-600`} />
                          )}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-6 space-y-4">
                        {/* Estatísticas da Área */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-800">{registrosSetor.length}</p>
                            <p className="text-sm text-gray-600">Total</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{concluidos}</p>
                            <p className="text-sm text-gray-600">Concluídos</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">{eficiencia}%</p>
                            <p className="text-sm text-gray-600">Eficiência</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-purple-600">{funcionarios}</p>
                            <p className="text-sm text-gray-600">Funcionários</p>
                          </div>
                        </div>

                        {/* Registros Recentes */}
                        {registrosSetor.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-800 mb-3">Registros Recentes</h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {registrosSetor.slice(0, 10).map((registro: any, index: number) => (
                                <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <Calendar className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm font-medium text-gray-800">
                                          {formatarData(registro.data)}
                                        </span>
                                        {registro.suite_id && (
                                          <>
                                            <span className="text-gray-400">•</span>
                                            <Home className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                              {getSuiteNome(registro.suite_id)}
                                            </span>
                                          </>
                                        )}
                                        {registro.local && (
                                          <>
                                            <span className="text-gray-400">•</span>
                                            <MapPin className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                              {registro.local}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                                        <User className="w-3 h-3" />
                                        <span>{getUsuarioNome(registro.usuario_executor_id || registro.usuario_id)}</span>
                                        {registro.hora_fim && (
                                          <>
                                            <span>•</span>
                                            <Clock className="w-3 h-3" />
                                            <span>{formatarHorario(registro.hora_fim)}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="ml-3">
                                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        registro.status === 'concluido' || registro.status === 'concluida'
                                          ? 'bg-green-100 text-green-800'
                                          : registro.status === 'em_andamento'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {registro.status === 'concluido' || registro.status === 'concluida' 
                                          ? 'Concluído' 
                                          : registro.status === 'em_andamento'
                                          ? 'Em Andamento'
                                          : registro.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const theme = getProfileTheme();
  const ThemeIcon = theme.icon;
  const dataAtual = getDataAtualFormatada(); // Usar função que considera fuso brasileiro

  const estatisticasAvancadas = calcularEstatisticasAvancadas();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Personalizado para Admin */}
      <div className={`bg-gradient-to-r ${theme.gradient} rounded-lg shadow-lg p-4 lg:p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 lg:space-x-4">
            <div className="p-2 lg:p-3 bg-white bg-opacity-20 rounded-full">
              <ThemeIcon className="w-6 h-6 lg:w-8 lg:h-8" />
            </div>
            <div>
              <h1 className="text-xl lg:text-3xl font-bold">{timeOfDay}, {user?.name}!</h1>
              <p className="text-white text-opacity-90 mt-1 text-sm lg:text-base">{theme.title}</p>
              <p className="text-white text-opacity-75 text-xs lg:text-sm mt-1 capitalize hidden lg:block">{dataAtual}</p>
            </div>
          </div>
          <div className="text-right hidden lg:block">
            <div className="text-xl lg:text-2xl font-bold">
              {currentTime.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'America/Sao_Paulo'
              })}
              <span className="text-base lg:text-lg">:{currentTime.toLocaleTimeString('pt-BR', { 
                second: '2-digit',
                timeZone: 'America/Sao_Paulo'
              }).split(':')[2]}</span>
            </div>
            <div className="text-white text-opacity-75 text-sm">Horário atual</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Centro de Inteligência de Dados</h2>
          <p className="text-gray-600 text-sm lg:text-base">Análise avançada de produtividade e performance operacional</p>
        </div>
        <div className="flex items-center space-x-2 lg:space-x-3">
          <button
            onClick={carregarDados}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors lg:block hidden"
            title="Atualizar dados"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={exportarRelatorioCompleto}
            className="bg-green-600 text-white px-3 lg:px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-1 lg:space-x-2 transition-colors duration-200 text-sm lg:text-base"
          >
            <Download className="w-4 h-4" />
            <span className="hidden lg:inline">Exportar Completo</span>
            <span className="lg:hidden">Exportar</span>
          </button>
        </div>
      </div>

      {/* Filtros Avançados */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Indicador de Filtros Aplicados */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Filter className="w-5 h-5 mr-2 text-blue-500" />
              Filtros de Dados
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Período aplicado:</span>
              <span className="font-medium text-blue-600">
                {formatarData(filtrosAplicados.dataInicio)} até {formatarData(filtrosAplicados.dataFim)}
              </span>
              {(filtrosAplicados.usuario || filtrosAplicados.suite) && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Filtros ativos
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Filtrar Usuário
            </label>
            <select
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Todos os usuários</option>
              {dados.usuarios.map((usuario: any) => (
                <option key={usuario.id} value={usuario.id}>{usuario.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Home className="w-4 h-4 inline mr-1" />
              Filtrar Suíte
            </label>
            <select
              value={filtroSuite}
              onChange={(e) => setFiltroSuite(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Todas as suítes</option>
              {dados.suites.map((suite: any) => (
                <option key={suite.id} value={suite.id}>Suíte {suite.name}</option>
              ))}
            </select>
          </div>
        </div>
          
          {/* Botões de Ação */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>💡 Dica:</span>
              <span>Ajuste os filtros e clique em "Aplicar Filtros" para atualizar os dados</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={limparFiltros}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 transition-colors duration-200 text-sm"
              >
                <X className="w-4 h-4" />
                <span>Limpar</span>
              </button>
              <button
                onClick={aplicarFiltros}
                disabled={loading}
                className={`px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200 text-sm font-medium ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed text-white' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>{loading ? 'Carregando...' : 'Aplicar Filtros'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de Relatórios */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 lg:space-x-8 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard Inteligência', icon: BarChart3 },
            { id: 'analise-detalhada', label: 'Análise Detalhada', icon: TrendingUp },
            { id: 'operacional', label: 'Visão Operacional', icon: Activity }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setRelatorioSelecionado(tab.id)}
                className={`group inline-flex items-center py-4 px-2 lg:px-1 border-b-2 font-medium text-xs lg:text-sm whitespace-nowrap ${
                  relatorioSelecionado === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`mr-2 w-5 h-5 ${
                  relatorioSelecionado === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                }`} />
                <span className="hidden lg:inline">{tab.label}</span>
                <span className="lg:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Conteúdo dos Relatórios */}
      {relatorioSelecionado === 'dashboard' && renderDashboardInteligencia()}
      {relatorioSelecionado === 'analise-detalhada' && renderAnaliseDetalhada()}
      {relatorioSelecionado === 'operacional' && renderAnaliseOperacional()}
    </div>
  );
};

export default Relatorios;