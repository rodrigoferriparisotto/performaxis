import { format } from 'date-fns';
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Calendar,
  Award,
  BarChart3,
  Download,
  Filter,
  ChevronDown
} from 'lucide-react';
import { getBrazilDateString } from '../../utils/dateUtils';
import { 
  usuarioService,
  registroRecepcaoService,
  registroCamarariaService,
  registroRevisaoService,
  registroAreasComunsService,
  registroAtividadesExtrasService,
  registroAtividadesDiariasService,
  registroGestaoService
} from '../../services/supabaseService';
import { formatarData, getDataAtual, getBrazilDate } from '../../utils/dateUtils';
import { notificar } from '../../lib/feedback';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Colunas usadas no ranking de eficiência (em vez de select('*'))
const COLUNAS_RANKING = 'data, usuario_id, usuario_executor_id, atividades';

// jsPDF + autoTable só são baixados quando alguém exporta (fora da carga
// inicial do app)
const carregarGeradorPDF = async () => {
  try {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    return { jsPDF, autoTable };
  } catch (error) {
    notificar('Não foi possível carregar o gerador de PDF. Verifique a conexão e tente novamente.', 'erro');
    return null;
  }
};

const DashboardRelatorios: React.FC = () => {
  const [loading, setLoading] = useState(true);
  // período aplicado (o que está nos dados) × rascunho (o que está nos campos)
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [rascunhoInicio, setRascunhoInicio] = useState('');
  const [rascunhoFim, setRascunhoFim] = useState('');
  const [erroFiltro, setErroFiltro] = useState('');
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [topPerformersHoje, setTopPerformersHoje] = useState<any[]>([]);
  const [tendencias, setTendencias] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);

  useEffect(() => {
    // Definir período padrão (últimos 7 dias)
    const hoje = getBrazilDate();
    const seteDiasAtras = getBrazilDate();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const fim = `${ano}-${mes}-${dia}`;

    const anoInicio = seteDiasAtras.getFullYear();
    const mesInicio = String(seteDiasAtras.getMonth() + 1).padStart(2, '0');
    const diaInicio = String(seteDiasAtras.getDate()).padStart(2, '0');
    const inicio = `${anoInicio}-${mesInicio}-${diaInicio}`;

    setDataInicio(inicio);
    setDataFim(fim);
    setRascunhoInicio(inicio);
    setRascunhoFim(fim);
  }, []);

  useEffect(() => {
    if (dataInicio && dataFim) {
      carregarDados();
    }
  }, [dataInicio, dataFim]);

  const aplicarFiltro = () => {
    if (!rascunhoInicio || !rascunhoFim) {
      setErroFiltro('Preencha as duas datas.');
      return;
    }
    if (rascunhoInicio > rascunhoFim) {
      setErroFiltro('A data de início não pode ser depois da data de fim.');
      return;
    }
    setErroFiltro('');
    setDataInicio(rascunhoInicio);
    setDataFim(rascunhoFim);
  };

  // Janelas das tendências (semana atual, semana passada e últimos 7 dias).
  // As datas são calculadas EXATAMENTE como antes (inclusive o uso de
  // toISOString nas semanas); a diferença é que agora tudo vem de UMA carga
  // do intervalo que cobre as três janelas, agrupada por data aqui no cliente.
  const calcularJanelasTendencias = () => {
    const hoje = getBrazilDate();
    const inicioSemanaAtual = getBrazilDate();
    inicioSemanaAtual.setDate(inicioSemanaAtual.getDate() - inicioSemanaAtual.getDay());

    const fimSemanaPassada = getBrazilDate();
    fimSemanaPassada.setTime(inicioSemanaAtual.getTime());
    fimSemanaPassada.setDate(fimSemanaPassada.getDate() - 1);

    const inicioSemanaPassada = getBrazilDate();
    inicioSemanaPassada.setTime(fimSemanaPassada.getTime());
    inicioSemanaPassada.setDate(inicioSemanaPassada.getDate() - 6);

    const semanaAtual = {
      inicio: format(inicioSemanaAtual, 'yyyy-MM-dd'),
      fim: format(hoje, 'yyyy-MM-dd')
    };
    const semanaPassada = {
      inicio: format(inicioSemanaPassada, 'yyyy-MM-dd'),
      fim: format(fimSemanaPassada, 'yyyy-MM-dd')
    };

    // Últimos 7 dias (datas locais do fuso de Brasília)
    const dias: { dataStr: string; rotulo: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const data = getBrazilDate();
      data.setDate(data.getDate() - i);

      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const dia = String(data.getDate()).padStart(2, '0');
      dias.push({
        dataStr: `${ano}-${mes}-${dia}`,
        rotulo: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      });
    }

    const todasAsDatas = [
      semanaAtual.inicio, semanaAtual.fim,
      semanaPassada.inicio, semanaPassada.fim,
      ...dias.map(d => d.dataStr)
    ].sort();

    return {
      semanaAtual,
      semanaPassada,
      dias,
      inicio: todasAsDatas[0],
      fim: todasAsDatas[todasAsDatas.length - 1]
    };
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const janelas = calcularJanelasTendencias();

      // Tudo em paralelo: usuários + período do filtro (7 tabelas, só as
      // colunas usadas no ranking) + janela das tendências (4 tabelas, só a
      // coluna `data`, porque ali só se contam registros).
      const [
        usuariosData,
        registrosRecepcao,
        registrosCamararia,
        registrosRevisao,
        registrosAreasComuns,
        registrosAtividadesExtras,
        registrosAtividadesDiarias,
        registrosGestao,
        tendRecepcao,
        tendCamararia,
        tendRevisao,
        tendAreasComuns
      ] = await Promise.all([
        usuarioService.getUsuarios(),
        registroRecepcaoService.getColunasByPeriodo(dataInicio, dataFim, COLUNAS_RANKING),
        registroCamarariaService.getColunasByPeriodo(dataInicio, dataFim, COLUNAS_RANKING),
        registroRevisaoService.getColunasByPeriodo(dataInicio, dataFim, COLUNAS_RANKING),
        registroAreasComunsService.getColunasByPeriodo(dataInicio, dataFim, COLUNAS_RANKING),
        registroAtividadesExtrasService.getColunasByPeriodo(dataInicio, dataFim, COLUNAS_RANKING),
        registroAtividadesDiariasService.getColunasByPeriodo(dataInicio, dataFim, COLUNAS_RANKING),
        registroGestaoService.getColunasByPeriodo(dataInicio, dataFim, COLUNAS_RANKING),
        registroRecepcaoService.getColunasByPeriodo(janelas.inicio, janelas.fim, 'data'),
        registroCamarariaService.getColunasByPeriodo(janelas.inicio, janelas.fim, 'data'),
        registroRevisaoService.getColunasByPeriodo(janelas.inicio, janelas.fim, 'data'),
        registroAreasComunsService.getColunasByPeriodo(janelas.inicio, janelas.fim, 'data')
      ]);

      setUsuarios(usuariosData);

      // Processar top performers
      processarTopPerformers(usuariosData, [
        ...registrosRecepcao,
        ...registrosCamararia,
        ...registrosRevisao,
        ...registrosAreasComuns,
        ...registrosAtividadesExtras,
        ...registrosAtividadesDiarias,
        ...registrosGestao
      ]);

      // Processar tendências
      processarTendencias(janelas, [
        ...tendRecepcao,
        ...tendCamararia,
        ...tendRevisao,
        ...tendAreasComuns
      ]);

    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const processarTopPerformers = (usuariosData: any[], todosRegistros: any[]) => {
    // Calcular eficiência por usuário
    const eficienciaPorUsuario = new Map();

    usuariosData.forEach(usuario => {
      const registrosUsuario = todosRegistros.filter(r => (r.usuario_executor_id || r.usuario_id) === usuario.id);
      
      let totalAtividades = 0;
      let atividadesRealizadas = 0;

      registrosUsuario.forEach(registro => {
        if (registro.atividades && Array.isArray(registro.atividades)) {
          totalAtividades += registro.atividades.length;
          atividadesRealizadas += registro.atividades.filter(a => a.status === 'realizada').length;
        }
      });

      const eficiencia = totalAtividades > 0 ? (atividadesRealizadas / totalAtividades) * 100 : 0;
      
      eficienciaPorUsuario.set(usuario.id, {
        usuario,
        totalRegistros: registrosUsuario.length,
        totalAtividades,
        atividadesRealizadas,
        eficiencia
      });
    });

    // Top performers do período
    const topPeriodo = Array.from(eficienciaPorUsuario.values())
      .filter(item => item.totalAtividades > 0)
      .sort((a, b) => b.eficiencia - a.eficiencia)
      .slice(0, 5);

    setTopPerformers(topPeriodo);

    // Top performers de hoje
    const hoje = getBrazilDateString();
    const registrosHoje = todosRegistros.filter(r => r.data === hoje);
    
    const eficienciaHoje = new Map();
    usuariosData.forEach(usuario => {
      const registrosUsuarioHoje = registrosHoje.filter(r => (r.usuario_executor_id || r.usuario_id) === usuario.id);
      
      let totalAtividades = 0;
      let atividadesRealizadas = 0;

      registrosUsuarioHoje.forEach(registro => {
        if (registro.atividades && Array.isArray(registro.atividades)) {
          totalAtividades += registro.atividades.length;
          atividadesRealizadas += registro.atividades.filter(a => a.status === 'realizada').length;
        }
      });

      const eficiencia = totalAtividades > 0 ? (atividadesRealizadas / totalAtividades) * 100 : 0;
      
      eficienciaHoje.set(usuario.id, {
        usuario,
        totalRegistros: registrosUsuarioHoje.length,
        totalAtividades,
        atividadesRealizadas,
        eficiencia
      });
    });

    const topHoje = Array.from(eficienciaHoje.values())
      .filter(item => item.totalAtividades > 0)
      .sort((a, b) => b.eficiencia - a.eficiencia)
      .slice(0, 5);

    setTopPerformersHoje(topHoje);
  };

  const processarTendencias = (
    janelas: ReturnType<typeof calcularJanelasTendencias>,
    registrosJanela: any[]
  ) => {
    try {
      // `data` é coluna date ('aaaa-mm-dd'): comparar texto = comparar datas,
      // o mesmo critério do gte/lte que o banco aplicava em cada consulta.
      const contarEntre = (inicio: string, fim: string) =>
        registrosJanela.filter(r => r.data >= inicio && r.data <= fim).length;

      // Calcular semana atual vs semana passada
      const totalSemanaAtual = contarEntre(janelas.semanaAtual.inicio, janelas.semanaAtual.fim);
      const totalSemanaPassada = contarEntre(janelas.semanaPassada.inicio, janelas.semanaPassada.fim);

      const variacao = totalSemanaPassada > 0
        ? ((totalSemanaAtual - totalSemanaPassada) / totalSemanaPassada) * 100
        : 0;

      // Gráfico de tendências (últimos 7 dias), agrupado por data no cliente
      const porData = new Map<string, number>();
      registrosJanela.forEach(r => porData.set(r.data, (porData.get(r.data) || 0) + 1));

      const dadosGrafico = janelas.dias.map(dia => ({
        data: dia.rotulo,
        registros: porData.get(dia.dataStr) || 0
      }));

      setTendencias(dadosGrafico);

      // Gerar insights
      const insightsData = [
        {
          titulo: 'Variação Semanal',
          valor: `${variacao > 0 ? '+' : ''}${variacao.toFixed(1)}%`,
          descricao: `${variacao > 0 ? 'Aumento' : 'Diminuição'} em relação à semana passada`,
          tipo: variacao > 0 ? 'positivo' : variacao < 0 ? 'negativo' : 'neutro'
        },
        {
          titulo: 'Registros Esta Semana',
          valor: totalSemanaAtual.toString(),
          descricao: 'Total de registros concluídos',
          tipo: 'neutro'
        },
        {
          titulo: 'Média Diária',
          valor: Math.round(totalSemanaAtual / 7).toString(),
          descricao: 'Registros por dia nesta semana',
          tipo: 'neutro'
        }
      ];

      setInsights(insightsData);

    } catch (error) {

    }
  };

  const exportarPDF = async () => {
    const gerador = await carregarGeradorPDF();
    if (!gerador) return;
    const { jsPDF, autoTable } = gerador;

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.text('Dashboard de Relatórios', 20, 20);
    
    // Período
    doc.setFontSize(12);
    doc.text(`Período: ${formatarData(dataInicio)} a ${formatarData(dataFim)}`, 20, 35);
    
    // Top Performers do Período
    if (topPerformers.length > 0) {
      doc.setFontSize(16);
      doc.text('Top Performers do Período', 20, 55);
      
      const topPerformersData = topPerformers.map((item, index) => [
        index + 1,
        item.usuario.name,
        `${item.eficiencia.toFixed(1)}%`,
        item.totalRegistros.toString(),
        `${item.atividadesRealizadas}/${item.totalAtividades}`
      ]);

      autoTable(doc, {
        head: [['#', 'Funcionário', 'Eficiência', 'Registros', 'Atividades']],
        body: topPerformersData,
        startY: 65,
        theme: 'grid'
      });
    }

    // Top Performers de Hoje
    if (topPerformersHoje.length > 0) {
      let yPosition = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : 85;
      doc.setFontSize(16);
      doc.text('Top Performers de Hoje', 20, yPosition);
      
      const topPerformersHojeData = topPerformersHoje.map((item, index) => [
        index + 1,
        item.usuario.name,
        `${item.eficiencia.toFixed(1)}%`,
        item.totalRegistros.toString(),
        `${item.atividadesRealizadas}/${item.totalAtividades}`
      ]);

      autoTable(doc, {
        head: [['#', 'Funcionário', 'Eficiência', 'Registros', 'Atividades']],
        body: topPerformersHojeData,
        startY: yPosition + 10,
        theme: 'grid'
      });
    }

    // Insights
    if (insights.length > 0) {
      let yPosition = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : 105;
      doc.setFontSize(16);
      doc.text('Insights', 20, yPosition);
      
      const insightsData = insights.map(insight => [
        insight.titulo,
        insight.valor,
        insight.descricao
      ]);

      autoTable(doc, {
        head: [['Métrica', 'Valor', 'Descrição']],
        body: insightsData,
        startY: yPosition + 10,
        theme: 'grid'
      });
    }

    doc.save(`dashboard-relatorios-${dataInicio}-${dataFim}.pdf`);
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
          <h1 className="text-2xl font-bold text-gray-800">Dashboard de Relatórios</h1>
          <p className="text-gray-600">Visão geral e análise de performance</p>
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Início
            </label>
            <input
              type="date"
              value={rascunhoInicio}
              onChange={(e) => setRascunhoInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Fim
            </label>
            <input
              type="date"
              value={rascunhoFim}
              onChange={(e) => setRascunhoFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={aplicarFiltro}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait flex items-center justify-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>{loading ? 'Carregando...' : 'Filtrar'}</span>
          </button>
        </div>
        {erroFiltro && (
          <p className="text-sm text-red-600 mt-3">{erroFiltro}</p>
        )}
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers do Período */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Top Performers do Período</h3>
                <p className="text-sm text-gray-600">Baseado na eficiência das atividades</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {topPerformers.length > 0 ? (
              <div className="space-y-3">
                {topPerformers.map((item, index) => (
                  <div key={item.usuario.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.usuario.name}</p>
                        <p className="text-sm text-gray-600">{item.totalRegistros} registros</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{item.eficiencia.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">{item.atividadesRealizadas}/{item.totalAtividades}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum dado disponível para o período</p>
            )}
          </div>
        </div>

        {/* Top Performers de Hoje */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Top Performers de Hoje</h3>
                <p className="text-sm text-gray-600">Performance do dia atual</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {topPerformersHoje.length > 0 ? (
              <div className="space-y-3">
                {topPerformersHoje.map((item, index) => (
                  <div key={item.usuario.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.usuario.name}</p>
                        <p className="text-sm text-gray-600">{item.totalRegistros} registros</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{item.eficiencia.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">{item.atividadesRealizadas}/{item.totalAtividades}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum registro hoje</p>
            )}
          </div>
        </div>
      </div>

      {/* Tendências e Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Tendências */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Tendências (Últimos 7 Dias)</h3>
                <p className="text-sm text-gray-600">Evolução dos registros</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={tendencias}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="registros" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Insights</h3>
                <p className="text-sm text-gray-600">Análises e comparações</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-800">{insight.titulo}</h4>
                    <span className={`font-bold text-lg ${
                      insight.tipo === 'positivo' ? 'text-green-600' : 
                      insight.tipo === 'negativo' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {insight.valor}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{insight.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardRelatorios;