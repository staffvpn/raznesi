import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { bootstrapTelegram } from './lib/telegram';

try {
  bootstrapTelegram();
} catch (err) {
  // Belt and braces on top of bootstrapTelegram's own internal guards —
  // nothing from the Telegram bridge should ever be able to stop the app
  // from rendering.
  console.error('bootstrapTelegram failed', err);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
