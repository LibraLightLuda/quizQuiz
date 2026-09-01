import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { GrowthProvider } from './growth/GrowthContext';
import { LocaleProvider } from './i18n/LocaleContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode><LocaleProvider><GrowthProvider><App /></GrowthProvider></LocaleProvider></StrictMode>
);
