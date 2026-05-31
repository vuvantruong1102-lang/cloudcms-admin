import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// ===== PWA: đăng ký service worker (chỉ chạy ở bản build production) =====
// Dev mode của Vite không phục vụ /sw.js từ public theo cách tương thích,
// nên chỉ đăng ký khi đã build (import.meta.env.PROD).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Đăng ký service worker thất bại:', err);
    });
  });
}
