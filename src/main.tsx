import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './i18n/LanguageContext';
import { applyMode, getStoredMode } from './theme/mode';
import { applyPalette, getStoredPalette } from './theme/palette';
import './index.css';

// Before the first paint, so a returning player never sees the classic suits or
// the system theme flash in before their stored choices take effect. A null mode
// leaves the attribute off, which is what keeps the system default working.
applyPalette(getStoredPalette());
applyMode(getStoredMode());

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
