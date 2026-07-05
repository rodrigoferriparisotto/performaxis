import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Activity,
  Clock,
  X,
  Download,
  Filter,
  Search,
  ChevronDown,
  Calendar,
  CheckCircle,
  XCircle
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
  cancelamentoService
} from '../../services/supabaseService';
import { formatarData, calcularTempoDecorrido, getBrazilDate } from '../../utils/dateUtils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

const AnaliseFuncionario: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState('');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [dadosFuncionario, setDadosFuncionario] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

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
    
    carregarUsuarios();
  }, []);

  useEffect(() => {
    if (funcionarioSelecionado && dataInicio && dataFim) {
      carregarDadosFuncionario();
    }
  }, [funcionarioSelecionado, dataInicio, dataFim]);

  const carregarUsuarios = async () => {
    try {
      const usuariosData = await usuarioService.getUsuarios();
      setUsuarios(usuariosData.filter(u => u.active));
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const carregarDadosFuncionario = async () => {
    if (!funcionarioSelecionado) return;
    
    setLoading(true);
    try {

      // Carregar todos os registros do funcionário
      const [
        registrosRecepcao,
        registrosCamararia,
        registrosRevisao,
        registrosAreasComuns,
        registrosAtividadesExtras,
        registrosAtividadesDiarias,
        registrosGestao,
        cancelamentos
      ] = await Promise.all([
        registroRecepcaoService.getRegistrosByPeriodo(dataInicio, dataFim, funcionarioSelecionado),
        registroCamarariaService.getRegistrosByPeriodo(dataInicio, dataFim, funcionarioSelecionado),
        registroRevisaoService.getRegistrosByPeriodo(dataInicio, dataFim, funcionarioSelecionado),
        registroAreasComunsService.getRegistrosByPeriodo(dataInicio, dataFim, funcionarioSelecionado),
        registroAtividadesExtrasService.getRegistrosByPeriodo(dataInicio, dataFim, funcionarioSelecionado),
        registroAtividadesDiariasService.getRegistrosByPeriodo(dataInicio, dataFim, funcionarioSelecionado),
        registroGestaoService.getRegistrosByPeriodo(dataInicio, dataFim, funcionarioSelecionado),
        cancelamentoService.getCancelamentosByPeriodo(dataInicio, dataFim)
      ]);

      // Filtrar cancelamentos do funcionário
      const cancelamentosFuncionario = cancelamentos.filter(c => c.usuario_id === funcionarioSelecionado);

      // Combinar todos os registros
      const todosRegistros = [
        ...registrosRecepcao.map(r => ({ ...r, tipo: 'Recepção', cor: 'blue' })),
        ...registrosCamararia.map(r => ({ ...r, tipo: 'Camararia', cor: 'green' })),
        ...registrosRevisao.map(r => ({ ...r, tipo: 'Revisão', cor: 'yellow' })),
        ...registrosAreasComuns.map(r => ({ ...r, tipo: 'Áreas Comuns', cor: 'indigo' })),
        ...registrosAtividadesExtras.map(r => ({ ...r, tipo: 'Diurnas', cor: 'orange' })),
        ...registrosAtividadesDiarias.map(r => ({ ...r, tipo: 'Noturnas', cor: 'purple' })),
        ...registrosGestao.map(r => ({ ...r, tipo: 'Gestão', cor: 'pink' }))
      ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      // Calcular estatísticas
      let totalAtividades = 0;
      let atividadesRealizadas = 0;
      let tempoTotalMinutos = 0;

      todosRegistros.forEach(registro => {
        if (registro.atividades && Array.isArray(registro.atividades)) {
          totalAtividades += registro.atividades.length;
          atividadesRealizadas += registro.atividades.filter(a => a.status === 'realizada').length;
        }

        if (registro.hora_inicio && registro.hora_fim) {
          const inicio = new Date(registro.hora_inicio);
          const fim = new Date(registro.hora_fim);
          tempoTotalMinutos += Math.floor((fim.getTime() - inicio.getTime()) / (1000 * 60));
        }
      });

      const eficiencia = totalAtividades > 0 ? (atividadesRealizadas / totalAtividades) * 100 : 0;

      const funcionario = usuarios.find(u => u.id === funcionarioSelecionado);

      setDadosFuncionario({
        funcionario,
        registros: todosRegistros,
        cancelamentos: cancelamentosFuncionario,
        estatisticas: {
          totalRegistros: todosRegistros.length,
          registrosConcluidos: todosRegistros.filter(r => r.status === 'concluido').length,
          totalAtividades,
          atividadesRealizadas,
          eficiencia,
          tempoTotalMinutos,
          totalCancelamentos: cancelamentosFuncionario.length
        }
      });

    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = () => {
    if (!dadosFuncionario) return;

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.text('Análise por Funcionário', 20, 20);
    
    // Funcionário e período
    doc.setFontSize(14);
    doc.text(`Funcionário: ${dadosFuncionario.funcionario.name}`, 20, 35);
    doc.setFontSize(12);
    doc.text(`Período: ${formatarData(dataInicio)} a ${formatarData(dataFim)}`, 20, 45);
    
    // Estatísticas
    doc.setFontSize(16);
    doc.text('Estatísticas', 20, 65);
    
    const estatisticas = [
      ['Total de Registros', dadosFuncionario.estatisticas.totalRegistros.toString()],
      ['Registros Concluídos', dadosFuncionario.estatisticas.registrosConcluidos.toString()],
      ['Eficiência', `${dadosFuncionario.estatisticas.eficiencia.toFixed(1)}%`],
      ['Atividades Realizadas', `${dadosFuncionario.estatisticas.atividadesRealizadas}/${dadosFuncionario.estatisticas.totalAtividades}`],
      ['Tempo Total', `${Math.floor(dadosFuncionario.estatisticas.tempoTotalMinutos / 60)}h ${dadosFuncionario.estatisticas.tempoTotalMinutos % 60}min`],
      ['Cancelamentos', dadosFuncionario.estatisticas.totalCancelamentos.toString()]
    ];

    autoTable(doc, {
      body: estatisticas,
      startY: 75,
      theme: 'grid',
      columnStyles: {
        0: { fontStyle: 'bold' }
      }
    });

    // Informações do Funcionário
    let yPosition = doc.lastAutoTable?.finalY + 20;
    doc.setFontSize(16);
    doc.text('Informações do Funcionário', 20, yPosition);
    
    const infoFuncionario = [
      ['Nome Completo', dadosFuncionario.funcionario.name],
      ['Perfil/Cargo', dadosFuncionario.funcionario.profile],
      ['Data de Contratação', formatarData(dadosFuncionario.funcionario.data_contratacao)],
      ['Telefone', dadosFuncionario.funcionario.telefone || '-'],
      ['Login', dadosFuncionario.funcionario.login || '-'],
      ['Status', dadosFuncionario.funcionario.active ? 'Ativo' : 'Inativo']
    ];

    autoTable(doc, {
      body: infoFuncionario,
      startY: yPosition + 10,
      theme: 'grid',
      columnStyles: {
        0: { fontStyle: 'bold' }
      }
    });
    // Registros
    yPosition = doc.lastAutoTable?.finalY + 20;
    doc.setFontSize(16);
    doc.text('Registros Recentes', 20, yPosition);
    
    const registrosData = dadosFuncionario.registros.slice(0, 10).map((registro: any) => [
      formatarData(registro.data),
      registro.tipo,
      registro.status === 'concluido' ? 'Concluído' : 'Em Andamento',
      registro.hora_inicio && registro.hora_fim ? calcularTempoDecorrido(registro.hora_inicio, registro.hora_fim) : '-'
    ]);

    autoTable(doc, {
      head: [['Data', 'Tipo', 'Status', 'Tempo']],
      body: registrosData,
      startY: yPosition + 10,
      theme: 'grid'
    });

    // Cancelamentos (se houver)
    if (dadosFuncionario.cancelamentos.length > 0) {
      yPosition = doc.lastAutoTable?.finalY + 20;
      doc.setFontSize(16);
      doc.text('Cancelamentos', 20, yPosition);
      
      const cancelamentosData = dadosFuncionario.cancelamentos.slice(0, 10).map((cancelamento: any) => [
        formatarData(cancelamento.data_hora),
        cancelamento.tipo,
        cancelamento.motivo || 'Sem motivo informado'
      ]);

      autoTable(doc, {
        head: [['Data', 'Tipo', 'Motivo']],
        body: cancelamentosData,
        startY: yPosition + 10,
        theme: 'grid'
      });
    }

    // Análise de Performance
    yPosition = doc.lastAutoTable?.finalY + 20;
    doc.setFontSize(16);
    doc.text('Análise de Performance', 20, yPosition);
    
    const analisePerformance = [
      ['Taxa de Conclusão', `${dadosFuncionario.estatisticas.registrosConcluidos > 0 ? ((dadosFuncionario.estatisticas.registrosConcluidos / dadosFuncionario.estatisticas.totalRegistros) * 100).toFixed(1) : 0}%`],
      ['Média de Tempo por Registro', dadosFuncionario.estatisticas.totalRegistros > 0 ? `${Math.floor((dadosFuncionario.estatisticas.tempoTotalMinutos / dadosFuncionario.estatisticas.totalRegistros) / 60)}h ${Math.floor((dadosFuncionario.estatisticas.tempoTotalMinutos / dadosFuncionario.estatisticas.totalRegistros) % 60)}min` : '-'],
      ['Atividades por Registro', dadosFuncionario.estatisticas.totalRegistros > 0 ? (dadosFuncionario.estatisticas.totalAtividades / dadosFuncionario.estatisticas.totalRegistros).toFixed(1) : '0'],
      ['Taxa de Cancelamento', dadosFuncionario.estatisticas.totalRegistros > 0 ? `${((dadosFuncionario.estatisticas.totalCancelamentos / dadosFuncionario.estatisticas.totalRegistros) * 100).toFixed(1)}%` : '0%']
    ];

    autoTable(doc, {
      body: analisePerformance,
      startY: yPosition + 10,
      theme: 'grid',
      columnStyles: {
        0: { fontStyle: 'bold' }
      }
    });
    doc.save(`analise-funcionario-${dadosFuncionario.funcionario.name}-${dataInicio}-${dataFim}.pdf`);
  };

  const usuariosFiltrados = usuarios.filter(usuario =>
    usuario.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !dadosFuncionario) {
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
          <h1 className="text-2xl font-bold text-gray-800">Análise por Funcionário</h1>
          <p className="text-gray-600">Análise detalhada individual de performance</p>
        </div>
        {dadosFuncionario && (
          <button
            onClick={exportarPDF}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2 transition-colors duration-200"
          >
            <Download className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Funcionário
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar funcionário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={funcionarioSelecionado}
              onChange={(e) => setFuncionarioSelecionado(e.target.value)}
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um funcionário</option>
              {usuariosFiltrados.map(usuario => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.name} - {usuario.profile}
                </option>
              ))}
            </select>
          </div>
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

      {/* Dados do Funcionário */}
      {dadosFuncionario ? (
        <>
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Total Registros</p>
                  <p className="text-xl font-bold text-gray-800">{dadosFuncionario.estatisticas.totalRegistros}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Concluídos</p>
                  <p className="text-xl font-bold text-gray-800">{dadosFuncionario.estatisticas.registrosConcluidos}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Activity className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Eficiência</p>
                  <p className="text-xl font-bold text-gray-800">{dadosFuncionario.estatisticas.eficiencia.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Atividades</p>
                  <p className="text-xl font-bold text-gray-800">
                    {dadosFuncionario.estatisticas.atividadesRealizadas}/{dadosFuncionario.estatisticas.totalAtividades}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Tempo Total</p>
                  <p className="text-xl font-bold text-gray-800">
                    {Math.floor(dadosFuncionario.estatisticas.tempoTotalMinutos / 60)}h {dadosFuncionario.estatisticas.tempoTotalMinutos % 60}m
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <X className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Cancelamentos</p>
                  <p className="text-xl font-bold text-gray-800">{dadosFuncionario.estatisticas.totalCancelamentos}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Informações do Funcionário */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">{dadosFuncionario.funcionario.name}</h3>
                <p className="text-gray-600 capitalize">{dadosFuncionario.funcionario.profile}</p>
                <p className="text-sm text-gray-500">Contratado em: {formatarData(dadosFuncionario.funcionario.data_contratacao)}</p>
              </div>
            </div>
          </div>

          {/* Lista de Registros */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Histórico de Registros</h3>
              <p className="text-sm text-gray-600">{dadosFuncionario.registros.length} registros encontrados</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Atividades
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tempo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dadosFuncionario.registros.map((registro: any) => (
                    <tr key={registro.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatarData(registro.data)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${registro.cor}-100 text-${registro.cor}-800`}>
                          {registro.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          registro.status === 'concluido' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {registro.status === 'concluido' ? 'Concluído' : 'Em Andamento'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registro.atividades ? 
                          `${registro.atividades.filter((a: any) => a.status === 'realizada').length}/${registro.atividades.length}` 
                          : '0/0'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registro.hora_inicio && registro.hora_fim ? 
                          calcularTempoDecorrido(registro.hora_inicio, registro.hora_fim) : 
                          '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cancelamentos */}
          {dadosFuncionario.cancelamentos.length > 0 && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Cancelamentos</h3>
                <p className="text-sm text-gray-600">{dadosFuncionario.cancelamentos.length} cancelamentos registrados</p>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {dadosFuncionario.cancelamentos.map((cancelamento: any) => (
                    <div key={cancelamento.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-red-800">{cancelamento.tipo}</p>
                          <p className="text-sm text-red-600">{formatarData(cancelamento.data_hora)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-red-700">{cancelamento.motivo || 'Sem motivo informado'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12">
          <div className="text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">Selecione um funcionário</h3>
            <p className="text-gray-600">Escolha um funcionário nos filtros acima para ver a análise detalhada</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnaliseFuncionario;