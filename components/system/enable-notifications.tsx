'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

type Props = { className?: string; onRegistered?: () => void };

export default function EnableNotificationsButton({ className, onRegistered }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean>(false);
  const { user } = useAuth();

  // Convert subscription to payload for our API
  const subToPayload = async (sub: PushSubscription | null) => {
    if (!sub) return null;
    const keyBuf = sub.getKey('p256dh');
    const authBuf = sub.getKey('auth');
    if (!keyBuf || !authBuf) return null;
    const toB64Url = (u8: Uint8Array) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return {
      endpoint: sub.endpoint,
      keys: {
        p256dh: toB64Url(new Uint8Array(keyBuf)),
        auth: toB64Url(new Uint8Array(authBuf)),
      },
      userId: user?.id,
    };
  };

  // On mount, detect existing permission/subscription so the button reflects reality
  useEffect(() => {
    (async () => {
      try {
        if (typeof window === 'undefined') return;
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') { setEnabled(false); return; }
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setEnabled(false); return; }
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription() || null;
        if (sub) {
          setEnabled(true);
          // Best-effort sync to backend so settings persist across devices
          try {
            const payload = await subToPayload(sub);
            if (payload) await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          } catch {}
          setStatus('Enabled');
        } else {
          setEnabled(false);
        }
      } catch {}
    })();
  }, [user?.id]);

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
          const padding = '='.repeat((4 - (base64.length % 4)) % 4);
          const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
          const raw = atob(b64);
          const arr = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
          return arr;
        })()
      });

      const payload = await subToPayload(sub);
      if (!payload) { setError('Invalid subscription keys'); return; }

      setStatus('Saving subscription…');
      const resp = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await resp.json().catch(()=>({ ok: false }));
      if (!resp.ok || j?.ok === false) throw new Error(j?.error || 'Failed to save');

      setStatus('Enabled');
      setEnabled(true);
      onRegistered?.();
    } catch (e: any) {
      setError(e?.message || 'Failed to enable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={enable} className={className} disabled={loading || enabled}>
        {loading ? 'Enabling…' : (enabled ? 'Notifications enabled' : 'Enable Notifications')}
      </button>
      {status && !error ? <span className="text-white/60 text-xs">{status}</span> : null}
      {error ? <span className="text-red-400 text-xs">{error}</span> : null}
    </div>
  );
}


