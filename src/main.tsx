import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { GrowthProvider } from './growth/GrowthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode><GrowthProvider><App /></GrowthProvider></StrictMode>
);
