import React, { useState } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, TrendingUp, Clock, Users, Calendar, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getBrazilDateString, subtractDaysBrazil } from '../../utils/dateUtils';

const formatarDataLocal = (dataString: string): string => {
  const [ano, mes, dia] = dataString.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.toLocaleDateString('pt-BR');
};

const RecalcularPerformance: React.FC = () => {
  const { user } = useAuth();
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState<any | null>(null);
  const [dataInicio, setDataInicio] = useState(subtractDaysBrazil(7));
  const [dataFim, setDataFim] = useState(getBrazilDateString());
  const [erroMensagem, setErroMensagem] = useState<string | null>(null);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0, diaAtual: '' });

  const calcularDiasEntreDatas = () => {
    const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-').map(Number);
    const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number);
    const inicio = new Date(anoInicio, mesInicio - 1, diaInicio);
    const fim = new Date(anoFim, mesFim - 1, diaFim);
    const diferencaMs = fim.getTime() - inicio.getTime();
    const dias = Math.ceil(diferencaMs / (1000 * 60 * 60 * 24)) + 1;
    return dias;
  };

  const iniciarCalculo = async () => {
    if (!user?.empresaId) {
      setErroMensagem('Erro: Usuário sem empresa associada. Entre em contato com o administrador.');
      return;
    }

    setCalculando(true);
    setResultado(null);
    setErroMensagem(null);

    const inicioCalculo = Date.now();

    try {
      const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-').map(Number);
      const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number);
      const inicio = new Date(anoInicio, mesInicio - 1, diaInicio);
      const fim = new Date(anoFim, mesFim - 1, diaFim);
      const totalDias = calcularDiasEntreDatas();

      let totalSucesso = 0;
      let totalErros = 0;
      const detalhes: string[] = [];

      const currentDate = new Date(inicio);
      let diasProcessados = 0;

      while (currentDate <= fim) {
        const dataStr = currentDate.toISOString().split('T')[0];
        const dataFormatada = formatarDataLocal(dataStr);

        setProgresso({
          atual: diasProcessados + 1,
          total: totalDias,
          diaAtual: dataFormatada
        });

        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          console.log(`Processando dia ${diasProcessados + 1}/${totalDias}: ${dataFormatada}`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 300000);

          const response = await fetch(`${supabaseUrl}/functions/v1/calcular-performance-diaria`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              data: dataStr,
              empresa_id: user.empresaId
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('Edge Function não encontrada. Verifique se ela foi deployed no Supabase.');
            } else if (response.status === 401) {
              throw new Error('Erro de autenticação. Verifique suas credenciais.');
            } else {
              throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
            }
          }

          const result = await response.json();

          console.log(`Resultado do dia ${dataFormatada}:`, result);

          if (result.sucesso) {
            totalSucesso += result.total_usuarios_sucesso || 0;
            totalErros += result.total_usuarios_erros || 0;
            detalhes.push(`${dataFormatada}: ${result.total_usuarios_sucesso} sucessos, ${result.total_usuarios_erros} erros`);
          } else {
            detalhes.push(`${dataFormatada}: Erro - ${result.erro}`);
            totalErros++;
          }
        } catch (error: any) {
          const errorMsg = error.name === 'AbortError'
            ? 'Timeout (5 minutos)'
            : error.message || String(error);
          console.error(`Erro ao processar ${dataFormatada}:`, error);
          detalhes.push(`${dataFormatada}: Erro crítico - ${errorMsg}`);
          totalErros++;
        }

        diasProcessados++;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const tempoExecucao = Date.now() - inicioCalculo;

      setResultado({
        sucesso: totalSucesso,
        erros: totalErros,
        diasProcessados,
        totalDias,
        detalhes,
        tempoExecucao
      });

    } catch (error: any) {
      console.error('Erro ao calcular performance:', error);
      const errorMsg = error.message || String(error);
      setErroMensagem(`Erro crítico: ${errorMsg}`);
      setResultado({
        sucesso: 0,
        erros: 1,
        diasProcessados: 0,
        totalDias: calcularDiasEntreDatas(),
        detalhes: [`Erro crítico: ${errorMsg}`],
        tempoExecucao: Date.now() - inicioCalculo
      });
    } finally {
      setCalculando(false);
      setProgresso({ atual: 0, total: 0, diaAtual: '' });
    }
  };

  const formatarTempo = (ms: number) => {
    const segundos = Math.floor(ms / 1000);
    const minutos = Math.floor(segundos / 60);
    const segundosRestantes = segundos % 60;

    if (minutos > 0) {
      return `${minutos}min ${segundosRestantes}s`;
    }
    return `${segundos}s`;
  };

  const totalDias = calcularDiasEntreDatas();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-lg">
              <RefreshCw className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Recalcular Performance</h1>
              <p className="text-gray-600 mt-1">
                Calcule ou recalcule a performance de todos os funcionários para um período específico
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex items-start gap-3">
            <Zap className="w-6 h-6 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Como funciona o novo sistema:</h3>
              <ul className="space-y-2 text-sm">
                <li>• <strong>Ranking Diário:</strong> Ordenado por pontos (0-2) baseados na efetividade</li>
                <li>• <strong>Pontos:</strong> &lt;70%=0pts, 70-79%=1pt, 80-89%=1.5pts, ≥90%=2pts</li>
                <li>• <strong>Ranking Mensal:</strong> Quem ficou mais vezes em 1º lugar no mês</li>
                <li>• <strong>Abrangência:</strong> Soma TODAS as atividades do usuário (todas as áreas)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Período do Cálculo
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                max={dataFim}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={calculando}
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
                min={dataInicio}
                max={getBrazilDateString()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={calculando}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">
                Total de dias a processar: {totalDias} dias
              </span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              De {formatarDataLocal(dataInicio)} até {formatarDataLocal(dataFim)}
            </p>
          </div>

          {erroMensagem && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2 text-red-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Erro</p>
                  <p className="text-sm mt-1">{erroMensagem}</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={iniciarCalculo}
            disabled={calculando || totalDias <= 0}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              calculando
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${calculando ? 'animate-spin' : ''}`} />
            {calculando ? 'Calculando...' : 'Iniciar Cálculo'}
          </button>
        </div>

        {calculando && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  Processando dia {progresso.atual} de {progresso.total}
                </h3>
                <p className="text-sm text-gray-600">
                  {progresso.diaAtual && `Calculando: ${progresso.diaAtual}`}
                </p>
              </div>
            </div>

            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progresso</span>
                <span>{progresso.total > 0 ? Math.round((progresso.atual / progresso.total) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progresso.total > 0 ? (progresso.atual / progresso.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {resultado && !calculando && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sucessos</p>
                    <p className="text-2xl font-bold text-green-600">{resultado.sucesso}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Erros</p>
                    <p className="text-2xl font-bold text-red-600">{resultado.erros}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tempo</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatarTempo(resultado.tempoExecucao)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-bold text-gray-900">Resumo da Execução</h3>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Dias Processados</span>
                  <span className="font-semibold text-gray-900">{resultado.diasProcessados} / {resultado.totalDias}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Taxa de Sucesso</span>
                  <span className="font-semibold text-green-600">
                    {resultado.sucesso + resultado.erros > 0
                      ? Math.round((resultado.sucesso / (resultado.sucesso + resultado.erros)) * 100)
                      : 0}%
                  </span>
                </div>
              </div>

              {resultado.detalhes && resultado.detalhes.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Detalhes por Dia:</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="space-y-1 text-sm font-mono">
                      {resultado.detalhes.map((detalhe: string, index: number) => (
                        <div
                          key={index}
                          className={`p-2 rounded ${
                            detalhe.includes('Erro') ? 'bg-red-50 text-red-700' : 'text-gray-700'
                          }`}
                        >
                          {detalhe}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {resultado.sucesso > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-green-900 text-lg mb-2">
                      Cálculo concluído com sucesso!
                    </h3>
                    <p className="text-green-700">
                      Os rankings diários e mensais foram atualizados e já estão disponíveis no dashboard.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecalcularPerformance;
