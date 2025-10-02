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
    (async () => {
      try {
        const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });

        // Get base URL from registration scope
        const baseUrl = self.registration.scope;
        const fullUrl = new URL(target, baseUrl).href;

        // Try to find and focus an existing window
        for (const client of clientList) {
          try {
            if (client.url.startsWith(baseUrl)) {
              await client.focus();
              // Use postMessage instead of navigate for better compatibility
              client.postMessage({ type: 'NAVIGATE', url: target });
              return;
            }
          } catch (e) {
            console.error('Error focusing client:', e);
          }
        }

        // If no window found, open a new one
        if (clients.openWindow) {
          await clients.openWindow(fullUrl);
        }
      } catch (e) {
        console.error('Notification click error:', e);
        // Fallback: try to open a new window
        try {
          if (clients.openWindow) {
            await clients.openWindow(self.registration.scope);
          }
        } catch (fallbackError) {
          console.error('Fallback error:', fallbackError);
        }
      }
    })()
  );
});
