'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Paperclip, Image as ImageIcon, Phone, Video, MoreVertical } from 'lucide-react';
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
    if (!threadId) return;
    // realtime subscription for new messages in this thread
    const channel = supabase
      .channel(`coach-thread-${threadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [threadId]);

  useEffect(() => {
    // attempt to register subscription silently
    (async () => {
      try {
        if (process.env.NODE_ENV !== 'production') return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        if (Notification.permission === 'granted' && profile?.id) {
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
            await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sub, userId: profile.id }) });
          }
        }
      } catch {}
    })();
  }, [profile?.id]);

  useEffect(() => {
    if (!threadId) return;
    (async () => {
      try { await supabase.from('message_threads').update({ last_viewed_by_coach_at: new Date().toISOString() }).eq('id', threadId); } catch {}
    })();
  }, [threadId]);

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
    // mark viewed after sending
    try { await supabase.from('message_threads').update({ last_viewed_by_coach_at: new Date().toISOString() }).eq('id', threadId); } catch {}
    // trigger push to client
    await fetch('/api/push/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threadId }) });
  };

  return (
    <div className="mobile-padding mobile-spacing max-w-4xl mx-auto bg-black min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
            <AvatarFallback className="bg-gold text-black">{(client?.full_name || client?.email || 'C').slice(0,1)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white">{client?.full_name || client?.email || 'Client'}</h1>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gold rounded-full"></div>
              <span className="text-xs sm:text-sm text-white/60">Online</span>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 sm:w-10 sm:h-10"><Phone className="w-4 h-4 text-gold" /></Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 sm:w-10 sm:h-10"><Video className="w-4 h-4 text-gold" /></Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 sm:w-10 sm:h-10"><MoreVertical className="w-4 h-4 text-white" /></Button>
        </div>
      </div>

      {/* Chat */}
      <Card className="mobile-card">
        <CardHeader className="border-b border-white/20 p-3 sm:p-6">
          <CardTitle className="text-white text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-64 sm:h-96 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-white/60 text-sm sm:text-base">No messages yet</span>
              </div>
            ) : (
              messages.map((m) => {
                const isOwn = m.sender_id === profile?.id;
                return (
                  <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-end space-x-1 sm:space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {!isOwn && (
                        <Avatar className="w-5 h-5 sm:w-6 sm:h-6">
                          <AvatarFallback className="text-xs bg-gold text-black">{(client?.full_name || client?.email || 'C').slice(0,1)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`px-4 py-2 rounded-2xl ${isOwn ? 'bg-gold text-black' : 'bg-white/10 text-white'}`}>
                        <p className="text-xs sm:text-sm whitespace-pre-wrap">{m.body}</p>
                        <p className={`text-[10px] mt-1 ${isOwn ? 'text-black/70' : 'text-white/60'}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
        {/* Input */}
        <div className="border-t border-white/20 p-3 sm:p-4">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 sm:w-10 sm:h-10"><Paperclip className="w-4 h-4 text-gold" /></Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 sm:w-10 sm:h-10"><ImageIcon className="w-4 h-4 text-gold" /></Button>
            <div className="flex-1">
              <Input
                placeholder="Type a message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                className="mobile-input border-0 bg-white/10 text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <Button onClick={send} disabled={!text.trim()} className="bg-gold hover:bg-gold/90 text-black w-8 h-8 sm:w-10 sm:h-10 p-0">
              <Send className="w-4 h-4 text-black" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
