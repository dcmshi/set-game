import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './i18n/LanguageContext';
import { applyPalette, getStoredPalette } from './theme/palette';
import './index.css';

// Before the first paint, so a returning player never sees the classic suits
// flash in before their stored palette takes effect.
applyPalette(getStoredPalette());

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
