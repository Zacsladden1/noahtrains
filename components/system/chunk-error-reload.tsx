'use client';

import { useEffect, useState } from 'react';

export default function ChunkErrorReload() {
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const bustAndReload = async () => {
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (error) {
        console.warn('Failed to clear cache:', error);
      }

      // Add retry count to avoid infinite loops
      const newRetryCount = retryCount + 1;
      if (newRetryCount > 3) {
        console.error('Maximum retry attempts reached. Please refresh manually.');
        return;
      }

      setRetryCount(newRetryCount);
      const url = new URL(window.location.href);
      url.searchParams.set('v', Date.now().toString());
      url.searchParams.set('retry', newRetryCount.toString());
      window.location.replace(url.toString());
    };

    const onError = (e: ErrorEvent) => {
      const src = (e.target as any)?.src as string | undefined;
      const msg = String(e.message || '');

      // Check for chunk loading errors or syntax errors
      if (
        (src && src.includes('/_next/static/chunks/')) ||
        msg.includes('ChunkLoadError') ||
        msg.includes('Loading chunk') ||
        msg.includes('missing ) after argument list') ||
        msg.includes('SyntaxError')
      ) {
        console.warn('Chunk loading error detected, attempting to reload:', msg);
        bustAndReload();
      }
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = String(e.reason?.message || e.reason || '');
      if (
        msg.includes('ChunkLoadError') ||
        msg.includes('Loading chunk') ||
        msg.includes('missing ) after argument list')
      ) {
        console.warn('Chunk loading error in promise rejection:', msg);
        bustAndReload();
      }
    };

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [retryCount]);

  return null;
}


