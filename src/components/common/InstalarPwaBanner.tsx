import { useState } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';

const CHAVE_DISPENSA = 'performaxis_instalar_dispensado_em';
const DIAS_DISPENSA = 14;

function dispensadoRecentemente(): boolean {
  try {
    const valor = localStorage.getItem(CHAVE_DISPENSA);
    if (!valor) return false;
    const dias = (Date.now() - Number(valor)) / (1000 * 60 * 60 * 24);
    return dias < DIAS_DISPENSA;
  } catch {
    return false;
  }
}

/**
 * Banner fixo no rodapé (só em celular, só se o app não estiver instalado):
 * - Android/Chrome: botão "Instalar" abre o prompt nativo.
 * - iPhone/iPad: botão "Como instalar" mostra o passo a passo do Safari.
 * Dispensado, volta a aparecer depois de 14 dias.
 */
export function InstalarPwaBanner() {
  const { podeInstalar, instalado, ehIos, ehMobile, instalar } = usePwaInstall();
  const [dispensado, setDispensado] = useState(dispensadoRecentemente());
  const [mostrarPassosIos, setMostrarPassosIos] = useState(false);

  const visivel = !instalado && ehMobile && (podeInstalar || ehIos) && !dispensado;
  if (!visivel) return null;

  const dispensar = () => {
    try {
      localStorage.setItem(CHAVE_DISPENSA, String(Date.now()));
    } catch {
      // sem localStorage: dispensa só nesta visita
    }
    setDispensado(true);
  };

  const onInstalar = async () => {
    if (ehIos) {
      setMostrarPassosIos(true);
      return;
    }
    const aceitou = await instalar();
    if (aceitou) {
      setDispensado(true);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-blue-900 text-white shadow-lg">
        {/* pr-20 reserva espaço para o botão flutuante do WhatsApp da landing */}
        <div className="max-w-3xl mx-auto pl-4 pr-20 sm:pr-4 py-3 flex items-center gap-3">
          <img src="/icon-192.png" alt="" className="w-9 h-9 rounded-lg flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">Instale o Performaxis no seu celular</p>
            <p className="text-xs text-blue-200 leading-tight">Acesso direto da tela inicial, como um aplicativo</p>
          </div>
          <button
            onClick={onInstalar}
            className="flex items-center gap-1.5 bg-white text-blue-900 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-blue-50 flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{ehIos ? 'Como instalar' : 'Instalar'}</span>
          </button>
          <button
            onClick={dispensar}
            aria-label="Dispensar"
            className="p-2 text-blue-300 hover:text-white flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {mostrarPassosIos && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black bg-opacity-60"
          onClick={() => setMostrarPassosIos(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Instalar no iPhone/iPad</h3>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center flex-shrink-0">1</span>
                <span className="flex items-center gap-1 flex-wrap">
                  No Safari, toque em <strong>Compartilhar</strong>
                  <Share className="w-4 h-4 text-blue-600" /> (quadrado com seta, na barra de baixo)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center flex-shrink-0">2</span>
                <span className="flex items-center gap-1 flex-wrap">
                  Role a lista e toque em <strong>Adicionar à Tela de Início</strong>
                  <PlusSquare className="w-4 h-4 text-blue-600" />
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center flex-shrink-0">3</span>
                <span>Toque em <strong>Adicionar</strong>. Pronto: o Performaxis vira um ícone na sua tela inicial.</span>
              </li>
            </ol>
            <button
              onClick={() => setMostrarPassosIos(false)}
              className="mt-5 w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
