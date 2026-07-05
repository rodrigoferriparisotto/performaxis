import React, { useEffect, useState, useRef } from 'react';
import { Trophy, Star, Zap, Target, X, Sparkles } from 'lucide-react';

interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  percentage: number;
  message: string;
}

const AchievementModal: React.FC<AchievementModalProps> = ({
  isOpen,
  onClose,
  percentage,
  message
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const scrollPositionRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimatingOut(false);

      // Fechar menu lateral mobile quando a modal abrir
      window.dispatchEvent(new CustomEvent('close-sidebar'));

      // Salvar a posição atual do scroll
      scrollPositionRef.current = window.pageYOffset || window.scrollY || document.documentElement.scrollTop;

      // Bloquear scroll do body
      document.body.style.overflow = 'hidden';

      return () => {
        // Restaurar overflow
        document.body.style.overflow = 'unset';

        // Restaurar a posição do scroll imediatamente
        window.scrollTo({
          top: scrollPositionRef.current,
          behavior: 'auto'
        });
      };
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimatingOut(false);
      onClose();
    }, 300);
  };

  const getAchievementConfig = () => {
    if (percentage >= 100) {
      return {
        icon: Trophy,
        color: 'bg-gradient-to-br from-green-400 to-green-600',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        accentColor: 'border-green-500',
        glowColor: 'shadow-green-500/50',
        title: 'Missão Cumprida!',
        confetti: true
      };
    } else if (percentage >= 75) {
      return {
        icon: Star,
        color: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
        accentColor: 'border-yellow-500',
        glowColor: 'shadow-yellow-500/50',
        title: 'Quase Lá!',
        confetti: false
      };
    } else if (percentage >= 50) {
      return {
        icon: Zap,
        color: 'bg-gradient-to-br from-orange-400 to-orange-600',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        accentColor: 'border-orange-500',
        glowColor: 'shadow-orange-500/50',
        title: 'Metade do Caminho!',
        confetti: false
      };
    } else {
      return {
        icon: Target,
        color: 'bg-gradient-to-br from-blue-400 to-blue-600',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        accentColor: 'border-blue-500',
        glowColor: 'shadow-blue-500/50',
        title: 'Ótimo Começo!',
        confetti: false
      };
    }
  };

  const config = getAchievementConfig();
  const Icon = config.icon;

  if (!isVisible) return null;

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 0.6; }
        }

        @keyframes fadeOut {
          from { opacity: 0.6; }
          to { opacity: 0; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes scaleOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.9) translateY(-10px);
          }
        }

        @keyframes iconBounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.1) rotate(-5deg); }
          50% { transform: scale(1.2) rotate(0deg); }
          75% { transform: scale(1.1) rotate(5deg); }
        }

        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes confettiPop {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
          100% { transform: scale(0) rotate(360deg); opacity: 0; }
        }

        .overlay-enter {
          animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .overlay-exit {
          animation: fadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .modal-enter {
          animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .modal-exit {
          animation: scaleOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .icon-bounce {
          animation: iconBounce 0.8s ease-out 0.3s;
        }

        .shimmer-effect {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }

        .float-animation {
          animation: float 3s ease-in-out infinite;
        }

        .confetti {
          animation: confettiPop 1s ease-out forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .overlay-enter, .overlay-exit, .modal-enter, .modal-exit,
          .icon-bounce, .shimmer-effect, .float-animation, .confetti {
            animation: none !important;
          }
        }
      `}</style>

      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black z-[9998] ${isAnimatingOut ? 'overlay-exit' : 'overlay-enter'}`}
        onClick={handleClose}
        role="button"
        tabIndex={0}
        aria-label="Fechar notificação"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievement-title"
      >
        <div
          className={`relative bg-white rounded-2xl shadow-2xl ${config.glowColor} w-full max-w-md overflow-hidden ${isAnimatingOut ? 'modal-exit' : 'modal-enter'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-200"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Header with gradient */}
          <div className={`${config.color} relative overflow-hidden py-12 px-6`}>
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12" />
            </div>

            {/* Shimmer effect */}
            <div className="absolute inset-0 shimmer-effect" />

            {/* Icon */}
            <div className="relative flex justify-center mb-6">
              <div className={`${config.iconBg} p-6 rounded-full shadow-xl icon-bounce float-animation`}>
                <Icon className={`w-16 h-16 ${config.iconColor}`} />
              </div>
            </div>

            {/* Title */}
            <h2
              id="achievement-title"
              className="text-3xl font-bold text-white text-center mb-2"
            >
              {config.title}
            </h2>

            {/* Percentage */}
            <div className="flex items-center justify-center space-x-2">
              <div className="text-5xl font-extrabold text-white">
                {percentage}%
              </div>
              <Sparkles className="w-8 h-8 text-yellow-200" />
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            {/* Message */}
            <p className="text-center text-gray-600 text-lg leading-relaxed mb-6">
              {message}
            </p>

            {/* Progress bar */}
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${config.color} rounded-full transition-all duration-1000 ease-out shadow-lg`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">0%</span>
                <span className="text-xs font-semibold text-gray-700">{percentage}%</span>
                <span className="text-xs text-gray-500">100%</span>
              </div>
            </div>

            {/* Completion indicator for 100% */}
            {percentage >= 100 && (
              <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg text-center">
                <p className="text-green-700 font-semibold text-sm">
                  Todas as atividades foram concluídas!
                </p>
              </div>
            )}
          </div>

          {/* Confetti effect for 100% */}
          {config.confetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="confetti absolute w-2 h-2 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5],
                    animationDelay: `${Math.random() * 0.5}s`
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AchievementModal;
