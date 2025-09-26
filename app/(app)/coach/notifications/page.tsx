'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EnableNotificationsButton from '@/components/system/enable-notifications';
import { Input } from '@/components/ui/input';

const TEMPLATES = [
  'Eat your calories today 💪',
  'Don’t forget protein with each meal 🍗',
  'Drink your water 🥤',
  'It’s workout day—let’s go! 🏋️',
];

export default function CoachNotificationsPage() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email, role').eq('role', 'client').order('full_name', { ascending: true });
      setClients(data || []);
    })();
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const requestPermission = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return alert('Push not supported');
      if (process.env.NODE_ENV !== 'production') return alert('Enable notifications in production build only.');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return alert('Notifications not granted');
      const reg = await navigator.serviceWorker.register('/sw.js');
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: (() => {
        const base64 = (window as any).VAPID_PUBLIC_KEY || '';
        if (!base64) return undefined as any;
        const padding = '='.repeat((4 - (base64.length % 4)) % 4);
        const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(b64);
        const arr = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
        return arr;
      })() }));
      if (sub && profile?.id) {
        await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sub, userId: profile.id }) });
      }
      alert('Notifications enabled on this device.');
    } catch (e) {
      console.error(e);
      alert('Failed to enable notifications');
    }
  };

  const send = async () => {
    if (!message.trim()) return alert('Enter a message');
    setSending(true);
    try {
      const userIds = selected.length ? selected : clients.map((c) => c.id);
      const res = await fetch('/api/push/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userIds, payload: { title: 'Coach', body: message, url: '/messages' } }) });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Failed');
      alert(`Sent to ${j.sent || 0} device(s)`);
      setMessage('');
      setSelected([]);
    } catch (e: any) {
      alert(e?.message || 'Failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white mb-3">Notifications</h1>
      <Card className="mobile-card mb-4">
        <CardHeader>
          <CardTitle className="text-white text-base">Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {TEMPLATES.map((t) => (
              <Button key={t} variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={() => setMessage(t)}>{t}</Button>
            ))}
          </div>
          <Input value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="Type a notification..." className="mobile-input" />
          <div className="flex gap-2">
            <Button onClick={send} disabled={sending} className="bg-gold hover:bg-gold/90 text-black">Send</Button>
            <EnableNotificationsButton className="border-white/30 text-white hover:bg-white/10 px-4 py-2 rounded-md border" />
          </div>
        </CardContent>
      </Card>

      <Card className="mobile-card">
        <CardHeader>
          <CardTitle className="text-white text-base">Recipients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {clients.map((c) => (
              <label key={c.id} className={`flex items-center gap-2 p-2 rounded border ${selected.includes(c.id) ? 'border-gold' : 'border-white/20'} text-white`}>
                <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} />
                <span>{c.full_name || c.email}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
