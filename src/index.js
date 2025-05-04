// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';            // 確保你有 App.js 或 App.jsx
import { AuthProvider } from './contexts/AuthContext'; // 你先前建立的 AuthContext
import './index.css';        
       // 載入 Tailwind CSS
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("找不到 id 為 'root' 的 DOM 節點");
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
