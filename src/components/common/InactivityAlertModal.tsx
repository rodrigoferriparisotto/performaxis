import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

interface InactivityAlertModalProps {
  isOpen: boolean;
  onReviewNow: () => void;
  onPostpone: () => void;
  isPostponing?: boolean;
  minutesSinceLastMarking?: number;
}

const InactivityAlertModal: React.FC<InactivityAlertModalProps> = ({
  isOpen,
  onReviewNow,
  onPostpone,
  isPostponing = false,
  minutesSinceLastMarking = 20
}) => {
  if (!isOpen) return null;

  const getUrgencyLevel = (minutes: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (minutes >= 120) return 'critical';
    if (minutes >= 80) return 'high';
    if (minutes >= 40) return 'medium';
    return 'low';
  };

  const getUrgencyMessage = (minutes: number): string => {
    const urgency = getUrgencyLevel(minutes);
    switch (urgency) {
      case 'critical':
        return 'Atenção URGENTE! Atualize suas atividades imediatamente!';
      case 'high':
        return 'Atenção! Você está muito tempo sem atualizar suas atividades!';
      case 'medium':
        return 'Você já está algum tempo sem atualizar suas atividades. Revise agora!';
      default:
        return 'Você já está sem atualizar suas atividades. Revise agora!';
    }
  };

  const urgencyLevel = getUrgencyLevel(minutesSinceLastMarking);
  const headerColors = {
    low: 'from-orange-500 to-red-500',
    medium: 'from-red-500 to-red-600',
    high: 'from-red-600 to-red-700',
    critical: 'from-red-700 to-red-900'
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"></div>

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
        <div className={`bg-gradient-to-r ${headerColors[urgencyLevel]} px-6 py-4`}>
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white bg-opacity-20 rounded-full p-3 animate-pulse">
              <AlertTriangle size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Alerta de Inatividade</h3>
              <p className="text-sm text-orange-50">Ação necessária</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 text-center">
            <p className="text-gray-800 text-lg font-semibold leading-relaxed">
              {getUrgencyMessage(minutesSinceLastMarking)}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-gray-600">
              <Clock size={18} />
              <span className="text-sm">
                Última atualização há {minutesSinceLastMarking} minutos
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onReviewNow}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <AlertTriangle size={20} />
              Revisar Agora
            </button>

            <button
              onClick={onPostpone}
              disabled={isPostponing}
              className={`w-full px-6 py-3 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 ${
                isPostponing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <Clock size={18} />
              {isPostponing ? 'Adiando...' : 'Adiar por 10 Minutos'}
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Este alerta garante que você mantenha suas atividades atualizadas
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default InactivityAlertModal;
