import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  Search,
  CheckSquare,
  Square,
  Clock,
  User,
  Calendar,
  Database,
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { historicalCleanupService, TabelaRegistro, LogLimpeza } from '../../services/historicalCleanupService';
import Pagination from '../common/Pagination';
import ConfirmacaoLimpezaModal from './ConfirmacaoLimpezaModal';

const PERIODOS_DISPONIVEIS = [
  { valor: 6, label: '6 meses' },
  { valor: 9, label: '9 meses' },
  { valor: 12, label: '12 meses' },
  { valor: 18, label: '18 meses' },
  { valor: 24, label: '24 meses' }
];

const ICONES_MODULOS: Record<string, React.ComponentType<any>> = {
  'registros_recepcao': User,
  'registros_camararia': Database,
  'registros_revisao': CheckSquare,
  'registros_areas_comuns': Database,
  'registros_gestao': FileText,
  'registros_atividades_diarias': Calendar,
  'registros_atividades_extras': Clock,
  'registros_cozinha': Database,
  'registros_vendas': Database,
  'manutencoes': AlertTriangle
};

export default function LimpezaHistorico() {
  const { user } = useAuth();
  const [periodoSelecionado, setPeriodoSelecionado] = useState(6);
  const [registrosAntigos, setRegistrosAntigos] = useState<TabelaRegistro[]>([]);
  const [tabelasSelecionadas, setTabelasSelecionadas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [historicoLogs, setHistoricoLogs] = useState<LogLimpeza[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [temPermissao, setTemPermissao] = useState(false);

  useEffect(() => {
    verificarPermissao();
  }, []);

  useEffect(() => {
    if (temPermissao && user?.empresaId) {
      carregarHistorico();
    }
  }, [paginaAtual, temPermissao, user?.empresaId]);

  const verificarPermissao = async () => {
    const permissao = await historicalCleanupService.validarPermissaoUsuario();
    setTemPermissao(permissao);
    if (!permissao) {
      alert('Acesso negado. Apenas administradores e gestores podem acessar esta página.');
    }
  };

  const buscarRegistrosAntigos = async () => {
    if (!user?.empresaId) {
      alert('Empresa não identificada. Faça login novamente.');
      return;
    }

    setBuscando(true);
    setRegistrosAntigos([]);
    setTabelasSelecionadas(new Set());

    try {
      console.log('Iniciando busca de registros antigos...');
      const dados = await historicalCleanupService.consultarRegistrosAntigos(
        user.empresaId,
        periodoSelecionado
      );

      console.log('Dados recebidos:', dados);
      setRegistrosAntigos(dados);

      // Mostrar mensagem se não houver registros
      if (dados.length === 0 || dados.every(d => d.quantidade === 0)) {
        alert(`Nenhum registro encontrado com mais de ${periodoSelecionado} meses.`);
      }
    } catch (error: any) {
      console.error('Erro na busca:', error);
      alert(`Erro ao buscar registros antigos: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setBuscando(false);
    }
  };

  const carregarHistorico = async () => {
    if (!user?.empresaId) return;

    try {
      const { logs, total } = await historicalCleanupService.buscarHistoricoLimpezas(
        user.empresaId,
        paginaAtual,
        10
      );
      setHistoricoLogs(logs);
      setTotalLogs(total);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const toggleSelecaoTabela = (tabela: string) => {
    const novaSelecao = new Set(tabelasSelecionadas);
    if (novaSelecao.has(tabela)) {
      novaSelecao.delete(tabela);
    } else {
      novaSelecao.add(tabela);
    }
    setTabelasSelecionadas(novaSelecao);
  };

  const selecionarTodas = () => {
    if (tabelasSelecionadas.size === registrosAntigos.length) {
      setTabelasSelecionadas(new Set());
    } else {
      const todas = new Set(registrosAntigos.map(r => r.tabela));
      setTabelasSelecionadas(todas);
    }
  };

  const obterCorCard = (quantidade: number): string => {
    if (quantidade === 0) return 'border-gray-300 bg-gray-50';
    if (quantidade < 100) return 'border-green-400 bg-green-50';
    if (quantidade < 500) return 'border-yellow-400 bg-yellow-50';
    return 'border-orange-400 bg-orange-50';
  };

  const obterCorQuantidade = (quantidade: number): string => {
    if (quantidade === 0) return 'text-gray-600';
    if (quantidade < 100) return 'text-green-700';
    if (quantidade < 500) return 'text-yellow-700';
    return 'text-orange-700';
  };

  const abrirModalConfirmacao = () => {
    if (tabelasSelecionadas.size === 0) {
      alert('Selecione pelo menos uma tabela para limpar.');
      return;
    }
    setMostrarModal(true);
  };

  const executarLimpeza = async (observacoes: string) => {
    if (!user?.empresaId || !user?.id) return;

    setLoading(true);
    try {
      await historicalCleanupService.executarLimpeza(
        user.empresaId,
        user.id,
        periodoSelecionado,
        Array.from(tabelasSelecionadas),
        observacoes
      );

      setMostrarModal(false);
      setRegistrosAntigos([]);
      setTabelasSelecionadas(new Set());
      await carregarHistorico();
      alert('Limpeza realizada com sucesso!');
    } catch (error) {
      alert('Erro ao executar limpeza. Tente novamente.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const totalSelecionado = registrosAntigos
    .filter(r => tabelasSelecionadas.has(r.tabela))
    .reduce((acc, r) => acc + r.quantidade, 0);

  if (!temPermissao) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Apenas administradores e gestores podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Trash2 className="w-8 h-8 text-orange-500" />
            Limpeza de Histórico
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie e remova registros históricos antigos de forma segura
          </p>
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800">Atenção</h3>
            <p className="text-yellow-700 text-sm">
              A exclusão de registros históricos é uma operação irreversível.
              Os dados não poderão ser recuperados após a exclusão.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período de Busca
            </label>
            <select
              value={periodoSelecionado}
              onChange={(e) => setPeriodoSelecionado(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {PERIODOS_DISPONIVEIS.map(periodo => (
                <option key={periodo.valor} value={periodo.valor}>
                  Registros com mais de {periodo.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={buscarRegistrosAntigos}
            disabled={buscando}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Search className="w-5 h-5" />
            {buscando ? 'Buscando...' : 'Buscar Registros'}
          </button>
        </div>

        {registrosAntigos.length > 0 && registrosAntigos.some(r => r.quantidade > 0) ? (
          <>
            <div className="flex items-center justify-between border-t pt-4">
              <button
                onClick={selecionarTodas}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                {tabelasSelecionadas.size === registrosAntigos.length ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
                {tabelasSelecionadas.size === registrosAntigos.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
              </button>
              {tabelasSelecionadas.size > 0 && (
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">{totalSelecionado.toLocaleString()}</span> registros selecionados
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {registrosAntigos.map(registro => {
                const Icone = ICONES_MODULOS[registro.tabela] || Database;
                const selecionado = tabelasSelecionadas.has(registro.tabela);

                return (
                  <button
                    key={registro.tabela}
                    onClick={() => toggleSelecaoTabela(registro.tabela)}
                    className={`p-4 rounded-lg border-2 transition-all ${obterCorCard(registro.quantidade)} ${
                      selecionado ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Icone className="w-8 h-8 text-gray-600" />
                        <div className="text-left">
                          <h3 className="font-semibold text-gray-800">{registro.nome_exibicao}</h3>
                          <p className={`text-2xl font-bold ${obterCorQuantidade(registro.quantidade)}`}>
                            {registro.quantidade.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {selecionado ? (
                          <CheckSquare className="w-6 h-6 text-blue-600" />
                        ) : (
                          <Square className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end border-t pt-4">
              <button
                onClick={abrirModalConfirmacao}
                disabled={tabelasSelecionadas.size === 0 || loading}
                className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
              >
                <Trash2 className="w-5 h-5" />
                Excluir Registros Selecionados
              </button>
            </div>
          </>
        ) : registrosAntigos.length > 0 && registrosAntigos.every(r => r.quantidade === 0) ? (
          <div className="text-center py-8 border-t">
            <CheckSquare className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Tudo Limpo!</h3>
            <p className="text-gray-600">
              Não há registros com mais de {periodoSelecionado} meses para limpar.
            </p>
          </div>
        ) : null}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6 text-gray-600" />
          Histórico de Limpezas
        </h2>

        {historicoLogs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma limpeza realizada ainda.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Data/Hora</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Usuário</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Período</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Registros Excluídos</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tempo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoLogs.map(log => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">
                        {historicalCleanupService.formatarDataHora(log.data_execucao)}
                      </td>
                      <td className="py-3 px-4 text-sm">{log.usuario?.name || '-'}</td>
                      <td className="py-3 px-4 text-sm">{log.periodo_meses} meses</td>
                      <td className="py-3 px-4 text-sm text-right font-semibold">
                        {log.total_registros_excluidos.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {historicalCleanupService.formatarTempoExecucao(log.tempo_execucao_ms)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.status === 'sucesso' ? 'bg-green-100 text-green-700' :
                          log.status === 'erro_parcial' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {log.status === 'sucesso' ? 'Sucesso' :
                           log.status === 'erro_parcial' ? 'Parcial' : 'Erro'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalLogs > 10 && (
              <div className="mt-4">
                <Pagination
                  currentPage={paginaAtual}
                  totalPages={Math.ceil(totalLogs / 10)}
                  onPageChange={setPaginaAtual}
                />
              </div>
            )}
          </>
        )}
      </div>

      {mostrarModal && (
        <ConfirmacaoLimpezaModal
          periodoMeses={periodoSelecionado}
          tabelasSelecionadas={registrosAntigos.filter(r => tabelasSelecionadas.has(r.tabela))}
          totalRegistros={totalSelecionado}
          onConfirmar={executarLimpeza}
          onCancelar={() => setMostrarModal(false)}
          loading={loading}
        />
      )}
    </div>
  );
}
