import React, { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useVersion } from '../../contexts/VersionContext';

export const UpdateModal: React.FC = () => {
  const { needsUpdate, newVersion, handleUpdate } = useVersion();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!needsUpdate) {
    return null;
  }

  const onUpdate = async () => {
    setIsUpdating(true);
    try {
      await handleUpdate();
    } catch (error) {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm pointer-events-auto">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 animate-fadeIn">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            {isUpdating ? (
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            ) : (
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" style={{ animationDuration: '2s' }} />
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Nova versão disponível!
          </h2>

          <p className="text-gray-600 mb-2">
            Uma atualização do sistema está disponível e precisa ser instalada.
          </p>

          {newVersion && (
            <p className="text-sm text-gray-500 mb-6">
              Versão: <span className="font-semibold text-blue-600">{newVersion}</span>
            </p>
          )}

          <button
            onClick={onUpdate}
            disabled={isUpdating}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Atualizando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                <span>Atualizar Agora</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 mt-4">
            {isUpdating
              ? 'Aguarde enquanto o sistema é atualizado...'
              : 'Por favor, atualize o sistema para continuar utilizando.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};
