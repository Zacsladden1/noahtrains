'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Paperclip, Send, Image as ImageIcon, MoreVertical } from 'lucide-react';

export default function CoachCommunityChatPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      await fetchGroupMessages();
      setLoading(false);
    })();
  }, []);

  const fetchGroupMessages = async () => {
    try {
      const { data: g } = await supabase.from('group_threads').select('id').eq('is_global', true).maybeSingle();
      if (!g?.id) { setMessages([]); return; }
      const { data } = await supabase
        .from('group_messages')
        .select('id, sender_id, body, created_at, sender:profiles(id, full_name, email, avatar_url)')
        .eq('thread_id', g.id)
        .order('created_at', { ascending: true });
      setMessages(data || []);
      requestAnimationFrame(() => { try { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; } catch {} });
    } catch {}
  };

  const send = async () => {
    try {
      if (!newMessage.trim() || !profile?.id) return;
      const { data: g } = await supabase.from('group_threads').select('id').eq('is_global', true).maybeSingle();
      if (!g?.id) return;
      await supabase.from('group_messages').insert({ thread_id: g.id, sender_id: profile.id, body: newMessage.trim() });
      setNewMessage('');
      await fetchGroupMessages();
    } catch {}
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 bg-white/10 rounded w-1/3 mb-3" />
        <div className="h-64 bg-white/10 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-black min-h-[100dvh] flex flex-col">
      {/* Header */}
      <div className="px-3 py-3 sm:px-4 sm:py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-white text-base sm:text-lg font-heading">Community</h1>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 sm:w-10 sm:h-10">
            <MoreVertical className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 pb-28">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-8 h-8 sm:w-12 sm:h-12 text-gold mx-auto mb-4 opacity-50" />
            <p className="text-white/60 text-sm sm:text-base">No messages yet</p>
            <p className="text-xs sm:text-sm text-white/60">Say hello to the community</p>
          </div>
        ) : (
          messages.map((m) => {
            const isOwn = m.sender_id === profile?.id;
            return (
              <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-end space-x-2 sm:space-x-3 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {!isOwn && (
                    <Avatar className="w-6 h-6 sm:w-8 sm:h-8">
                      {m.sender?.avatar_url ? <AvatarImage src={m.sender.avatar_url} alt={m.sender.full_name || 'User'} /> : null}
                      <AvatarFallback className="text-xs bg-gold text-black">{(m.sender?.full_name || m.sender?.email || 'U').slice(0,1)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`px-4 py-2 rounded-2xl ${isOwn ? 'bg-gold text-black' : 'bg-white/10 text-white'}`}>
                    <p className="text-[11px] text-white/60 mb-1">{m.sender?.full_name || m.sender?.email || 'User'}</p>
                    <p className="text-xs sm:text-sm">{m.body}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-black/70' : 'text-white/60'}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
          <div className="flex-1">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e)=>{ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              className="mobile-input border-0 bg-white/10 text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <Button onClick={send} disabled={!newMessage.trim()} className="bg-gold hover:bg-gold/90 text-black w-8 h-8 sm:w-10 sm:h-10 p-0">
            <Send className="w-3 h-3 sm:w-4 sm:h-4 text-black" />
          </Button>
        </div>
      </div>
    </div>
  );
}


