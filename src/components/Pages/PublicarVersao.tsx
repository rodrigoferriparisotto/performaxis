import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { VersionService } from '../../services/versionService';
import { useAuth } from '../../contexts/AuthContext';

export const PublicarVersao: React.FC = () => {
  const { user } = useAuth();
  const [version, setVersion] = useState('');
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadCurrentVersion();
  }, []);

  const loadCurrentVersion = async () => {
    const current = await VersionService.getCurrentVersion();
    setCurrentVersion(current);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!version.trim()) {
      setMessage({ type: 'error', text: 'Por favor, informe o número da versão' });
      return;
    }

    if (user?.profile !== 'admin') {
      setMessage({ type: 'error', text: 'Apenas administradores podem publicar versões' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await VersionService.publishNewVersion(version.trim());

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Nova versão publicada com sucesso! Todos os usuários conectados foram notificados.',
        });
        setVersion('');
        await loadCurrentVersion();
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Erro ao publicar versão',
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao publicar versão',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-3 mb-6">
          <Package className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Publicar Nova Versão</h1>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Versão Atual:</strong>{' '}
            <span className="font-mono font-semibold">{currentVersion || 'Carregando...'}</span>
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-yellow-800 font-semibold mb-1">Atenção!</p>
              <p className="text-sm text-yellow-700">
                Ao publicar uma nova versão, todos os usuários conectados no sistema receberão uma
                notificação instantânea solicitando que atualizem. A atualização é obrigatória e
                bloqueará o uso do sistema até que seja concluída.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handlePublish} className="space-y-4">
          <div>
            <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-2">
              Número da Nova Versão
            </label>
            <input
              type="text"
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="Ex: 1.0.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Use o formato: X.Y.Z (ex: 1.0.0, 2.3.1)
            </p>
          </div>

          {message && (
            <div
              className={`flex items-start space-x-2 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <p
                className={`text-sm ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Publicando...</span>
              </>
            ) : (
              <>
                <Package className="w-5 h-5" />
                <span>Publicar Nova Versão</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="bg-gray-50 rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Como Funciona</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">1.</span>
            <span>Informe o número da nova versão no formato X.Y.Z</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">2.</span>
            <span>Clique em "Publicar Nova Versão"</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">3.</span>
            <span>
              Todos os usuários conectados receberão notificação instantânea via Realtime
            </span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">4.</span>
            <span>
              Um modal aparecerá bloqueando o uso até que o usuário clique em "Atualizar Agora"
            </span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">5.</span>
            <span>
              O sistema limpará o cache e recarregará automaticamente com a nova versão
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};
