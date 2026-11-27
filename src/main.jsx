import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { boot } from './boot.js';
import './styles.css';

boot(window, document.getElementById('root'), (el) => {
  createRoot(el).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
