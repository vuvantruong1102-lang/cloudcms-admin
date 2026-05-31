// CloudCMS Service Worker
// Mục tiêu: cài đặt PWA hợp lệ + chạy offline ở mức app shell.
// LƯU Ý: KHÔNG cache request tới /api (dữ liệu động + cần auth, luôn lấy mạng).

const CACHE = 'cloudcms-shell-v1';

// Các tài nguyên tĩnh cốt lõi để app mở được khi offline.
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll dễ fail nếu 1 file lỗi → dùng vòng lặp bỏ qua lỗi lẻ
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch(() => { /* bỏ qua file thiếu, không chặn cài đặt */ })
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Chỉ xử lý GET cùng origin.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Bỏ qua hoàn toàn API: luôn để trình duyệt gọi mạng trực tiếp.
  if (url.pathname.startsWith('/api')) return;

  // Điều hướng trang (SPA): network-first, fallback index.html khi offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Tài nguyên tĩnh (JS/CSS/ảnh/icon): cache-first, nền cập nhật sau.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
