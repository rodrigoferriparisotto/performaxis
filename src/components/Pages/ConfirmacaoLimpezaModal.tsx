import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { TabelaRegistro } from '../../services/historicalCleanupService';

interface Props {
  periodoMeses: number;
  tabelasSelecionadas: TabelaRegistro[];
  totalRegistros: number;
  onConfirmar: (observacoes: string) => void;
  onCancelar: () => void;
  loading: boolean;
}

export default function ConfirmacaoLimpezaModal({
  periodoMeses,
  tabelasSelecionadas,
  totalRegistros,
  onConfirmar,
  onCancelar,
  loading
}: Props) {
  const [etapa, setEtapa] = useState(1);
  const [checkboxAceitacao, setCheckboxAceitacao] = useState(false);
  const [textoConfirmacao, setTextoConfirmacao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const TEXTO_REQUERIDO = 'CONFIRMAR EXCLUSAO';

  const podeAvancar = () => {
    if (etapa === 1) return true;
    if (etapa === 2) return checkboxAceitacao;
    if (etapa === 3) return textoConfirmacao.toUpperCase() === TEXTO_REQUERIDO;
    return false;
  };

  const avancarEtapa = () => {
    if (etapa < 3) {
      setEtapa(etapa + 1);
    }
  };

  const voltarEtapa = () => {
    if (etapa > 1) {
      setEtapa(etapa - 1);
    }
  };

  const handleConfirmar = () => {
    if (podeAvancar()) {
      onConfirmar(observacoes);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-red-600 text-white p-6 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Confirmação de Exclusão</h2>
              <p className="text-red-100 text-sm">Operação Irreversível</p>
            </div>
          </div>
          <button
            onClick={onCancelar}
            disabled={loading}
            className="text-white hover:bg-red-700 p-2 rounded transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center gap-4 mb-6">
            {[1, 2, 3].map(num => (
              <div key={num} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  num === etapa ? 'bg-red-600 text-white' :
                  num < etapa ? 'bg-green-500 text-white' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {num < etapa ? <CheckCircle2 className="w-6 h-6" /> : num}
                </div>
                {num < 3 && (
                  <div className={`w-16 h-1 ${num < etapa ? 'bg-green-500' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>

          {etapa === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                Etapa 1: Revisão dos Dados
              </h3>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Período:</span>
                  <span className="text-gray-900 font-semibold">
                    Registros com mais de {periodoMeses} meses
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Total de Registros:</span>
                  <span className="text-red-600 font-bold text-xl">
                    {totalRegistros.toLocaleString()}
                  </span>
                </div>

                <div className="border-t pt-3">
                  <span className="text-gray-700 font-medium block mb-2">
                    Módulos Selecionados ({tabelasSelecionadas.length}):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {tabelasSelecionadas.map(tabela => (
                      <div key={tabela.tabela} className="flex justify-between items-center bg-white p-2 rounded">
                        <span className="text-sm text-gray-700">{tabela.nome_exibicao}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {tabela.quantidade.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                <p className="text-yellow-800 text-sm">
                  Estes registros serão permanentemente excluídos do banco de dados.
                  Verifique cuidadosamente antes de prosseguir.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Adicione uma justificativa ou observação sobre esta limpeza..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>
          )}

          {etapa === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800">
                Etapa 2: Confirmação de Risco
              </h3>

              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
                  <div className="space-y-3">
                    <p className="text-red-900 font-semibold text-lg">
                      Aviso Importante:
                    </p>
                    <ul className="space-y-2 text-red-800">
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-1">•</span>
                        <span>Esta ação é IRREVERSÍVEL e não pode ser desfeita</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-1">•</span>
                        <span>Os dados serão PERMANENTEMENTE excluídos do banco de dados</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-1">•</span>
                        <span>Não existe backup ou forma de recuperar os registros após a exclusão</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-1">•</span>
                        <span>
                          <strong>{totalRegistros.toLocaleString()}</strong> registros serão excluídos
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-red-300">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={checkboxAceitacao}
                      onChange={(e) => setCheckboxAceitacao(e.target.checked)}
                      className="mt-1 w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-gray-900 font-medium group-hover:text-red-700 transition-colors">
                      Eu entendo e aceito que esta ação é irreversível e os dados não poderão ser recuperados.
                      Estou ciente da responsabilidade desta operação.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {etapa === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800">
                Etapa 3: Confirmação Final
              </h3>

              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-6 space-y-4">
                <p className="text-red-900 font-semibold">
                  Para confirmar definitivamente a exclusão, digite o texto abaixo exatamente como aparece:
                </p>

                <div className="bg-white border-2 border-red-400 rounded-lg p-4 text-center">
                  <code className="text-xl font-bold text-red-600 select-all">
                    {TEXTO_REQUERIDO}
                  </code>
                </div>

                <div>
                  <input
                    type="text"
                    value={textoConfirmacao}
                    onChange={(e) => setTextoConfirmacao(e.target.value)}
                    placeholder="Digite o texto de confirmação aqui"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center font-semibold text-lg"
                    autoFocus
                  />
                </div>

                {textoConfirmacao && textoConfirmacao.toUpperCase() !== TEXTO_REQUERIDO && (
                  <p className="text-red-600 text-sm text-center">
                    O texto não corresponde. Digite exatamente como mostrado acima.
                  </p>
                )}
              </div>

              <div className="bg-gray-100 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Resumo da Operação:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Período: Registros com mais de {periodoMeses} meses</li>
                  <li>• Módulos: {tabelasSelecionadas.length}</li>
                  <li>• Total de Registros: <strong>{totalRegistros.toLocaleString()}</strong></li>
                  {observacoes && <li>• Observação: {observacoes}</li>}
                </ul>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <button
              onClick={etapa === 1 ? onCancelar : voltarEtapa}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {etapa === 1 ? 'Cancelar' : 'Voltar'}
            </button>

            {etapa < 3 ? (
              <button
                onClick={avancarEtapa}
                disabled={!podeAvancar() || loading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Avançar
              </button>
            ) : (
              <button
                onClick={handleConfirmar}
                disabled={!podeAvancar() || loading}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Confirmar Exclusão
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
