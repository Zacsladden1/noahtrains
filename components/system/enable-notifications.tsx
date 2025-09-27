'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

type Props = { className?: string; onRegistered?: () => void };

export default function EnableNotificationsButton({ className, onRegistered }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const enable = async () => {
    setError(null);
    setStatus('');
    try {
      setLoading(true);
      if (!('Notification' in window)) { setError('Notifications not supported'); return; }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setError('Permission denied'); return; }
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setError('Push not supported'); return; }

      setStatus('Checking service worker…');
      try {
        const head = await fetch('/sw.js', { method: 'HEAD', cache: 'no-store' });
        if (!head.ok) throw new Error('sw.js not found');
      } catch (_) {
        setError('Service worker not available on this deployment');
        return;
      }

      setStatus('Registering service worker…');
      const reg = await navigator.serviceWorker.register('/sw.js');

      setStatus('Fetching VAPID key…');
      const res = await fetch('/api/push/vapid');
      const { publicKey } = await res.json();
      if (!publicKey) { setError('Server missing VAPID key'); return; }

      setStatus('Subscribing device…');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: (() => {
          const base64 = publicKey || '';
          const padding = '='.repeat((4 - (base4.length % 4)) % 4);
          const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
          const raw = atob(b64);
          const arr = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
          return arr;
        })()
      });

      setStatus('Saving subscription…');
      const resp = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sub, userId: user?.id }) });
      const j = await resp.json().catch(()=>({ ok: false }));
      if (!resp.ok || j?.ok === false) throw new Error(j?.error || 'Failed to save');

      setStatus('Enabled');
      onRegistered?.();
    } catch (e: any) {
      setError(e?.message || 'Failed to enable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={enable} className={className} disabled={loading}>
        {loading ? 'Enabling…' : 'Enable Notifications'}
      </button>
      {status && !error ? <span className="text-white/60 text-xs">{status}</span> : null}
      {error ? <span className="text-red-400 text-xs">{error}</span> : null}
    </div>
  );
}


