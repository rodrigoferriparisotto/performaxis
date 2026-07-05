import React from 'react';
import { Info, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { useBroadcastMessage } from '../../contexts/BroadcastMessageContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const BroadcastMessageModal: React.FC = () => {
  const { currentMessage, markAsRead, unreadMessages } = useBroadcastMessage();

  if (!currentMessage) {
    return null;
  }

  const getMessageIcon = () => {
    switch (currentMessage.tipo) {
      case 'info':
        return <Info className="w-8 h-8 text-blue-600" />;
      case 'aviso':
        return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
      case 'urgente':
        return <AlertCircle className="w-8 h-8 text-red-600" />;
      default:
        return <Info className="w-8 h-8 text-blue-600" />;
    }
  };

  const getIconBackgroundColor = () => {
    switch (currentMessage.tipo) {
      case 'info':
        return 'bg-blue-100';
      case 'aviso':
        return 'bg-yellow-100';
      case 'urgente':
        return 'bg-red-100';
      default:
        return 'bg-blue-100';
    }
  };

  const getButtonColor = () => {
    switch (currentMessage.tipo) {
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'aviso':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'urgente':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  const handleClose = async () => {
    await markAsRead(currentMessage.id);
  };

  const formattedDate = format(new Date(currentMessage.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
    locale: ptBR,
  });

  const remainingMessages = unreadMessages.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full mx-4 animate-fadeIn max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col">
          {/* Header with icon and close button */}
          <div className="flex items-start justify-between mb-4">
            <div className={`w-16 h-16 ${getIconBackgroundColor()} rounded-full flex items-center justify-center flex-shrink-0`}>
              {getMessageIcon()}
            </div>

            {/* Only show close button if message doesn't block system */}
            {!currentMessage.bloqueia_sistema && (
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {currentMessage.titulo}
          </h2>

          {/* Content */}
          <div className="text-gray-700 mb-4 whitespace-pre-wrap leading-relaxed">
            {currentMessage.conteudo}
          </div>

          {/* Author and date */}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-6 pb-4 border-b">
            <span>
              {currentMessage.autor?.nome && (
                <>Por: <span className="font-medium">{currentMessage.autor.nome}</span></>
              )}
            </span>
            <span>{formattedDate}</span>
          </div>

          {/* Remaining messages indicator */}
          {remainingMessages > 0 && (
            <div className="mb-4 text-center">
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {remainingMessages} {remainingMessages === 1 ? 'mensagem pendente' : 'mensagens pendentes'}
              </span>
            </div>
          )}

          {/* Action button */}
          <button
            onClick={handleClose}
            className={`w-full ${getButtonColor()} text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2`}
          >
            <span>
              {currentMessage.bloqueia_sistema
                ? 'Confirmar Leitura'
                : remainingMessages > 0
                  ? 'Próxima Mensagem'
                  : 'Entendi'}
            </span>
          </button>

          {/* Warning text for blocking messages */}
          {currentMessage.bloqueia_sistema && (
            <p className="text-xs text-gray-500 mt-4 text-center">
              Esta mensagem requer sua confirmação para continuar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
