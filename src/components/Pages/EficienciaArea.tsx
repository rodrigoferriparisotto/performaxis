import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Activity,
  Target,
  Download,
  Filter,
  BarChart3,
  CheckCircle,
  XCircle
} from 'lucide-react';
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
  atividadeService
} from '../../services/supabaseService';
import { formatarData, getBrazilDate } from '../../utils/dateUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const EficienciaArea: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [eficienciaPorArea, setEficienciaPorArea] = useState<any[]>([]);
  const [resumoGeral, setResumoGeral] = useState<any>(null);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316', '#EC4899', '#14B8A6', '#F59E0B'];

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

      // Carregar atividades cadastradas
      const todasAtividades = await atividadeService.getAtividades();

      // Carregar registros por área
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
        registroVendasService.getRegistrosByPeriodo(dataInicio, dataFim),
        manutencaoService.getManutencoesByPeriodo(dataInicio, dataFim)
      ]);

      // Definir áreas e seus dados
      const areas = [
        {
          nome: 'Recepção',
          tipo: 'recepcao',
          registros: registrosRecepcao,
          atividadesCadastradas: todasAtividades.filter(a => a.type === 'recepcao'),
          cor: '#3B82F6'
        },
        {
          nome: 'Camararia',
          tipo: 'camararia',
          registros: registrosCamararia,
          atividadesCadastradas: todasAtividades.filter(a => a.type === 'camararia'),
          cor: '#10B981'
        },
        {
          nome: 'Revisão',
          tipo: 'revisao',
          registros: registrosRevisao,
          atividadesCadastradas: todasAtividades.filter(a => a.type === 'revisao'),
          cor: '#F59E0B'
        },
        {
          nome: 'Áreas Comuns',
          tipo: 'areas_comuns',
          registros: registrosAreasComuns,
          atividadesCadastradas: todasAtividades.filter(a => a.type === 'areas_comuns'),
          cor: '#8B5CF6'
        },
        {
          nome: 'Atividades Extras',
          tipo: 'diurno',
          registros: registrosAtividadesExtras,
          atividadesCadastradas: todasAtividades.filter(a => a.type === 'diurno'),
          cor: '#EF4444'
        },
        {
          nome: 'Atividades Diárias',
          tipo: 'noturno',
          registros: registrosAtividadesDiarias,
          atividadesCadastradas: todasAtividades.filter(a => a.type === 'noturno'),
          cor: '#06B6D4'
        },
        {
          nome: 'Gestão',
          tipo: 'gestao',
          registros: registrosGestao,
          atividadesCadastradas: todasAtividades.filter(a => a.type === 'gestao'),
          cor: '#F97316'
        },
        {
          nome: 'Cozinha',
          tipo: 'cozinha',
          registros: registrosCozinha,
          atividadesCadastradas: todasAtividades.filter(a => a.type === 'cozinha'),
          cor: '#14B8A6'
        },
        {
          nome: 'Vendas',
          tipo: 'vendas',
          registros: registrosVendas,
          atividadesCadastradas: todasAtividades.filter(a => a.type === 'vendas'),
          cor: '#FB923C'
        },
        {
          nome: 'Manutenção',
          tipo: 'manutencao',
          registros: registrosManutencao,
          atividadesCadastradas: [],
          cor: '#EC4899'
        }
      ];

      // Calcular eficiência para cada área
      const eficienciaCalculada = areas.map(area => {
        // Calcular total de atividades possíveis
        // Para isso, multiplicamos o número de atividades cadastradas pelo número de registros
        const totalAtividadesPossiveis = area.atividadesCadastradas.length * area.registros.length;

        // Calcular atividades efetivamente realizadas
        let atividadesRealizadas = 0;
        let totalAtividadesNosRegistros = 0;

        // Tratamento especial para manutenção
        if (area.tipo === 'manutencao') {
          totalAtividadesNosRegistros = area.registros.length;
          atividadesRealizadas = area.registros.filter(m => m.status === 'concluida').length;
        } else {
          area.registros.forEach(registro => {
            if (registro.atividades && Array.isArray(registro.atividades)) {
              totalAtividadesNosRegistros += registro.atividades.length;
              atividadesRealizadas += registro.atividades.filter(a => a.status === 'realizada').length;
            }
          });
        }

        // Calcular percentual de eficiência
        // Fórmula: (Atividades Realizadas / Total de Atividades nos Registros) * 100
        const percentualRealizacao = totalAtividadesNosRegistros > 0 
          ? (atividadesRealizadas / totalAtividadesNosRegistros) * 100 
          : 0;

        return {
          ...area,
          totalRegistros: area.registros.length,
          totalAtividadesCadastradas: area.atividadesCadastradas.length,
          totalAtividadesPossiveis,
          totalAtividadesNosRegistros,
          atividadesRealizadas,
          atividadesNaoRealizadas: totalAtividadesNosRegistros - atividadesRealizadas,
          percentualRealizacao,
          // Classificação da eficiência
          classificacao: percentualRealizacao >= 90 ? 'Excelente' :
                        percentualRealizacao >= 80 ? 'Boa' :
                        percentualRealizacao >= 70 ? 'Regular' :
                        percentualRealizacao >= 60 ? 'Baixa' : 'Crítica'
        };
      });

      // Mostrar todas as áreas, mesmo sem registros
      setEficienciaPorArea(eficienciaCalculada);

      // Calcular resumo geral (apenas áreas com registros para estatísticas)
      const areasComRegistros = eficienciaCalculada.filter(area => area.totalRegistros > 0);
      const totalRegistrosGeral = eficienciaCalculada.reduce((acc, area) => acc + area.totalRegistros, 0);
      const totalAtividadesRealizadasGeral = eficienciaCalculada.reduce((acc, area) => acc + area.atividadesRealizadas, 0);
      const totalAtividadesGeralNosRegistros = eficienciaCalculada.reduce((acc, area) => acc + area.totalAtividadesNosRegistros, 0);
      const eficienciaMediaGeral = totalAtividadesGeralNosRegistros > 0
        ? (totalAtividadesRealizadasGeral / totalAtividadesGeralNosRegistros) * 100
        : 0;

      setResumoGeral({
        totalAreas: eficienciaCalculada.length,
        totalRegistros: totalRegistrosGeral,
        totalAtividadesRealizadas: totalAtividadesRealizadasGeral,
        totalAtividadesNosRegistros: totalAtividadesGeralNosRegistros,
        eficienciaMedia: eficienciaMediaGeral,
        melhorArea: areasComRegistros.length > 0
          ? areasComRegistros.reduce((prev, current) =>
              prev.percentualRealizacao > current.percentualRealizacao ? prev : current
            )
          : null,
        piorArea: areasComRegistros.length > 0
          ? areasComRegistros.reduce((prev, current) =>
              prev.percentualRealizacao < current.percentualRealizacao ? prev : current
            )
          : null
      });

    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = () => {
    if (!eficienciaPorArea.length) return;

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.text('Eficiência por Área', 20, 20);
    
    // Período
    doc.setFontSize(12);
    doc.text(`Período: ${formatarData(dataInicio)} a ${formatarData(dataFim)}`, 20, 35);
    
    // Resumo Geral
    if (resumoGeral) {
      doc.setFontSize(16);
      doc.text('Resumo Geral', 20, 55);
      
      const resumoData = [
        ['Eficiência Média Geral', `${resumoGeral.eficienciaMedia.toFixed(1)}%`],
        ['Total de Registros', resumoGeral.totalRegistros.toString()],
        ['Atividades Realizadas', `${resumoGeral.totalAtividadesRealizadas}/${resumoGeral.totalAtividadesNosRegistros}`],
        ['Total de Áreas Analisadas', resumoGeral.totalAreas.toString()],
        ['Melhor Área', resumoGeral.melhorArea ? `${resumoGeral.melhorArea.nome} (${resumoGeral.melhorArea.percentualRealizacao.toFixed(1)}%)` : '-'],
        ['Área com Menor Eficiência', resumoGeral.piorArea ? `${resumoGeral.piorArea.nome} (${resumoGeral.piorArea.percentualRealizacao.toFixed(1)}%)` : '-']
      ];

      autoTable(doc, {
        body: resumoData,
        startY: 65,
        theme: 'grid',
        columnStyles: {
          0: { fontStyle: 'bold' }
        }
      });
    }

    // Análise Detalhada por Área
    let yPosition = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(16);
    doc.text('Análise Detalhada por Área', 20, yPosition);
    
    const eficienciaData = eficienciaPorArea.map(area => [
      area.nome,
      area.totalRegistros.toString(),
      area.totalAtividadesCadastradas.toString(),
      `${area.atividadesRealizadas}/${area.totalAtividadesNosRegistros}`,
      `${area.percentualRealizacao.toFixed(1)}%`,
      area.classificacao
    ]);

    autoTable(doc, {
      head: [['Área', 'Registros', 'Ativ. Cadastradas', 'Ativ. Realizadas', 'Eficiência', 'Classificação']],
      body: eficienciaData,
      startY: yPosition + 10,
      theme: 'grid'
    });

    // Fórmula de Cálculo
    yPosition = doc.lastAutoTable?.finalY + 20;
    doc.setFontSize(16);
    doc.text('Metodologia de Cálculo', 20, yPosition);
    
    const metodologiaData = [
      ['Fórmula de Eficiência', '(Atividades Realizadas ÷ Total de Atividades nos Registros) × 100'],
      ['Classificação Excelente', '≥ 90% de eficiência'],
      ['Classificação Boa', '80% - 89% de eficiência'],
      ['Classificação Regular', '70% - 79% de eficiência'],
      ['Classificação Baixa', '60% - 69% de eficiência'],
      ['Classificação Crítica', '< 60% de eficiência']
    ];

    autoTable(doc, {
      body: metodologiaData,
      startY: yPosition + 10,
      theme: 'grid',
      columnStyles: {
        0: { fontStyle: 'bold' }
      }
    });

    // Análise Comparativa
    yPosition = doc.lastAutoTable?.finalY + 20;
    doc.setFontSize(16);
    doc.text('Análise Comparativa', 20, yPosition);
    
    const analiseComparativa = [
      ['Área Mais Eficiente', resumoGeral?.melhorArea ? `${resumoGeral.melhorArea.nome} com ${resumoGeral.melhorArea.percentualRealizacao.toFixed(1)}% de eficiência` : 'Dados insuficientes'],
      ['Área Menos Eficiente', resumoGeral?.piorArea ? `${resumoGeral.piorArea.nome} com ${resumoGeral.piorArea.percentualRealizacao.toFixed(1)}% de eficiência` : 'Dados insuficientes'],
      ['Diferença entre Extremos', resumoGeral?.melhorArea && resumoGeral?.piorArea ? `${(resumoGeral.melhorArea.percentualRealizacao - resumoGeral.piorArea.percentualRealizacao).toFixed(1)} pontos percentuais` : 'Dados insuficientes'],
      ['Áreas Acima da Média', eficienciaPorArea.filter(area => area.percentualRealizacao > resumoGeral?.eficienciaMedia).length.toString()],
      ['Áreas Abaixo da Média', eficienciaPorArea.filter(area => area.percentualRealizacao < resumoGeral?.eficienciaMedia).length.toString()],
      ['Recomendação Geral', resumoGeral?.eficienciaMedia >= 80 ? 'Performance geral excelente' : resumoGeral?.eficienciaMedia >= 70 ? 'Performance boa, com oportunidades de melhoria' : 'Necessário plano de ação para melhoria']
    ];

    autoTable(doc, {
      body: analiseComparativa,
      startY: yPosition + 10,
      theme: 'grid',
      columnStyles: {
        0: { fontStyle: 'bold' }
      }
    });

    doc.save(`eficiencia-por-area-${dataInicio}-${dataFim}.pdf`);
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
          <h1 className="text-2xl font-bold text-gray-800">Eficiência por Área</h1>
          <p className="text-gray-600">Análise de performance e eficiência de cada área operacional</p>
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

      {/* Resumo Geral */}
      {resumoGeral && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Eficiência Média</p>
                <p className="text-2xl font-bold text-gray-800">{resumoGeral.eficienciaMedia.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Áreas Analisadas</p>
                <p className="text-2xl font-bold text-gray-800">{resumoGeral.totalAreas}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Melhor Área</p>
                <p className="text-lg font-bold text-gray-800">{resumoGeral.melhorArea?.nome || '-'}</p>
                <p className="text-sm text-green-600">{resumoGeral.melhorArea?.percentualRealizacao.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Menor Eficiência</p>
                <p className="text-lg font-bold text-gray-800">{resumoGeral.piorArea?.nome || '-'}</p>
                <p className="text-sm text-red-600">{resumoGeral.piorArea?.percentualRealizacao.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras - Eficiência */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Eficiência por Área (%)</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={eficienciaPorArea} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="nome" width={120} />
                <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Eficiência']} />
                <Bar dataKey="percentualRealizacao" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pizza - Distribuição de Atividades */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Distribuição de Atividades Realizadas</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={eficienciaPorArea}
                  cx="50%"
                  cy="45%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="atividadesRealizadas"
                >
                  {eficienciaPorArea.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const total = eficienciaPorArea.reduce((acc, area) => acc + area.atividadesRealizadas, 0);
                      const percentual = ((data.atividadesRealizadas / total) * 100).toFixed(1);
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                          <p className="font-semibold text-gray-800 mb-2">{data.nome}</p>
                          <p className="text-sm text-gray-600">Atividades: <span className="font-medium text-gray-900">{data.atividadesRealizadas}</span></p>
                          <p className="text-sm text-gray-600">Percentual: <span className="font-medium text-gray-900">{percentual}%</span></p>
                          <p className="text-sm text-gray-600">Eficiência: <span className="font-medium text-gray-900">{data.percentualRealizacao.toFixed(1)}%</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legenda Customizada Detalhada */}
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-3">
              {eficienciaPorArea.map((area) => {
                const total = eficienciaPorArea.reduce((acc, a) => acc + a.atividadesRealizadas, 0);
                const percentual = ((area.atividadesRealizadas / total) * 100).toFixed(1);
                return (
                  <div key={area.tipo} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: area.cor }}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{area.nome}</p>
                      <p className="text-xs text-gray-600">
                        {area.atividadesRealizadas} ativ. ({percentual}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela Detalhada */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Análise Detalhada por Área</h3>
          <p className="text-sm text-gray-600 mt-1">
            Fórmula: (Atividades Realizadas ÷ Total de Atividades nos Registros) × 100
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Área
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registros
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Atividades Cadastradas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Atividades Realizadas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total nos Registros
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Eficiência
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Classificação
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {eficienciaPorArea.map((area) => (
                <tr key={area.tipo} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: area.cor }}></div>
                      <span className="text-sm font-medium text-gray-900">{area.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {area.totalRegistros}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {area.totalAtividadesCadastradas}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="text-green-600 font-medium">{area.atividadesRealizadas}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {area.totalAtividadesNosRegistros}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      area.percentualRealizacao >= 90 ? 'bg-green-100 text-green-800' :
                      area.percentualRealizacao >= 80 ? 'bg-blue-100 text-blue-800' :
                      area.percentualRealizacao >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      area.percentualRealizacao >= 60 ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {area.percentualRealizacao.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      area.classificacao === 'Excelente' ? 'bg-green-100 text-green-800' :
                      area.classificacao === 'Boa' ? 'bg-blue-100 text-blue-800' :
                      area.classificacao === 'Regular' ? 'bg-yellow-100 text-yellow-800' :
                      area.classificacao === 'Baixa' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {area.classificacao}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards de Detalhamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {eficienciaPorArea.map((area) => (
          <div key={area.tipo} className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: area.cor }}></div>
                <h4 className="text-lg font-semibold text-gray-800">{area.nome}</h4>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Eficiência:</span>
                  <span className={`text-lg font-bold ${
                    area.percentualRealizacao >= 80 ? 'text-green-600' :
                    area.percentualRealizacao >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {area.percentualRealizacao.toFixed(1)}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      area.percentualRealizacao >= 80 ? 'bg-green-500' :
                      area.percentualRealizacao >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(area.percentualRealizacao, 100)}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Registros:</p>
                    <p className="font-medium text-gray-900">{area.totalRegistros}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Classificação:</p>
                    <p className="font-medium text-gray-900">{area.classificacao}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Realizadas:</p>
                    <p className="font-medium text-green-600">{area.atividadesRealizadas}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Não Realizadas:</p>
                    <p className="font-medium text-red-600">{area.atividadesNaoRealizadas}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EficienciaArea;