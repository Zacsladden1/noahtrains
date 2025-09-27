'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Send } from 'lucide-react';

type Thread = {
  id: string;
  client_id: string;
  coach_id: string;
  last_message_at: string | null;
  last_viewed_by_coach_at: string | null;
  created_at: string;
};

export default function CoachMessagesPage() {
  const { profile } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [clients, setClients] = useState<Record<string, any>>({});
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'coach' | 'community'>('coach');
  const router = useRouter();

  // Community chat state
  const [cMsgs, setCMsgs] = useState<any[]>([]);
  const [cText, setCText] = useState('');
  const [cLoading, setCLoading] = useState(false);
  const cListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { data: th } = await supabase
        .from('message_threads')
        .select('id, client_id, coach_id, last_message_at, last_viewed_by_coach_at, created_at')
        .eq('coach_id', profile.id)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      const list = (th || []) as Thread[];
      setThreads(list);
      const clientIds = Array.from(new Set(list.map((t) => t.client_id)));
      if (clientIds.length) {
        const { data: cps } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', clientIds);
        const map: Record<string, any> = {};
        (cps || []).forEach((c: any) => { map[c.id] = c; });
        setClients(map);
      }
    })();
  }, [profile?.id]);

  useEffect(() => {
    if (tab === 'community') {
      (async () => {
        setCLoading(true);
        await fetchCommunity();
        setCLoading(false);
      })();
    }
  }, [tab]);

  const fetchCommunity = async () => {
    try {
      const { data: g } = await supabase.from('group_threads').select('id').eq('is_global', true).maybeSingle();
      if (!g?.id) { setCMsgs([]); return; }
      const { data } = await supabase
        .from('group_messages')
        .select('id, sender_id, body, created_at, sender:profiles(id, full_name, email, avatar_url)')
        .eq('thread_id', g.id)
        .order('created_at', { ascending: true });
      setCMsgs(data || []);
      requestAnimationFrame(()=>{ try { if (cListRef.current) cListRef.current.scrollTop = cListRef.current.scrollHeight; } catch {} });
    } catch {}
  };

  const sendCommunity = async () => {
    try {
      if (!cText.trim() || !profile?.id) return;
      const { data: g } = await supabase.from('group_threads').select('id').eq('is_global', true).maybeSingle();
      if (!g?.id) return;
      await supabase.from('group_messages').insert({ thread_id: g.id, sender_id: profile.id, body: cText.trim() });
      setCText('');
      await fetchCommunity();
    } catch {}
  };

  const filtered = threads.filter((t) => {
    const c = clients[t.client_id];
    const name = (c?.full_name || c?.email || '').toLowerCase();
    return name.includes(q.toLowerCase());
  });

  const isUnread = (t: Thread) => {
    if (!t.last_message_at) return false;
    if (!t.last_viewed_by_coach_at) return true;
    return new Date(t.last_message_at).getTime() > new Date(t.last_viewed_by_coach_at).getTime();
  };

  return (
    <div className="bg-black min-h-[100dvh] flex flex-col">
      <div className="px-3 py-3 sm:px-4 sm:py-4 border-b border-white/10 flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white">Messages</h1>
        <div className="flex items-center gap-1 bg-white/5 rounded p-1">
          <button onClick={()=>setTab('coach')} className={`px-2 py-1 text-xs rounded ${tab==='coach'?'bg-gold text-black':'text-white/70 hover:bg-white/10'}`}>Coach</button>
          <button onClick={()=>setTab('community')} className={`px-2 py-1 text-xs rounded ${tab==='community'?'bg-gold text-black':'text-white/70 hover:bg-white/10'}`}>Community</button>
        </div>
      </div>
      {tab==='community' && <div className="h-px bg-white/10" />}
      {tab==='coach' && (
        <div className="p-3 sm:p-4">
          <Input placeholder="Search clients..." value={q} onChange={(e) => setQ(e.target.value)} className="mobile-input" />
        </div>
      )}

      {tab==='coach' ? (
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 auto-rows-min items-start">
        {filtered.map((t) => {
          const c = clients[t.client_id];
          const title = c?.full_name || c?.email || 'Client';
          const lastAt = new Date(t.last_message_at || t.created_at);
          const dateStr = isNaN(lastAt.getTime()) ? '' : lastAt.toLocaleDateString();
          const timeStr = isNaN(lastAt.getTime()) ? '' : lastAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const unread = isUnread(t);
          return (
            <Card key={t.id} className="mobile-card compact relative cursor-pointer p-0 border border-white/10 shadow-none h-auto min-h-0 w-full max-w-full overflow-hidden max-h-[72px] sm:max-h-[80px]" onClick={() => router.push(`/coach/messages/${t.id}`)} style={{ minHeight: 'auto' }}>
              {unread && (
                <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-red-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold">•</div>
              )}
              <CardContent className="card-row-compact">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                    {c?.avatar_url ? <AvatarImage src={c.avatar_url} alt={title} /> : null}
                    <AvatarFallback className="text-[12px] sm:text-sm bg-gold text-black">{(title || 'U').slice(0,1)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-[14px] sm:text-base leading-tight truncate">{title}</p>
                    <p className="text-white/70 text-[12px] sm:text-[13px] mt-0.5 truncate">{dateStr && timeStr ? `${dateStr} ${timeStr}` : ''}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      ) : (
        <>
          <div ref={cListRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 pb-28">
            {cLoading ? (
              <div className="text-white/60 text-sm">Loading…</div>
            ) : cMsgs.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-8 h-8 sm:w-12 sm:h-12 text-gold mx-auto mb-4 opacity-50" />
                <p className="text-white/60 text-sm">No messages yet</p>
                <p className="text-white/60 text-xs">Say hello to the community</p>
              </div>
            ) : (
              cMsgs.map((m:any)=>{
                const isOwn = m.sender_id === profile?.id;
                return (
                  <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {!isOwn && (
                        <Avatar className="w-6 h-6 sm:w-8 h-8">
                          {m.sender?.avatar_url ? <AvatarImage src={m.sender.avatar_url} alt={m.sender.full_name || 'User'} /> : null}
                          <AvatarFallback className="text-xs bg-gold text-black">{(m.sender?.full_name || m.sender?.email || 'U').slice(0,1)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`px-3 py-2 rounded-2xl ${isOwn ? 'bg-gold text-black' : 'bg-white/10 text-white'}`}>
                        {!isOwn && <p className="text-[11px] text-white/60 mb-1">{m.sender?.full_name || m.sender?.email || 'User'}</p>}
                        <p className="text-xs sm:text-sm">{m.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="border-t border-white/10 p-3 sm:p-4 flex items-center gap-2 bg-black sticky bottom-0 pb-[max(0px,env(safe-area-inset-bottom))]">
            <Input value={cText} onChange={(e)=>setCText(e.target.value)} placeholder="Type a message…" className="mobile-input flex-1" />
            <Button onClick={sendCommunity} disabled={!cText.trim()} className="bg-gold hover:bg-gold/90 text-black w-8 h-8 p-0"><Send className="w-4 h-4 text-black" /></Button>
          </div>
        </>
      )}
    </div>
  );
}
