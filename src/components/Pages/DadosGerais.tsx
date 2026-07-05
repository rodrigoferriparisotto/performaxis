import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../contexts/AuthContext';
import {
  Database,
  Activity,
  CheckCircle,
  Clock,
  TrendingUp,
  Download,
  Filter,
  BarChart3,
  Crown,
  Phone,
  Bed,
  Eye,
  Building,
  Sun,
  Moon,
  Briefcase,
  ChefHat,
  Wrench,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronDown
} from 'lucide-react';
import {
  usuarioService,
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
  suiteService,
  atividadeService,
  empresaService
} from '../../services/supabaseService';
import { formatarData, getBrazilDate, getDataAtualFormatada } from '../../utils/dateUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const DadosGerais: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [dadosGerais, setDadosGerais] = useState<any>(null);
  const [graficoPorTipo, setGraficoPorTipo] = useState<any[]>([]);
  const [graficoEficiencia, setGraficoEficiencia] = useState<any[]>([]);
  const [ordenacaoEficiencia, setOrdenacaoEficiencia] = useState<'eficiencia' | 'alfabetica' | 'padrao'>('padrao');

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316'];

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
    const hoje = getBrazilDate();
    const trintaDiasAtras = getBrazilDate();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    setDataFim(`${ano}-${mes}-${dia}`);
    
    const anoInicio = trintaDiasAtras.getFullYear();
    const mesInicio = String(trintaDiasAtras.getMonth() + 1).padStart(2, '0');
    const diaInicio = String(trintaDiasAtras.getDate()).padStart(2, '0');
    setDataInicio(`${anoInicio}-${mesInicio}-${diaInicio}`);
    
    return () => {
      clearInterval(timeInterval);
    };
  }, []);

  useEffect(() => {
    if (dataInicio && dataFim) {
      carregarDados();
    }
  }, [dataInicio, dataFim]);

  const carregarDados = async () => {
    setLoading(true);
    try {

      // Carregar dados básicos
      const [usuarios, suites, atividades, empresa] = await Promise.all([
        usuarioService.getUsuarios(),
        suiteService.getSuites(),
        atividadeService.getAtividades(),
        empresaService.getEmpresa()
      ]);

      // Carregar todos os registros
      const [
        registrosRecepcao,
        registrosCamararia,
        registrosRevisao,
        registrosAreasComuns,
        registrosAtividadesExtras,
        registrosAtividadesDiarias,
        registrosGestao,
        registrosCozinha,
        registrosVendas,
        manutencoes
      ] = await Promise.all([
        registroRecepcaoService.getRegistrosByPeriodo(dataInicio, dataFim),
        registroCamarariaService.getRegistrosByPeriodo(dataInicio, dataFim),
        registroRevisaoService.getRegistrosByPeriodo(dataInicio, dataFim),
        registroAreasComunsService.getRegistrosByPeriodo(dataInicio, dataFim),
        registroAtividadesExtrasService.getRegistrosByPeriodo(dataInicio, dataFim),
        registroAtividadesDiariasService.getRegistrosByPeriodo(dataInicio, dataFim),
        registroGestaoService.getRegistrosByPeriodo(dataInicio, dataFim),
        registroCozinhaService.getRegistrosByPeriodo(dataInicio, dataFim),
        registroVendasService.getRegistrosByPeriodo(dataInicio, dataFim),
        manutencaoService.getManutencoesByPeriodo(dataInicio, dataFim)
      ]);

      // Combinar todos os registros
      const todosRegistros = [
        ...registrosRecepcao,
        ...registrosCamararia,
        ...registrosRevisao,
        ...registrosAreasComuns,
        ...registrosAtividadesExtras,
        ...registrosAtividadesDiarias,
        ...registrosGestao,
        ...registrosCozinha,
        ...registrosVendas
      ];

      // Calcular estatísticas gerais
      const totalRegistros = todosRegistros.length;
      const registrosConcluidos = todosRegistros.filter(r => r.status === 'concluido').length;
      const taxaConclusao = totalRegistros > 0 ? (registrosConcluidos / totalRegistros) * 100 : 0;

      let totalAtividades = 0;
      let atividadesRealizadas = 0;
      let tempoTotalMinutos = 0;
      let registrosComTempo = 0;

      todosRegistros.forEach(registro => {
        if (registro.atividades && Array.isArray(registro.atividades)) {
          totalAtividades += registro.atividades.length;
          atividadesRealizadas += registro.atividades.filter(a => a.status === 'realizada').length;
        }

        if (registro.hora_inicio && registro.hora_fim) {
          const inicio = new Date(registro.hora_inicio);
          const fim = new Date(registro.hora_fim);
          const tempoRegistro = Math.floor((fim.getTime() - inicio.getTime()) / (1000 * 60));
          tempoTotalMinutos += tempoRegistro;
          registrosComTempo++;
        }
      });

      const eficienciaGeral = totalAtividades > 0 ? (atividadesRealizadas / totalAtividades) * 100 : 0;
      const tempoMedio = registrosComTempo > 0 ? tempoTotalMinutos / registrosComTempo : 0;

      // Calcular usuários ativos e limite
      const usuariosAtivos = usuarios.filter(u => u.active).length;
      const limiteUsuarios = empresa?.numero_usuarios || 0;

      // Dados por tipo de registro
      const dadosPorTipo = [
        { nome: 'Recepção', quantidade: registrosRecepcao.length, cor: '#3B82F6' },
        { nome: 'Camararia', quantidade: registrosCamararia.length, cor: '#10B981' },
        { nome: 'Revisão', quantidade: registrosRevisao.length, cor: '#F59E0B' },
        { nome: 'Áreas Comuns', quantidade: registrosAreasComuns.length, cor: '#8B5CF6' },
        { nome: 'Atividades Extras', quantidade: registrosAtividadesExtras.length, cor: '#EF4444' },
        { nome: 'Atividades Diárias', quantidade: registrosAtividadesDiarias.length, cor: '#06B6D4' },
        { nome: 'Gestão', quantidade: registrosGestao.length, cor: '#F97316' },
        { nome: 'Cozinha', quantidade: registrosCozinha.length, cor: '#14B8A6' },
        { nome: 'Vendas', quantidade: registrosVendas.length, cor: '#A855F7' },
        { nome: 'Manutenção', quantidade: manutencoes.length, cor: '#EC4899' }
      ].filter(item => item.quantidade > 0);

      setGraficoPorTipo(dadosPorTipo);

      // Dados de eficiência por setor
      const eficienciaPorSetor = [
        {
          setor: 'Recepção',
          eficiencia: calcularEficienciaSetor(registrosRecepcao)
        },
        {
          setor: 'Camararia',
          eficiencia: calcularEficienciaSetor(registrosCamararia)
        },
        {
          setor: 'Revisão',
          eficiencia: calcularEficienciaSetor(registrosRevisao)
        },
        {
          setor: 'Áreas Comuns',
          eficiencia: calcularEficienciaSetor(registrosAreasComuns)
        },
        {
          setor: 'Atividades Extras',
          eficiencia: calcularEficienciaSetor(registrosAtividadesExtras)
        },
        {
          setor: 'Atividades Diárias',
          eficiencia: calcularEficienciaSetor(registrosAtividadesDiarias)
        },
        {
          setor: 'Gestão',
          eficiencia: calcularEficienciaSetor(registrosGestao)
        },
        {
          setor: 'Cozinha',
          eficiencia: calcularEficienciaSetor(registrosCozinha)
        },
        {
          setor: 'Vendas',
          eficiencia: calcularEficienciaSetor(registrosVendas)
        },
        {
          setor: 'Manutenção',
          eficiencia: calcularEficienciaManutencao(manutencoes)
        }
      ].filter(item => item.eficiencia > 0);

      setGraficoEficiencia(eficienciaPorSetor);

      setDadosGerais({
        // Dados básicos do sistema
        totalUsuarios: usuarios.length,
        usuariosAtivos,
        limiteUsuarios,
        totalSuites: suites.length,
        totalAtividadesCadastradas: atividades.length,
        empresa,

        // Estatísticas do período
        totalRegistros,
        registrosConcluidos,
        taxaConclusao,
        totalAtividades,
        atividadesRealizadas,
        eficienciaGeral,
        tempoTotalMinutos,
        tempoMedio,
        totalManutencoes: manutencoes.length,
        manutencoesCompletas: manutencoes.filter(m => m.status === 'concluida').length,

        // Breakdown por tipo
        registrosPorTipo: {
          recepcao: registrosRecepcao.length,
          camararia: registrosCamararia.length,
          revisao: registrosRevisao.length,
          areasComuns: registrosAreasComuns.length,
          atividadesExtras: registrosAtividadesExtras.length,
          atividadesDiarias: registrosAtividadesDiarias.length,
          gestao: registrosGestao.length,
          cozinha: registrosCozinha.length,
          vendas: registrosVendas.length,
          manutencao: manutencoes.length
        }
      });

    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const calcularEficienciaSetor = (registros: any[]) => {
    let totalAtividades = 0;
    let atividadesRealizadas = 0;

    registros.forEach(registro => {
      if (registro.atividades && Array.isArray(registro.atividades)) {
        totalAtividades += registro.atividades.length;
        atividadesRealizadas += registro.atividades.filter(a => a.status === 'realizada').length;
      }
    });

    return totalAtividades > 0 ? (atividadesRealizadas / totalAtividades) * 100 : 0;
  };

  const calcularEficienciaManutencao = (manutencoes: any[]) => {
    const total = manutencoes.length;
    const concluidas = manutencoes.filter(m => m.status === 'concluida').length;
    return total > 0 ? (concluidas / total) * 100 : 0;
  };

  const getIconeSetor = (setor: string) => {
    switch (setor) {
      case 'Recepção':
        return { Icon: Phone, cor: 'blue' };
      case 'Camararia':
        return { Icon: Bed, cor: 'green' };
      case 'Revisão':
        return { Icon: Eye, cor: 'amber' };
      case 'Áreas Comuns':
        return { Icon: Building, cor: 'purple' };
      case 'Atividades Extras':
        return { Icon: Sun, cor: 'orange' };
      case 'Atividades Diárias':
        return { Icon: Moon, cor: 'indigo' };
      case 'Gestão':
        return { Icon: Briefcase, cor: 'slate' };
      case 'Cozinha':
        return { Icon: ChefHat, cor: 'teal' };
      case 'Vendas':
        return { Icon: TrendingUp, cor: 'violet' };
      case 'Manutenção':
        return { Icon: Wrench, cor: 'red' };
      default:
        return { Icon: Activity, cor: 'gray' };
    }
  };

  const getCorEficiencia = (eficiencia: number) => {
    if (eficiencia >= 90) return { bg: 'bg-emerald-500', text: 'text-emerald-700', bgLight: 'bg-emerald-50', border: 'border-emerald-200' };
    if (eficiencia >= 70) return { bg: 'bg-green-500', text: 'text-green-700', bgLight: 'bg-green-50', border: 'border-green-200' };
    if (eficiencia >= 50) return { bg: 'bg-amber-500', text: 'text-amber-700', bgLight: 'bg-amber-50', border: 'border-amber-200' };
    if (eficiencia >= 30) return { bg: 'bg-orange-500', text: 'text-orange-700', bgLight: 'bg-orange-50', border: 'border-orange-200' };
    return { bg: 'bg-red-500', text: 'text-red-700', bgLight: 'bg-red-50', border: 'border-red-200' };
  };

  const getStatusEficiencia = (eficiencia: number) => {
    if (eficiencia >= 90) return { label: 'Excelente', Icon: ArrowUp };
    if (eficiencia >= 70) return { label: 'Bom', Icon: ArrowUp };
    if (eficiencia >= 50) return { label: 'Regular', Icon: Minus };
    if (eficiencia >= 30) return { label: 'Atenção', Icon: ArrowDown };
    return { label: 'Crítico', Icon: ArrowDown };
  };

  const ordenarEficiencia = (dados: any[]) => {
    switch (ordenacaoEficiencia) {
      case 'eficiencia':
        return [...dados].sort((a, b) => b.eficiencia - a.eficiencia);
      case 'alfabetica':
        return [...dados].sort((a, b) => a.setor.localeCompare(b.setor));
      default:
        return dados;
    }
  };

  const exportarPDF = () => {
    if (!dadosGerais) return;

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.text('Dados Gerais do Sistema', 20, 20);
    
    // Período
    doc.setFontSize(12);
    doc.text(`Período: ${formatarData(dataInicio)} a ${formatarData(dataFim)}`, 20, 35);
    
    // Estatísticas principais
    let yPosition = 55;
    doc.setFontSize(16);
    doc.text('Estatísticas do Período', 20, yPosition);
    
    const estatisticasPrincipais = [
      ['Total de Registros', dadosGerais.totalRegistros.toString()],
      ['Registros Concluídos', dadosGerais.registrosConcluidos.toString()],
      ['Taxa de Conclusão', `${dadosGerais.taxaConclusao.toFixed(1)}%`],
      ['Eficiência Geral', `${dadosGerais.eficienciaGeral.toFixed(1)}%`],
      ['Tempo Médio por Registro', `${Math.floor(dadosGerais.tempoMedio / 60)}h ${Math.floor(dadosGerais.tempoMedio % 60)}min`],
      ['Total de Atividades', dadosGerais.totalAtividades.toString()],
      ['Atividades Realizadas', dadosGerais.atividadesRealizadas.toString()],
      ['Total de Manutenções', dadosGerais.totalManutencoes.toString()],
      ['Manutenções Completas', dadosGerais.manutencoesCompletas.toString()]
    ];

    autoTable(doc, {
      body: estatisticasPrincipais,
      startY: yPosition + 10,
      theme: 'grid',
      columnStyles: {
        0: { fontStyle: 'bold' }
      }
    });

    // Estatísticas do Sistema
    yPosition = (doc as any).lastAutoTable?.finalY + 20;
    doc.setFontSize(16);
    doc.text('Estatísticas do Sistema', 20, yPosition);
    
    const estatisticasSistema = [
      ['Total de Usuários', dadosGerais.totalUsuarios.toString()],
      ['Usuários Ativos', `${dadosGerais.usuariosAtivos}/${dadosGerais.limiteUsuarios}`],
      ['Total de Suítes', dadosGerais.totalSuites.toString()],
      ['Atividades Cadastradas', dadosGerais.totalAtividadesCadastradas.toString()],
      ['Tempo Total Trabalhado', `${Math.floor(dadosGerais.tempoTotalMinutos / 60)}h ${Math.floor(dadosGerais.tempoTotalMinutos % 60)}min`]
    ];

    autoTable(doc, {
      body: estatisticasSistema,
      startY: yPosition + 10,
      theme: 'grid',
      columnStyles: {
        0: { fontStyle: 'bold' }
      }
    });

    // Breakdown por tipo
    yPosition = (doc as any).lastAutoTable?.finalY + 20;
    doc.setFontSize(16);
    doc.text('Registros por Tipo', 20, yPosition);
    
    const registrosPorTipoData = [
      ['Recepção', dadosGerais.registrosPorTipo.recepcao.toString()],
      ['Camararia', dadosGerais.registrosPorTipo.camararia.toString()],
      ['Revisão', dadosGerais.registrosPorTipo.revisao.toString()],
      ['Áreas Comuns', dadosGerais.registrosPorTipo.areasComuns.toString()],
      ['Atividades Extras', dadosGerais.registrosPorTipo.atividadesExtras.toString()],
      ['Atividades Diárias', dadosGerais.registrosPorTipo.atividadesDiarias.toString()],
      ['Gestão', dadosGerais.registrosPorTipo.gestao.toString()],
      ['Cozinha', dadosGerais.registrosPorTipo.cozinha.toString()],
      ['Vendas', dadosGerais.registrosPorTipo.vendas.toString()],
      ['Manutenção', dadosGerais.registrosPorTipo.manutencao.toString()]
    ];

    autoTable(doc, {
      body: registrosPorTipoData,
      startY: yPosition + 10,
      theme: 'grid',
      columnStyles: {
        0: { fontStyle: 'bold' }
      }
    });

    // Análise de Eficiência por Setor
    yPosition = (doc as any).lastAutoTable?.finalY + 20;
    doc.setFontSize(16);
    doc.text('Análise de Eficiência por Setor', 20, yPosition);
    
    const eficienciaData = graficoEficiencia.map(item => [
      item.setor,
      `${item.eficiencia.toFixed(1)}%`,
      item.eficiencia >= 80 ? 'Excelente' :
      item.eficiencia >= 60 ? 'Boa' :
      item.eficiencia >= 40 ? 'Regular' : 'Baixa'
    ]);

    if (eficienciaData.length > 0) {
      autoTable(doc, {
        head: [['Setor', 'Eficiência', 'Classificação']],
        body: eficienciaData,
        startY: yPosition + 10,
        theme: 'grid'
      });
    }

    // Resumo Executivo
    yPosition = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 20 : yPosition + 30;
    doc.setFontSize(16);
    doc.text('Resumo Executivo', 20, yPosition);
    
    const resumoExecutivo = [
      ['Período de Análise', `${formatarData(dataInicio)} a ${formatarData(dataFim)}`],
      ['Total de Operações', dadosGerais.totalRegistros.toString()],
      ['Performance Geral', `${dadosGerais.eficienciaGeral.toFixed(1)}% de eficiência`],
      ['Setor Mais Produtivo', graficoEficiencia.length > 0 
        ? `${graficoEficiencia.reduce((prev, current) => prev.eficiencia > current.eficiencia ? prev : current).setor} (${graficoEficiencia.reduce((prev, current) => prev.eficiencia > current.eficiencia ? prev : current).eficiencia.toFixed(1)}%)`
        : 'Dados insuficientes'
      ],
      ['Capacidade Utilizada', `${dadosGerais.usuariosAtivos}/${dadosGerais.limiteUsuarios} usuários ativos`],
      ['Infraestrutura', `${dadosGerais.totalSuites} suítes em ${dadosGerais.empresa?.numero_andares || 0} andares`]
    ];

    autoTable(doc, {
      body: resumoExecutivo,
      startY: yPosition + 10,
      theme: 'grid',
      columnStyles: {
        0: { fontStyle: 'bold' }
      }
    });
    doc.save(`dados-gerais-${dataInicio}-${dataFim}.pdf`);
  };

  const dataAtual = getDataAtualFormatada();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Personalizado */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-lg shadow-lg p-4 lg:p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 lg:space-x-4">
            <div className="p-2 lg:p-3 bg-white bg-opacity-20 rounded-full">
              <Crown className="w-6 h-6 lg:w-8 lg:h-8" />
            </div>
            <div>
              <h1 className="text-xl lg:text-3xl font-bold">{timeOfDay}, {user?.name}!</h1>
              <p className="text-white text-opacity-90 mt-1 text-sm lg:text-base">Painel Executivo - Dados Gerais</p>
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dados Gerais</h2>
          <p className="text-gray-600">Visão geral completa do sistema</p>
        </div>
        <button
          onClick={exportarPDF}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2 transition-colors duration-200"
        >
          <Download className="w-4 h-4" />
          <span>Exportar PDF</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Período de Análise</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {dadosGerais && (
        <>
          {/* Estatísticas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Registros</p>
                  <p className="text-2xl font-bold text-gray-800">{dadosGerais.totalRegistros}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Atividades Realizadas</p>
                  <p className="text-2xl font-bold text-gray-800">{dadosGerais.atividadesRealizadas}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Taxa de Conclusão</p>
                  <p className="text-2xl font-bold text-gray-800">{dadosGerais.taxaConclusao.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Tempo Médio</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {Math.floor(dadosGerais.tempoMedio / 60)}h {Math.floor(dadosGerais.tempoMedio % 60)}m
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Estatísticas Secundárias */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Eficiência Geral</p>
                  <p className="text-2xl font-bold text-gray-800">{dadosGerais.eficienciaGeral.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Database className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
                  <p className="text-2xl font-bold text-gray-800">{dadosGerais.usuariosAtivos}/{dadosGerais.limiteUsuarios}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-pink-100 rounded-lg">
                  <Database className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Suítes</p>
                  <p className="text-2xl font-bold text-gray-800">{dadosGerais.totalSuites}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-teal-100 rounded-lg">
                  <Activity className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Atividades Cadastradas</p>
                  <p className="text-2xl font-bold text-gray-800">{dadosGerais.totalAtividadesCadastradas}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Registros por Tipo */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Registros por Tipo</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Gráfico */}
                  <div className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={graficoPorTipo}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ nome, quantidade, percent }) => `${quantidade} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="quantidade"
                        >
                          {graficoPorTipo.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legenda */}
                  <div className="lg:col-span-1">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">Legenda</h4>
                    <div className="space-y-3">
                      {graficoPorTipo.map((item, index) => (
                        <div key={item.nome} className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.nome}</p>
                            <p className="text-xs text-gray-600">
                              {item.quantidade} registros ({((item.quantidade / dadosGerais.totalRegistros) * 100).toFixed(1)}%)
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Total */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Total:</span>
                        <span className="text-sm font-bold text-gray-800">{dadosGerais.totalRegistros} registros</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cards de Eficiência por Área */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Eficiência por Área</h3>
                  <div className="relative">
                    <select
                      value={ordenacaoEficiencia}
                      onChange={(e) => setOrdenacaoEficiencia(e.target.value as any)}
                      className="appearance-none bg-gray-50 border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <option value="padrao">Ordem Padrão</option>
                      <option value="eficiencia">Maior Eficiência</option>
                      <option value="alfabetica">Ordem Alfabética</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {ordenarEficiencia(graficoEficiencia).map((item, index) => {
                    const { Icon, cor } = getIconeSetor(item.setor);
                    const coresEficiencia = getCorEficiencia(item.eficiencia);
                    const status = getStatusEficiencia(item.eficiencia);
                    const StatusIcon = status.Icon;

                    return (
                      <div
                        key={item.setor}
                        className={`group relative bg-white rounded-lg shadow-md border border-gray-200 p-4 transition-all duration-300 cursor-pointer overflow-hidden`}
                        style={{
                          animationDelay: `${index * 50}ms`,
                          animation: 'fadeInUp 0.5s ease-out forwards'
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 bg-${cor}-100 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                              <Icon className={`w-6 h-6 text-${cor}-600`} />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-gray-800 mb-1">{item.setor}</h4>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${coresEficiencia.bgLight} ${coresEficiencia.text}`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {status.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`text-xl font-bold ${coresEficiencia.text} leading-none`}>
                              {item.eficiencia.toFixed(1)}%
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Eficiência</p>
                          </div>
                        </div>

                        <div className="relative">
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`${coresEficiencia.bg} h-2 rounded-full transition-all duration-1000 ease-out shadow-sm`}
                              style={{
                                width: `${item.eficiencia}%`,
                                animation: 'progressFill 1s ease-out forwards'
                              }}
                            ></div>
                          </div>
                          <div className="flex justify-between items-center mt-1.5">
                            <p className="text-xs text-gray-600">
                              Desempenho operacional
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.eficiencia >= 90 ? '🎯' : item.eficiencia >= 70 ? '✨' : item.eficiencia >= 50 ? '📊' : '⚠️'}
                            </p>
                          </div>
                        </div>

                        <div className={`absolute top-0 right-0 w-24 h-24 ${coresEficiencia.bgLight} rounded-full -mr-12 -mt-12 opacity-20 group-hover:opacity-30 transition-opacity duration-300`}></div>
                      </div>
                    );
                  })}
                </div>

                {graficoEficiencia.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h4 className="text-lg font-medium text-gray-800 mb-2">Nenhum dado disponível</h4>
                    <p className="text-gray-600">Os dados de eficiência aparecerão aqui quando houver registros</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <style>{`
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            @keyframes progressFill {
              from {
                width: 0;
              }
            }
          `}</style>

          {/* Detalhamento por Tipo de Registro */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Detalhamento por Tipo de Registro</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentual
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(dadosGerais.registrosPorTipo).map(([tipo, quantidade]) => {
                    const percentual = dadosGerais.totalRegistros > 0 ? ((quantidade as number) / dadosGerais.totalRegistros) * 100 : 0;
                    const nomes = {
                      recepcao: 'Recepção',
                      camararia: 'Camararia',
                      revisao: 'Revisão',
                      areasComuns: 'Áreas Comuns',
                      atividadesExtras: 'Atividades Extras',
                      atividadesDiarias: 'Atividades Diárias',
                      gestao: 'Gestão',
                      cozinha: 'Cozinha',
                      vendas: 'Vendas',
                      manutencao: 'Manutenção'
                    };

                    return (
                      <tr key={tipo} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {nomes[tipo as keyof typeof nomes]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {quantidade as number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {percentual.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DadosGerais;