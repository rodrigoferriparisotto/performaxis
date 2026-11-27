import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { setupConsoleHelpers } from './utils/consoleTestHelpers';

if (import.meta.env.DEV) {
  setupConsoleHelpers();
}

const raiz = createRoot(document.getElementById('root')!);

// /c e /c/CODIGO: Concierge do hóspede (sem login) — não carrega o app inteiro
if (/^\/c(\/|$)/.test(window.location.pathname)) {
  import('./components/Public/ConciergeHospede').then(({ default: ConciergeHospede }) =>
    raiz.render(
      <StrictMode>
        <ConciergeHospede />
      </StrictMode>
    )
  );
} else {
  import('./App.tsx').then(({ default: App }) =>
    raiz.render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  );
}
