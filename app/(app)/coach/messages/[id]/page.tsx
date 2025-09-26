'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

export default function CoachThreadPage() {
  const params = useParams();
  const threadId = params?.id as string;
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!threadId) return;
    (async () => {
      const { data: th } = await supabase.from('message_threads').select('client_id').eq('id', threadId).maybeSingle();
      if (th?.client_id) {
        const { data: cp } = await supabase.from('profiles').select('id, full_name, email').eq('id', th.client_id).maybeSingle();
        setClient(cp);
      }
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, sender_id, body, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      setMessages(msgs || []);
    })();
  }, [threadId]);

  useEffect(() => {
    // attempt to register subscription silently
    (async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        if (Notification.permission === 'granted') {
          const reg = await navigator.serviceWorker.register('/sw.js');
          const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: (() => {
              const base64 = (window as any).VAPID_PUBLIC_KEY || '';
              if (!base64) return undefined as any;
              const padding = '='.repeat((4 - (base64.length % 4)) % 4);
              const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
              const raw = atob(b64);
              const arr = new Uint8Array(raw.length);
              for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
              return arr;
            })()
          });
          if (sub) {
            await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) });
          }
        }
      } catch {}
    })();
  }, []);

  const send = async () => {
    if (!text.trim() || !profile?.id) return;
    await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: profile.id,
      body: text.trim(),
    });
    setText('');
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, sender_id, body, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    setMessages(msgs || []);
    await supabase.from('message_threads').update({ last_message_at: new Date().toISOString() }).eq('id', threadId);
    // trigger push to client
    await fetch('/api/push/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threadId }) });
  };

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white mb-3">Chat with {client?.full_name || client?.email || 'Client'}</h1>

      <Card className="mobile-card">
        <CardHeader>
          <CardTitle className="text-white text-base">Thread</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto mb-3">
            {messages.map((m) => (
              <div key={m.id} className={`p-2 rounded ${m.sender_id === profile?.id ? 'bg-gold/20 text-white text-right' : 'bg-white/10 text-white text-left'}`}>
                <div className="text-xs text-white/60">{new Date(m.created_at).toLocaleString()}</div>
                <div className="text-sm whitespace-pre-wrap">{m.body}</div>
              </div>
            ))}
            {messages.length === 0 && <p className="text-white/60 text-sm">No messages yet.</p>}
          </div>
          <div className="flex gap-2">
            <Input value={text} onChange={(e)=>setText(e.target.value)} placeholder="Type your message..." className="mobile-input" />
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={send}>Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
