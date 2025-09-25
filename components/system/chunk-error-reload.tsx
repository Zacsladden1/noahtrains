'use client';

import { useEffect } from 'react';

export default function ChunkErrorReload() {
  useEffect(() => {
    const bustAndReload = async () => {
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {}
      const url = new URL(window.location.href);
      url.searchParams.set('v', Date.now().toString());
      window.location.replace(url.toString());
    };

    const onError = (e: ErrorEvent) => {
      const src = (e.target as any)?.src as string | undefined;
      const msg = String(e.message || '');
      if ((src && src.includes('/_next/static/chunks/')) || msg.includes('ChunkLoadError')) {
        bustAndReload();
      }
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = String(e.reason?.message || e.reason || '');
      if (msg.includes('ChunkLoadError')) bustAndReload();
    };

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}


