self.addEventListener('install', (event) => {
  // Ensure the new SW takes control immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients and clear any old caches that might hold stale Next.js chunks
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (_) {}
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (!event?.data) return;
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Always bypass caches for Next.js assets and navigations to prevent stale chunks
  const isNextStatic = url.pathname.startsWith('/_next/static/');
  const isNextImage = url.pathname.startsWith('/_next/image');
  const isNavigation = req.mode === 'navigate';

  if (isNextStatic || isNextImage || isNavigation) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {}
  const title = data.title || 'Noahhtrains';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/Screenshot%202025-09-24%20at%2020.12.14.png',
    badge: '/favicon.svg',
    data: { url: data.url || '/dashboard' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification && event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
