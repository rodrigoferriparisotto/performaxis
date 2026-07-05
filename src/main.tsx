import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupConsoleHelpers } from './utils/consoleTestHelpers';

if (import.meta.env.DEV) {
  setupConsoleHelpers();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);