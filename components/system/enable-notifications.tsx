'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

export default function EnableNotificationsButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const enable = async () => {
    try {
      setLoading(true);
      if (!('Notification' in window)) { alert('Notifications not supported'); return; }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { alert('Notifications not granted'); return; }
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) { alert('Push not supported'); return; }
      const reg = await navigator.serviceWorker.register('/sw.js');
      const res = await fetch('/api/push/vapid');
      const { publicKey } = await res.json();
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
      await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sub, userId: user?.id }) });
      alert('Notifications enabled');
    } catch (e) {
      console.error(e);
      alert('Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={enable} className={className} disabled={loading}>
      {loading ? 'Enabling…' : 'Enable Notifications'}
    </button>
  );
}


