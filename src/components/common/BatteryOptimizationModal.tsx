import React, { useState } from 'react';
import { BatteryWarning, ExternalLink, CheckCircle, X } from 'lucide-react';
import type { BatteryGuide } from '../../constants/batteryOptimizationGuides';

interface BatteryOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (configured: boolean) => void;
  guide: BatteryGuide;
}

export default function BatteryOptimizationModal({
  isOpen,
  onClose,
  onConfirm,
  guide,
}: BatteryOptimizationModalProps) {
  const [hasConfigured, setHasConfigured] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(hasConfigured);
  };

  const handleSeeLater = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <BatteryWarning className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Melhore a Confiabilidade das Notificações
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Configure seu {guide.displayName} para receber 100% dos lembretes
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Por que isso é importante?</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>O Android pausa apps em segundo plano para economizar bateria</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Isso impede que você receba notificações importantes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>A configuração leva apenas 2 minutos</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-900 mb-2">Benefícios</h3>
            <ul className="space-y-2 text-sm text-green-800">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Receba 100% dos lembretes de atividades</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Nunca perca prazos importantes</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Configuração segura e recomendada</span>
              </li>
            </ul>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                {guide.displayName}
              </div>
              <span className="text-sm text-gray-600">Detectado automaticamente</span>
            </div>

            <h3 className="font-semibold text-gray-900 mb-3">
              Siga estes passos no seu dispositivo:
            </h3>
            <ol className="space-y-3">
              {guide.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <span className="text-gray-700 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={hasConfigured}
                onChange={(e) => setHasConfigured(e.target.checked)}
                className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                Eu já configurei a otimização de bateria seguindo os passos acima
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button
              onClick={handleConfirm}
              disabled={!hasConfigured}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                hasConfigured
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Entendi
            </button>
            <button
              onClick={handleSeeLater}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Ver Depois
            </button>
          </div>

          <a
            href={guide.dontKillMyAppLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ver Guia Completo no Don't Kill My App
          </a>

          <p className="text-xs text-gray-500 text-center mt-4">
            Isso não afeta significativamente a bateria do seu dispositivo
          </p>
        </div>
      </div>
    </div>
  );
}
