import React, { useState } from 'react';
import { Bell, CheckCircle, XCircle, Play, Loader, AlertTriangle } from 'lucide-react';
import { PushNotificationTester } from '../../utils/testPushNotifications';
import { useAuth } from '../../contexts/AuthContext';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
}

export default function TesteNotificacoesPush() {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');

  const runQuickTests = async () => {
    if (!user?.id) {
      alert('Você precisa estar logado para executar os testes');
      return;
    }

    setTesting(true);
    setResults([]);
    setCurrentTest('Iniciando testes...');

    const tester = new PushNotificationTester(user.id);

    setCurrentTest('Verificando configuração do Firebase...');
    await tester.testFirebaseConfiguration();

    setCurrentTest('Verificando variáveis de ambiente...');
    tester.testEnvironmentVariables();

    setCurrentTest('Verificando permissões do navegador...');
    await tester.testBrowserPermissions();

    setCurrentTest('Verificando Service Worker...');
    await tester.testServiceWorker();

    setCurrentTest('Verificando tokens no banco de dados...');
    await tester.testTokensInDatabase();

    setCurrentTest('Testando Edge Function...');
    await tester.testEdgeFunction();

    setCurrentTest('Testes concluídos!');
    setResults(tester.getResults());
    setTesting(false);
  };

  const runFullTests = async () => {
    if (!user?.id) {
      alert('Você precisa estar logado para executar os testes');
      return;
    }

    setTesting(true);
    setResults([]);
    setCurrentTest('Iniciando testes completos...');

    const tester = new PushNotificationTester(user.id);

    setCurrentTest('Verificando configuração do Firebase...');
    await tester.testFirebaseConfiguration();

    setCurrentTest('Verificando variáveis de ambiente...');
    tester.testEnvironmentVariables();

    setCurrentTest('Verificando permissões do navegador...');
    await tester.testBrowserPermissions();

    setCurrentTest('Verificando Service Worker...');
    await tester.testServiceWorker();

    setCurrentTest('Verificando tokens no banco de dados...');
    await tester.testTokensInDatabase();

    setCurrentTest('Testando Edge Function...');
    await tester.testEdgeFunction();

    setCurrentTest('Solicitando permissão e obtendo token...');
    await tester.testRequestPermissionAndToken();

    setCurrentTest('Enviando notificação de teste real...');
    await tester.testSendRealNotification();

    setCurrentTest('Testes concluídos!');
    setResults(tester.getResults());
    setTesting(false);
  };

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teste de Notificações Push</h1>
          <p className="text-gray-600 mt-1">
            Execute testes para verificar a configuração do Firebase e envio de notificações
          </p>
        </div>
        <Bell className="h-8 w-8 text-blue-600" />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Instruções:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Teste Rápido:</strong> Verifica a configuração sem solicitar permissões</li>
              <li><strong>Teste Completo:</strong> Solicita permissões e envia uma notificação real</li>
              <li>Para receber notificações, você precisa permitir quando o navegador solicitar</li>
              <li>Certifique-se de que as variáveis do Firebase estão configuradas no arquivo .env</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={runQuickTests}
          disabled={testing}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {testing ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              <span>Testando...</span>
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              <span>Teste Rápido</span>
            </>
          )}
        </button>

        <button
          onClick={runFullTests}
          disabled={testing}
          className="flex items-center justify-center space-x-2 bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {testing ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              <span>Testando...</span>
            </>
          ) : (
            <>
              <Bell className="h-5 w-5" />
              <span>Teste Completo (com envio)</span>
            </>
          )}
        </button>
      </div>

      {testing && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3">
            <Loader className="h-6 w-6 animate-spin text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900">Executando testes...</p>
              <p className="text-sm text-gray-600">{currentTest}</p>
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Resumo dos Testes</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{total}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{passed}</p>
                <p className="text-sm text-gray-600">Passou</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{failed}</p>
                <p className="text-sm text-gray-600">Falhou</p>
              </div>
            </div>

            {failed === 0 && total > 0 && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="font-semibold text-green-800">
                    Todos os testes passaram com sucesso!
                  </p>
                </div>
              </div>
            )}

            {failed > 0 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <p className="font-semibold text-yellow-800">
                    Alguns testes falharam. Verifique os detalhes abaixo.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Detalhes dos Testes</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {results.map((result, index) => (
                <div key={index} className="p-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {result.success ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{result.step}</p>
                      <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                        {result.message}
                      </p>
                      {result.data && (
                        <div className="mt-2 bg-gray-50 rounded p-3 overflow-x-auto">
                          <pre className="text-xs text-gray-700">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Troubleshooting</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>Erro: Firebase não está configurado</strong></p>
          <p className="ml-4">- Verifique se todas as variáveis VITE_FIREBASE_* estão no arquivo .env</p>

          <p className="mt-3"><strong>Erro: Permissão negada</strong></p>
          <p className="ml-4">- Vá nas configurações do navegador e habilite notificações para este site</p>

          <p className="mt-3"><strong>Erro: Service Worker não registrado</strong></p>
          <p className="ml-4">- Recarregue a página (Ctrl+F5)</p>
          <p className="ml-4">- Verifique se o arquivo firebase-messaging-sw.js existe em /public</p>

          <p className="mt-3"><strong>Erro: Edge Function não responde</strong></p>
          <p className="ml-4">- Verifique se a função está deployada no Supabase</p>
          <p className="ml-4">- Verifique se as variáveis FIREBASE_SERVICE_ACCOUNT_JSON e FIREBASE_PROJECT_ID estão configuradas no Supabase</p>

          <p className="mt-3"><strong>Notificação não aparece</strong></p>
          <p className="ml-4">- Verifique o console do navegador para erros</p>
          <p className="ml-4">- Certifique-se de que não está em modo "Não perturbe"</p>
          <p className="ml-4">- Teste em uma aba anônima para descartar extensões</p>
        </div>
      </div>
    </div>
  );
}
