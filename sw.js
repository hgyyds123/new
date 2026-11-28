const CACHE_NAME = 'hg-platform-v1';
const OFFLINE_URL = '/offline.html';

// 预缓存核心资源
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/material-symbols.woff2',
  '/config.js',
  '/manifest.json',
  '/version.json',
  '/account/',
  '/community/',
  '/talkroom/',
  '/talkroom/chat/',
  '/talkroom/private/',
  '/talkroom/my-messages/',
  '/game/',
  '/gs/',
  '/care/',
  '/news/',
  '/updates/'
];

// 安装：预缓存
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

// 抓取：网络优先，失败后回退缓存，再失败回离线页
self.addEventListener('fetch', event => {
  // 只处理 GET 请求，跳过 POST/PUT/DELETE 等 API 调用
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode === 'navigate') {
    // 页面导航：网络优先，离线回退
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 成功则缓存
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // 静态资源：缓存优先，回退网络
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // 只缓存成功的 GET 响应
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// 启动检查更新
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    event.waitUntil(
      fetch('/version.json', { cache: 'no-store' })
        .then(res => res.json())
        .then(latest => {
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'UPDATE_AVAILABLE',
                version: latest.version,
                current: event.data.current
              });
            });
          });
        })
    );
  }
});
