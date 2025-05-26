import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

window.DEV_MODE = true; // Set to true to enable developer features

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
