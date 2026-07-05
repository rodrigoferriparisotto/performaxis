import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Activity,
  CheckCircle,
  Download,
  Filter,
  TrendingUp,
  ChefHat,
  Phone,
  Bed,
  Eye,
  Building2,
  Sun,
  Moon,
  Briefcase,
  Wrench,
  ArrowUpDown
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
  manutencaoService,
  atividadeService
} from '../../services/supabaseService';
import { formatarData } from '../../utils/dateUtils';
import { getBrazilDate } from '../../utils/dateUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AnaliseOperacional: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [analiseSetores, setAnaliseSetores] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [ordenacao, setOrdenacao] = useState<'padrao' | 'eficiencia' | 'alfabetica' | 'registros'>('padrao');

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (dataInicio && dataFim) {
      carregarDados();
    }
  }, [dataInicio, dataFim]);

  const carregarDados = async () => {
    setLoading(true);
    try {

      // Carregar usuários e atividades
      const [usuariosData, todasAtividades] = await Promise.all([
        usuarioService.getUsuarios(),
        atividadeService.getAtividades()
      ]);
      
      setUsuarios(usuariosData);

      // Carregar registros por setor
      const [
        registrosRecepcao,
        registrosCamararia,
        registrosRevisao,
        registrosAreasComuns,
        registrosAtividadesExtras,
        registrosAtividadesDiarias,
        registrosGestao,
        registrosCozinha,
        registrosManutencao
      ] = await Promise.all([
        registroRecepcaoService.getRegistrosByPeriodo(dataInicio, dataFim),
        registroCamarariaService.getRegistrosByPeriodo(dataInicio, dataFim),
        registroRevisaoService.getRegistrosByPeriodo(dataInicio, dataFim),
        registroAreasComunsService.getRegistrosByPeriodo(dataInicio, dataFim),
        registroAtividadesExtrasService.getRegistrosByPeriodo(dataInicio, dataFim),
        registroAtividadesDiariasService.getRegistrosByPeriodo(dataInicio, dataFim),
        registroGestaoService.getRegistrosByPeriodo(dataInicio, dataFim),
        registroCozinhaService.getRegistrosByPeriodo(dataInicio, dataFim),
        manutencaoService.getManutencoesByPeriodo(dataInicio, dataFim)
      ]);

      // Processar análise por setor
      const setores = [
        {
          nome: 'Recepção',
          tipo: 'recepcao',
          registros: registrosRecepcao,
          atividades: todasAtividades.filter(a => a.type === 'recepcao'),
          cor: 'blue'
        },
        {
          nome: 'Camararia',
          tipo: 'camararia',
          registros: registrosCamararia,
          atividades: todasAtividades.filter(a => a.type === 'camararia'),
          cor: 'green'
        },
        {
          nome: 'Revisão',
          tipo: 'revisao',
          registros: registrosRevisao,
          atividades: todasAtividades.filter(a => a.type === 'revisao'),
          cor: 'yellow'
        },
        {
          nome: 'Áreas Comuns',
          tipo: 'areas_comuns',
          registros: registrosAreasComuns,
          atividades: todasAtividades.filter(a => a.type === 'areas_comuns'),
          cor: 'amber'
        },
        {
          nome: 'Atividades Extras',
          tipo: 'atividades_extras',
          registros: registrosAtividadesExtras,
          atividades: todasAtividades.filter(a => a.type === 'diurno' || a.type === 'atividades_extras'),
          cor: 'orange'
        },
        {
          nome: 'Atividades Diárias',
          tipo: 'atividades_diarias',
          registros: registrosAtividadesDiarias,
          atividades: todasAtividades.filter(a => a.type === 'noturno' || a.type === 'atividades_diarias'),
          cor: 'slate'
        },
        {
          nome: 'Gestão',
          tipo: 'gestao',
          registros: registrosGestao,
          atividades: todasAtividades.filter(a => a.type === 'gestao'),
          cor: 'pink'
        },
        {
          nome: 'Cozinha',
          tipo: 'cozinha',
          registros: registrosCozinha,
          atividades: todasAtividades.filter(a => a.type === 'cozinha'),
          cor: 'teal'
        },
        {
          nome: 'Manutenção',
          tipo: 'manutencao',
          registros: registrosManutencao,
          atividades: [],
          cor: 'red'
        }
      ];

      const analise = setores.map(setor => {
        // Funcionários vinculados ao setor
        const funcionariosSetor = usuariosData.filter(u => {
          switch (setor.tipo) {
            case 'recepcao': return u.profile === 'recepcao';
            case 'camararia': return u.profile === 'camararia';
            case 'revisao': return u.profile === 'revisao';
            case 'areas_comuns': return u.profile === 'areas_comuns';
            case 'atividades_extras': return u.profile === 'atividades_extras';
            case 'atividades_diarias': return u.profile === 'atividades_diarias';
            case 'gestao': return u.profile === 'gestor';
            case 'cozinha': return u.profile === 'cozinha';
            case 'manutencao': return u.profile === 'manutencao';
            default: return false;
          }
        });

        // Calcular estatísticas
        const totalRegistros = setor.registros.length;
        const registrosConcluidos = setor.registros.filter(r =>
          r.status === 'concluido' || r.status === 'concluida'
        ).length;
        
        let totalAtividades = 0;
        let atividadesRealizadas = 0;

        setor.registros.forEach(registro => {
          if (registro.atividades && Array.isArray(registro.atividades)) {
            totalAtividades += registro.atividades.length;
            atividadesRealizadas += registro.atividades.filter(a => a.status === 'realizada').length;
          }
        });

        const eficiencia = totalAtividades > 0 ? (atividadesRealizadas / totalAtividades) * 100 : 0;
        const taxaConclusao = totalRegistros > 0 ? (registrosConcluidos / totalRegistros) * 100 : 0;

        return {
          ...setor,
          totalRegistros,
          registrosConcluidos,
          funcionariosVinculados: funcionariosSetor.length,
          totalAtividades,
          atividadesRealizadas,
          eficiencia,
          taxaConclusao,
          funcionarios: funcionariosSetor
        };
      });

      setAnaliseSetores(analise);

    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const getSetorIcon = (tipo: string) => {
    const iconClass = "w-12 h-12";
    switch (tipo) {
      case 'recepcao': return <Phone className={iconClass} />;
      case 'camararia': return <Bed className={iconClass} />;
      case 'revisao': return <Eye className={iconClass} />;
      case 'areas_comuns': return <Building2 className={iconClass} />;
      case 'atividades_extras': return <Sun className={iconClass} />;
      case 'atividades_diarias': return <Moon className={iconClass} />;
      case 'gestao': return <Briefcase className={iconClass} />;
      case 'cozinha': return <ChefHat className={iconClass} />;
      case 'manutencao': return <Wrench className={iconClass} />;
      default: return <Activity className={iconClass} />;
    }
  };

  const getSetorColors = (tipo: string) => {
    switch (tipo) {
      case 'recepcao': return { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', gradient: 'from-blue-50 to-blue-100' };
      case 'camararia': return { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200', gradient: 'from-green-50 to-green-100' };
      case 'revisao': return { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200', gradient: 'from-amber-50 to-amber-100' };
      case 'areas_comuns': return { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200', gradient: 'from-purple-50 to-purple-100' };
      case 'atividades_extras': return { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', gradient: 'from-orange-50 to-orange-100' };
      case 'atividades_diarias': return { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200', gradient: 'from-indigo-50 to-indigo-100' };
      case 'gestao': return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', gradient: 'from-slate-50 to-slate-100' };
      case 'cozinha': return { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200', gradient: 'from-teal-50 to-teal-100' };
      case 'manutencao': return { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200', gradient: 'from-red-50 to-red-100' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', gradient: 'from-gray-50 to-gray-100' };
    }
  };

  const getPerformanceStatus = (eficiencia: number) => {
    if (eficiencia >= 90) return { label: 'Excelente', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    if (eficiencia >= 70) return { label: 'Bom', color: 'bg-green-100 text-green-800 border-green-200' };
    if (eficiencia >= 50) return { label: 'Regular', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    if (eficiencia >= 30) return { label: 'Atenção', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    return { label: 'Crítico', color: 'bg-red-100 text-red-800 border-red-200' };
  };

  const getProgressBarColor = (eficiencia: number) => {
    if (eficiencia >= 90) return 'bg-emerald-500';
    if (eficiencia >= 70) return 'bg-green-500';
    if (eficiencia >= 50) return 'bg-yellow-500';
    if (eficiencia >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const ordenarSetores = (setores: any[]) => {
    const setoresOrdenados = [...setores];
    switch (ordenacao) {
      case 'eficiencia':
        return setoresOrdenados.sort((a, b) => b.eficiencia - a.eficiencia);
      case 'alfabetica':
        return setoresOrdenados.sort((a, b) => a.nome.localeCompare(b.nome));
      case 'registros':
        return setoresOrdenados.sort((a, b) => b.totalRegistros - a.totalRegistros);
      default:
        return setoresOrdenados;
    }
  };

  const exportarPDF = () => {
    if (!analiseSetores.length) return;

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.text('Análise Operacional por Setor', 20, 20);
    
    // Período
    doc.setFontSize(12);
    doc.text(`Período: ${formatarData(dataInicio)} a ${formatarData(dataFim)}`, 20, 35);
    
    // Resumo Geral
    doc.setFontSize(16);
    doc.text('Resumo Geral', 20, 55);
    
    const totalRegistrosGeral = analiseSetores.reduce((acc, setor) => acc + setor.totalRegistros, 0);
    const totalAtividadesGeral = analiseSetores.reduce((acc, setor) => acc + setor.atividadesRealizadas, 0);
    const eficienciaMediaGeral = analiseSetores.length > 0 
      ? (analiseSetores.reduce((acc, setor) => acc + setor.eficiencia, 0) / analiseSetores.length).toFixed(1)
      : '0';
    
    const resumoData = [
      ['Total de Setores Analisados', analiseSetores.length.toString()],
      ['Total de Registros', totalRegistrosGeral.toString()],
      ['Total de Atividades Realizadas', totalAtividadesGeral.toString()],
      ['Eficiência Média Geral', `${eficienciaMediaGeral}%`],
      ['Melhor Setor', analiseSetores.length > 0 
        ? `${analiseSetores.reduce((prev, current) => prev.eficiencia > current.eficiencia ? prev : current).nome} (${analiseSetores.reduce((prev, current) => prev.eficiencia > current.eficiencia ? prev : current).eficiencia.toFixed(1)}%)`
        : '-'
      ],
      ['Setor com Menor Eficiência', analiseSetores.length > 0 
        ? `${analiseSetores.reduce((prev, current) => prev.eficiencia < current.eficiencia ? prev : current).nome} (${analiseSetores.reduce((prev, current) => prev.eficiencia < current.eficiencia ? prev : current).eficiencia.toFixed(1)}%)`
        : '-'
      ]
    ];

    autoTable(doc, {
      body: resumoData,
      startY: 65,
      theme: 'grid',
      columnStyles: {
        0: { fontStyle: 'bold' }
      }
    });
    
    // Dados da tabela
    let yPosition = doc.lastAutoTable?.finalY + 20;
    doc.setFontSize(16);
    doc.text('Análise Detalhada por Setor', 20, yPosition);
    
    const tableData = analiseSetores.map(setor => [
      setor.nome,
      setor.totalRegistros.toString(),
      `${setor.eficiencia.toFixed(1)}%`,
      `${setor.taxaConclusao.toFixed(1)}%`,
      setor.funcionariosVinculados.toString(),
      `${setor.atividadesRealizadas}/${setor.totalAtividades}`
    ]);

    autoTable(doc, {
      head: [['Setor', 'Registros', 'Eficiência', 'Taxa Conclusão', 'Funcionários', 'Atividades']],
      body: tableData,
      startY: yPosition + 10,
      theme: 'grid'
    });
    
    // Detalhamento dos Funcionários por Setor
    yPosition = doc.lastAutoTable?.finalY + 20;
    doc.setFontSize(16);
    doc.text('Funcionários por Setor', 20, yPosition);
    
    const funcionariosData: any[] = [];
    analiseSetores.forEach(setor => {
      if (setor.funcionarios && setor.funcionarios.length > 0) {
        setor.funcionarios.forEach((funcionario: any) => {
          funcionariosData.push([
            setor.nome,
            funcionario.name,
            funcionario.profile,
            funcionario.active ? 'Ativo' : 'Inativo'
          ]);
        });
      }
    });
    
    if (funcionariosData.length > 0) {
      autoTable(doc, {
        head: [['Setor', 'Nome', 'Perfil', 'Status']],
        body: funcionariosData,
        startY: yPosition + 10,
        theme: 'grid'
      });
    }

    doc.save(`analise-operacional-${dataInicio}-${dataFim}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Análise Operacional por Setor</h1>
          <p className="text-gray-600">Performance e eficiência de cada área operacional</p>
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
          <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
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

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Setores</p>
              <p className="text-2xl font-bold text-gray-800">{analiseSetores.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Registros</p>
              <p className="text-2xl font-bold text-gray-800">
                {analiseSetores.reduce((acc, setor) => acc + setor.totalRegistros, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Atividades Realizadas</p>
              <p className="text-2xl font-bold text-gray-800">
                {analiseSetores.reduce((acc, setor) => acc + setor.atividadesRealizadas, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Eficiência Média</p>
              <p className="text-2xl font-bold text-gray-800">
                {analiseSetores.length > 0
                  ? (analiseSetores.reduce((acc, setor) => acc + setor.eficiencia, 0) / analiseSetores.length).toFixed(1)
                  : 0
                }%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Análise por Setor */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Análise Detalhada por Setor</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Setor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Registros
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Eficiência
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Funcionários
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Atividades Realizadas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taxa Conclusão
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analiseSetores.map((setor) => (
                <tr key={setor.tipo} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{setor.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {setor.totalRegistros}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      setor.eficiencia >= 80 ? 'bg-green-100 text-green-800' :
                      setor.eficiencia >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {setor.eficiencia.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {setor.funcionariosVinculados}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {setor.atividadesRealizadas}/{setor.totalAtividades}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      setor.taxaConclusao >= 80 ? 'bg-green-100 text-green-800' :
                      setor.taxaConclusao >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {setor.taxaConclusao.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalhamento por Setor - Cards Modernos */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">Detalhamento Visual por Setor</h3>
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="padrao">Ordem Padrão</option>
              <option value="eficiencia">Maior Eficiência</option>
              <option value="alfabetica">Ordem Alfabética</option>
              <option value="registros">Mais Registros</option>
            </select>
          </div>
        </div>

        <style>
          {`
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
                width: 0%;
              }
            }
            .fade-in-up {
              animation: fadeInUp 0.6s ease-out;
            }
            .progress-bar {
              animation: progressFill 1.5s ease-out;
            }
          `}
        </style>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {ordenarSetores(analiseSetores).map((setor, index) => {
            const colors = getSetorColors(setor.tipo);
            const status = getPerformanceStatus(setor.eficiencia);
            const progressColor = getProgressBarColor(setor.eficiencia);

            return (
              <div
                key={setor.tipo}
                className="fade-in-up bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div className={`bg-gradient-to-br ${colors.gradient} p-6 relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 transition-opacity duration-300 hover:opacity-20"></div>

                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center space-x-4">
                      <div className={`${colors.bg} ${colors.text} p-4 rounded-2xl shadow-md transform transition-transform duration-300 hover:scale-110`}>
                        {getSetorIcon(setor.tipo)}
                      </div>
                      <div>
                        <h4 className="text-2xl font-bold text-gray-800 mb-1">{setor.nome}</h4>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-5xl font-bold text-gray-800 leading-none">
                        {setor.eficiencia.toFixed(0)}
                        <span className="text-2xl text-gray-600">%</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 font-medium">Eficiência</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-800">{setor.totalRegistros}</p>
                      <p className="text-xs text-gray-600 mt-1">Registros</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-800">{setor.funcionariosVinculados}</p>
                      <p className="text-xs text-gray-600 mt-1">Funcionários</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-800">{setor.atividadesRealizadas}</p>
                      <p className="text-xs text-gray-600 mt-1">Atividades</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-700">Progresso de Conclusão</span>
                      <span className="text-sm font-bold text-gray-800">{setor.taxaConclusao.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                      <div
                        className={`progress-bar h-full ${progressColor} rounded-full transition-all duration-1000 shadow-md`}
                        style={{ width: `${setor.taxaConclusao}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Detalhes</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Concluídos:</span>
                        <span className="font-semibold text-gray-800">{setor.registrosConcluidos}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Ativ.:</span>
                        <span className="font-semibold text-gray-800">{setor.totalAtividades}</span>
                      </div>
                    </div>
                  </div>

                  {setor.funcionarios.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                        Equipe ({setor.funcionarios.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {setor.funcionarios.slice(0, 6).map((funcionario: any) => (
                          <span
                            key={funcionario.id}
                            className={`px-3 py-1.5 ${colors.bg} ${colors.text} text-xs font-medium rounded-full border ${colors.border} shadow-sm hover:shadow-md transition-shadow duration-200`}
                          >
                            {funcionario.name}
                          </span>
                        ))}
                        {setor.funcionarios.length > 6 && (
                          <span className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full border border-gray-300">
                            +{setor.funcionarios.length - 6} mais
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnaliseOperacional;