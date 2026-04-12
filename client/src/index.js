
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';

// client/src/index.js ke bilkul upar add karo
window.fs = {};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </AuthProvider>
);