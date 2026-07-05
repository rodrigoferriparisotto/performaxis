import React, { useEffect, useState } from 'react';
import { Target, Save, AlertCircle, CheckCircle, Info, TrendingUp, Clock, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { buscarMetasPerformance, salvarMetaPerformance, MetaPerformanceData } from '../../services/performanceService';

const ConfiguracaoMetas: React.FC = () => {
  const { user } = useAuth();
  const [metas, setMetas] = useState<MetaPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const perfis = [
    { value: 'camararia', label: 'Camararia' },
    { value: 'recepcao', label: 'Recepção' },
    { value: 'areas_comuns', label: 'Áreas Comuns' },
    { value: 'cozinha', label: 'Cozinha' },
    { value: 'vendas', label: 'Vendas' },
    { value: 'atividades_diarias', label: 'Atividades Diárias' },
    { value: 'atividades_extras', label: 'Atividades Extras' },
  ];

  useEffect(() => {
    carregarMetas();
  }, [user]);

  const carregarMetas = async () => {
    if (!user?.empresaId) return;

    setLoading(true);
    try {
      const metasExistentes = await buscarMetasPerformance(user.empresaId);

      // Criar metas padrão para perfis que não têm metas configuradas
      const metasCompletas = perfis.map(perfil => {
        const metaExistente = metasExistentes.find(m => m.perfil === perfil.value);
        return metaExistente || {
          empresa_id: user.empresaId,
          perfil: perfil.value,
          meta_diaria_atividades: 10,
          tempo_medio_ideal: '02:00:00',
          peso_prazo: 0.40,
          peso_quantidade: 0.30,
          peso_qualidade: 0.30,
          ativo: true,
        } as MetaPerformanceData;
      });

      setMetas(metasCompletas);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar metas de performance' });
    } finally {
      setLoading(false);
    }
  };

  const handleMetaChange = (perfil: string, campo: string, valor: any) => {
    setMetas(metas.map(meta => {
      if (meta.perfil === perfil) {
        return { ...meta, [campo]: valor };
      }
      return meta;
    }));
  };

  const validarPesos = (meta: MetaPerformanceData): boolean => {
    const soma = meta.peso_prazo + meta.peso_quantidade + meta.peso_qualidade;
    return Math.abs(soma - 1.0) < 0.01; // Tolerância para arredondamento
  };

  const salvarTodasMetas = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Validar todas as metas antes de salvar
      for (const meta of metas) {
        if (!validarPesos(meta)) {
          setMessage({
            type: 'error',
            text: `Erro no perfil ${meta.perfil}: A soma dos pesos deve ser exatamente 100%`
          });
          setSaving(false);
          return;
        }
      }

      // Salvar cada meta
      let sucesso = 0;
      let erros = 0;

      for (const meta of metas) {
        const resultado = await salvarMetaPerformance(meta);
        if (resultado) {
          sucesso++;
        } else {
          erros++;
        }
      }

      if (erros === 0) {
        setMessage({ type: 'success', text: `${sucesso} metas salvas com sucesso!` });
        await carregarMetas();
      } else {
        setMessage({
          type: 'error',
          text: `${sucesso} metas salvas, mas ${erros} falharam. Verifique os dados.`
        });
      }
    } catch (error) {
      console.error('Erro ao salvar metas:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar metas de performance' });
    } finally {
      setSaving(false);
    }
  };

  const aplicarMetasPadrao = () => {
    setMetas(metas.map(meta => ({
      ...meta,
      meta_diaria_atividades: 10,
      tempo_medio_ideal: '02:00:00',
      peso_prazo: 0.40,
      peso_quantidade: 0.30,
      peso_qualidade: 0.30,
      ativo: true,
    })));
    setMessage({ type: 'success', text: 'Metas padrão aplicadas. Clique em Salvar para confirmar.' });
  };

  const calcularPontuacaoExemplo = (meta: MetaPerformanceData) => {
    // Exemplo: funcionário com 12 atividades, 10 no prazo, qualidade 85%
    const atividadesRealizadas = 12;
    const atividadesNoPrazo = 10;
    const qualidade = 85;

    const pontuacaoQuantidade = (atividadesRealizadas / meta.meta_diaria_atividades) * 100 * meta.peso_quantidade;
    const pontuacaoPrazo = (atividadesNoPrazo / atividadesRealizadas) * 100 * meta.peso_prazo;
    const pontuacaoQualidade = qualidade * meta.peso_qualidade;

    return (pontuacaoQuantidade + pontuacaoPrazo + pontuacaoQualidade).toFixed(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-lg">
                <Target className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configuração de Metas de Performance</h1>
                <p className="text-gray-600 mt-1">Configure as metas e pesos de avaliação para cada perfil</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={aplicarMetasPadrao}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Aplicar Padrão
              </button>
              <button
                onClick={salvarTodasMetas}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Salvando...' : 'Salvar Todas'}
              </button>
            </div>
          </div>

          {/* Mensagem de feedback */}
          {message && (
            <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-2">Como funciona o sistema de pontuação:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li><strong>Meta Diária:</strong> Número de atividades esperadas por dia</li>
                <li><strong>Peso Quantidade:</strong> Importância do número de atividades realizadas</li>
                <li><strong>Peso Prazo:</strong> Importância de concluir atividades no prazo</li>
                <li><strong>Peso Qualidade:</strong> Importância da qualidade das atividades</li>
                <li><strong>Total dos pesos deve ser 100%</strong> (0.40 + 0.30 + 0.30 = 1.00)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Cards de Metas por Perfil */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {metas.map((meta) => {
            const perfilInfo = perfis.find(p => p.value === meta.perfil);
            const pesosValidos = validarPesos(meta);

            return (
              <div key={meta.perfil} className="bg-white rounded-lg shadow-lg p-6">
                {/* Header do Card */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{perfilInfo?.label}</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={meta.ativo}
                      onChange={(e) => handleMetaChange(meta.perfil, 'ativo', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Ativo</span>
                  </label>
                </div>

                {/* Meta Diária */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta Diária de Atividades
                  </label>
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-600" />
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={meta.meta_diaria_atividades}
                      onChange={(e) => handleMetaChange(meta.perfil, 'meta_diaria_atividades', parseInt(e.target.value) || 10)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-600">atividades/dia</span>
                  </div>
                </div>

                {/* Tempo Médio Ideal */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tempo Médio Ideal
                  </label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <input
                      type="time"
                      value={meta.tempo_medio_ideal?.substring(0, 5) || '02:00'}
                      onChange={(e) => handleMetaChange(meta.perfil, 'tempo_medio_ideal', `${e.target.value}:00`)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Pesos */}
                <div className="space-y-3 mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Pesos de Avaliação</p>

                  {/* Peso Quantidade */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sm text-gray-600">Quantidade</label>
                      <span className="text-sm font-semibold text-gray-900">
                        {(meta.peso_quantidade * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={meta.peso_quantidade * 100}
                      onChange={(e) => handleMetaChange(meta.perfil, 'peso_quantidade', parseInt(e.target.value) / 100)}
                      className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #10b981 0%, #10b981 ${meta.peso_quantidade * 100}%, #e5e7eb ${meta.peso_quantidade * 100}%, #e5e7eb 100%)`
                      }}
                    />
                  </div>

                  {/* Peso Prazo */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sm text-gray-600">Prazo</label>
                      <span className="text-sm font-semibold text-gray-900">
                        {(meta.peso_prazo * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={meta.peso_prazo * 100}
                      onChange={(e) => handleMetaChange(meta.perfil, 'peso_prazo', parseInt(e.target.value) / 100)}
                      className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${meta.peso_prazo * 100}%, #e5e7eb ${meta.peso_prazo * 100}%, #e5e7eb 100%)`
                      }}
                    />
                  </div>

                  {/* Peso Qualidade */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sm text-gray-600">Qualidade</label>
                      <span className="text-sm font-semibold text-gray-900">
                        {(meta.peso_qualidade * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={meta.peso_qualidade * 100}
                      onChange={(e) => handleMetaChange(meta.perfil, 'peso_qualidade', parseInt(e.target.value) / 100)}
                      className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${meta.peso_qualidade * 100}%, #e5e7eb ${meta.peso_qualidade * 100}%, #e5e7eb 100%)`
                      }}
                    />
                  </div>
                </div>

                {/* Validação de Pesos */}
                <div className={`p-3 rounded-lg mb-4 ${
                  pesosValidos ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {pesosValidos ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      pesosValidos ? 'text-green-800' : 'text-red-800'
                    }`}>
                      Total: {((meta.peso_prazo + meta.peso_quantidade + meta.peso_qualidade) * 100).toFixed(0)}%
                      {!pesosValidos && ' - Deve ser 100%'}
                    </span>
                  </div>
                </div>

                {/* Exemplo de Pontuação */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-700">Exemplo de Pontuação</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    Funcionário com 12 atividades, 10 no prazo, qualidade 85%
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pontuação:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {calcularPontuacaoExemplo(meta)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ConfiguracaoMetas;
