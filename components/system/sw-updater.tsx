'use client';

import { useEffect } from 'react';

export default function SWUpdater() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    let reloaded = false;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');

        // Proactively check for updates when app returns to foreground
        const onVisibility = () => {
          if (document.visibilityState === 'visible') {
            try { reg.update(); } catch {}
          }
        };
        document.addEventListener('visibilitychange', onVisibility);

        // If a new worker is found, activate it immediately
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                try { reg.waiting?.postMessage({ type: 'SKIP_WAITING' }); } catch {}
              }
            }
          });
        });

        // When the controller changes, reload once to get the fresh app
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloaded) return;
          reloaded = true;
          try {
            const u = new URL(window.location.href);
            u.searchParams.set('v', Date.now().toString());
            window.location.replace(u.toString());
          } catch {
            window.location.reload();
          }
        });
      } catch {}
    };

    register();
  }, []);

  return null;
}
