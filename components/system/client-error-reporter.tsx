'use client';

import { useEffect, useState } from 'react';

export default function ClientErrorReporter() {
  const [hasError, setHasError] = useState(false);
  const [lastErrorId, setLastErrorId] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    const report = async (payload: any) => {
      try {
        const res = await fetch('/api/log/client-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const j = await res.json().catch(() => null);
        if (j && j.id) setLastErrorId(j.id);
      } catch {}
    };

    const onError = (e: ErrorEvent) => {
      setHasError(true);
      report({
        message: e.message || 'Unknown error',
        stack: (e.error && (e.error.stack || e.error.toString())) || null,
        url: window.location.href,
        userAgent: navigator.userAgent,
        type: 'error',
      });
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      setHasError(true);
      const reason = (e.reason && (e.reason.stack || e.reason.message || e.reason.toString())) || 'Promise rejection';
      report({
        message: 'Unhandled promise rejection',
        stack: reason,
        url: window.location.href,
        userAgent: navigator.userAgent,
        type: 'unhandledrejection',
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  const reload = async () => {
    try {
      // Ask any waiting service worker to activate
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch {}
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('v', Date.now().toString());
      window.location.replace(u.toString());
    } catch {
      window.location.reload();
    }
  };

  if (!hasError) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000]">
      <div className="m-3 rounded-lg border border-white/20 bg-gold text-black shadow-lg px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-sm">
          <strong>Update available or error detected.</strong> Tap reload to continue.
          {lastErrorId ? <span className="ml-2 opacity-70">Ref: {lastErrorId}</span> : null}
        </div>
        <button onClick={reload} className="px-3 py-1 rounded-md bg-black/10 hover:bg-black/20 text-sm font-semibold">Reload</button>
      </div>
    </div>
  );
}
