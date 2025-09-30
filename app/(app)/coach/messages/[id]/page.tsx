'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const dedupeById = (items: any[]) => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const it of items || []) {
      if (!it?.id || seen.has(it.id)) continue;
      seen.add(it.id);
      out.push(it);
    }
    return out.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  useEffect(() => {
    if (!threadId) return;
    (async () => {
      const { data: th } = await supabase.from('message_threads').select('client_id').eq('id', threadId).maybeSingle();
      if (th?.client_id) {
        const { data: cp } = await supabase.from('profiles').select('id, full_name, email, avatar_url').eq('id', th.client_id).maybeSingle();
        setClient(cp);
      }
      const { data: msgs } = await supabase
      .from('messages')
      .select('id, sender_id, body, created_at, attachments:attachments(id, storage_path, file_name, mime_type, file_size)')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      setMessages(dedupeById(msgs || []));
      requestAnimationFrame(() => {
        try { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; } catch {}
      });
    })();
  }, [threadId]);

  useEffect(() => {
    if (!threadId) return;
    // realtime subscription for new messages in this thread
    const channel = supabase
      .channel(`coach-thread-${threadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` }, (payload) => {
        setMessages((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          if (arr.some((m: any) => m.id === payload.new.id)) return arr;
          return dedupeById([...arr, payload.new]);
        });
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
    setMessages(dedupeById(msgs || []));
    await supabase.from('message_threads').update({ last_message_at: new Date().toISOString() }).eq('id', threadId);
    // mark viewed after sending
    try { await supabase.from('message_threads').update({ last_viewed_by_coach_at: new Date().toISOString() }).eq('id', threadId); } catch {}
    // trigger push to the other party only (server filters recipients using senderId)
    await fetch('/api/push/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threadId, senderId: profile.id, preview: text.trim().slice(0, 100) }) });
  };

  const uploadAttachment = async (file: File) => {
    if (!threadId || !profile?.id || !file) return;
    const path = `thread/${threadId}/${Date.now()}_${file.name}`.replace(/\s+/g, '_');
    const { data, error } = await supabase.storage.from('chat').upload(path, file);
    if (error) { console.error(error); return; }
    const { data: pub } = supabase.storage.from('chat').getPublicUrl(data.path);
    const { data: msg } = await supabase.from('messages').insert({ thread_id: threadId, sender_id: profile.id, body: null }).select('id').single();
    await supabase.from('attachments').insert({ message_id: msg!.id, storage_path: data.path, file_name: file.name, mime_type: file.type, file_size: file.size });
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, sender_id, body, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    setMessages(msgs || []);
  };

  return (
    <div className="bg-black min-h-[100dvh] flex flex-col">
      {/* Top bar */}
      <div className="px-3 py-3 sm:px-4 sm:py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
              {client?.avatar_url ? (
                <AvatarImage src={client.avatar_url} alt={client.full_name || 'Client'} />
              ) : null}
              <AvatarFallback className="bg-gold text-black">{(client?.full_name || client?.email || 'C').slice(0,1)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-white text-base sm:text-lg font-heading">{client?.full_name || client?.email || 'Client'}</h1>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gold rounded-full"></div>
                <span className="text-xs sm:text-sm text-white/60">Online</span>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 sm:w-10 sm:h-10"><MoreVertical className="w-4 h-4 text-white" /></Button>
          </div>
        </div>
      </div>

      {/* Messages list fills available height */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 pb-28">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-white/60 text-sm sm:text-base">No messages yet</span>
              </div>
            ) : (
              messages.map((m) => {
                const isOwn = m.sender_id === profile?.id;
                const canDelete = m.sender_id === profile?.id;
                return (
                  <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-end space-x-1 sm:space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {!isOwn && (
                        <Avatar className="w-5 h-5 sm:w-6 sm:h-6">
                          {client?.avatar_url ? (
                            <AvatarImage src={client.avatar_url} alt={client.full_name || 'Client'} />
                          ) : null}
                          <AvatarFallback className="text-xs bg-gold text-black">{(client?.full_name || client?.email || 'C').slice(0,1)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`px-4 py-2 rounded-2xl ${isOwn ? 'bg-gold text-black' : 'bg-white/10 text-white'}`}>
                        <p className="text-xs sm:text-sm whitespace-pre-wrap">{m.body}</p>
                        {Array.isArray((m as any).attachments) && (m as any).attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {(m as any).attachments.map((att:any) => {
                              const { data } = supabase.storage.from('chat').getPublicUrl(att.storage_path);
                              const url = data.publicUrl;
                              const isImage = (att.mime_type || '').startsWith('image/');
                              return isImage ? (
                                <a key={att.id} href={url} target="_blank" rel="noreferrer">
                                  <img src={url} alt={att.file_name} className="max-h-40 max-w-[220px] w-auto h-auto rounded-md" />
                                </a>
                              ) : (
                                <a key={att.id} href={url} target="_blank" rel="noreferrer" className="underline text-xs">
                                  {att.file_name}
                                </a>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-[10px] ${isOwn ? 'text-black/70' : 'text-white/60'}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          {canDelete && (
                            <button
                              className={`text-[10px] underline ${isOwn ? 'text-black/80' : 'text-white/80'}`}
                              onClick={async ()=>{
                                await supabase.from('messages').delete().eq('id', m.id);
                                const { data: msgs } = await supabase
                                  .from('messages')
                                  .select('id, sender_id, body, created_at, attachments:attachments(id, storage_path, file_name, mime_type, file_size)')
                                  .eq('thread_id', threadId)
                                  .order('created_at', { ascending: true });
                                setMessages(msgs || []);
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/20 p-3 sm:p-4 bg-black sticky bottom-0 pb-[max(0px,env(safe-area-inset-bottom))]">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) uploadAttachment(f); e.currentTarget.value=''; }} />
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) uploadAttachment(f); e.currentTarget.value=''; }} />
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 sm:w-10 sm:h-10" onClick={()=>fileInputRef.current?.click()}><Paperclip className="w-4 h-4 text-gold" /></Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 sm:w-10 sm:h-10" onClick={()=>imageInputRef.current?.click()}><ImageIcon className="w-4 h-4 text-gold" /></Button>
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
    </div>
  );
}
