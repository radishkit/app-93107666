import React from 'react';
import { createRoot } from 'react-dom/client';

import './radish-ui/tokens.css';
import './radish-ui/components.css';
import './styles.css';

import App from './App';

// Apply saved theme immediately to prevent flash
const savedTheme = localStorage.getItem('radish-theme');
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
