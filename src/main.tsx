import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

const host = document.getElementById('vraxxis-root');
if (!host) throw new Error('VRAXXIS: no host element.');

createRoot(host).render(
  <StrictMode>
    <App />
  </StrictMode>
);
