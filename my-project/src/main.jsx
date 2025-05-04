import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('main.jsx loaded'); // 方便確認是否載入

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("找不到 id 為 'root' 的 DOM 節點！");
} else {
  console.log('root element found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
