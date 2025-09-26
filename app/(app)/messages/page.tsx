'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Send, 
  Paperclip, 
  MessageCircle, 
  Phone, 
  Video,
  MoreVertical,
  Image as ImageIcon
} from 'lucide-react';

export default function MessagesPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) initializeMessaging();
  }, [profile?.id]);

  const initializeMessaging = async () => {
    if (!profile?.id) return;
    try {
      // 1) Find assigned coach from clients table
      const { data: rel } = await supabase
        .from('clients')
        .select('coach_id')
        .eq('client_id', profile.id)
        .maybeSingle();

      const coach_id = rel?.coach_id || null;
      setCoachId(coach_id);

      // 2) Find or create thread between this client and coach
      let currentThreadId: string | null = null;
      if (coach_id) {
        const { data: existing } = await supabase
          .from('message_threads')
          .select('id')
          .eq('client_id', profile.id)
          .eq('coach_id', coach_id)
          .maybeSingle();
        currentThreadId = existing?.id || null;
        if (!currentThreadId) {
          const { data: created, error } = await supabase
            .from('message_threads')
            .insert({ client_id: profile.id, coach_id })
            .select('id')
            .single();
          if (!error) currentThreadId = created.id;
        }
      }

      if (!currentThreadId) {
        setLoading(false);
        return;
      }

      setThreadId(currentThreadId);
      await fetchMessages(currentThreadId);

      // 3) Realtime listener for new messages in this thread
      supabase
        .channel(`thread-${currentThreadId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${currentThreadId}` }, (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        })
        .subscribe();

      // 4) Try to register push subscription for this client (optional)
      try {
        if ('serviceWorker' in navigator && 'PushManager' in window && Notification.permission === 'granted') {
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
          if (sub) {
            await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sub, userId: profile.id }) });
          }
        }
      } catch {}
    } catch (e) {
      console.error('Error initializing messaging:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (tid: string) => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', tid)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    } catch (e) {
      console.error('Error fetching messages:', e);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !threadId || !profile?.id) return;
    try {
      const body = newMessage.trim();
      const { error } = await supabase
        .from('messages')
        .insert({ thread_id: threadId, sender_id: profile.id, body });
      if (error) throw error;
      // bump thread activity so coach inbox shows it
      await supabase.from('message_threads').update({ last_message_at: new Date().toISOString() }).eq('id', threadId);
      setNewMessage('');
      await fetchMessages(threadId);
    } catch (e) {
      console.error('Error sending message:', e);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!threadId) {
    return (
      <div className="mobile-padding space-y-6 bg-black min-h-screen">
        <h1 className="text-2xl md:text-3xl font-heading text-white">Messages</h1>
        <p className="text-white/60">No coach assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="mobile-padding mobile-spacing max-w-4xl mx-auto bg-black min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white">Messages</h1>
          <p className="text-white/60 text-xs sm:text-sm">Chat with your coach</p>
        </div>
      </div>

      {/* Chat Interface */}
      <Card className="mobile-card">
        {/* Chat Header */}
        <CardHeader className="border-b border-white/20 p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                <AvatarFallback className="bg-gold text-black">C</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-sm sm:text-lg text-white">Coach</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gold rounded-full"></div>
                  <span className="text-xs sm:text-sm text-white/60">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 sm:w-10 sm:h-10">
                <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-gold" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 sm:w-10 sm:h-10">
                <Video className="w-3 h-3 sm:w-4 sm:h-4 text-gold" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 sm:w-10 sm:h-10">
                <MoreVertical className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="p-0">
          <div className="h-64 sm:h-96 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-8 h-8 sm:w-12 sm:h-12 text-gold mx-auto mb-4 opacity-50" />
                <p className="text-white/60 text-sm sm:text-base">No messages yet</p>
                <p className="text-xs sm:text-sm text-white/60">Start a conversation with your coach</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender_id === profile?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end space-x-1 sm:space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {!isOwn && (
                        <Avatar className="w-5 h-5 sm:w-6 sm:h-6">
                          <AvatarFallback className="text-xs bg-gold text-black">C</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn ? 'bg-gold text-black' : 'bg-white/10 text-white'
                        }`}
                      >
                        <p className="text-xs sm:text-sm">{message.body}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-black/70' : 'text-white/60'}`}>
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>

        {/* Message Input */}
        <div className="border-t border-white/20 p-3 sm:p-4">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 sm:w-10 sm:h-10">
              <Paperclip className="w-3 h-3 sm:w-4 sm:h-4 text-gold" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8 sm:w-10 sm:h-10">
              <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gold" />
            </Button>
            <div className="flex-1">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                className="mobile-input border-0 bg-white/10 text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <Button 
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="bg-gold hover:bg-gold/90 text-black w-8 h-8 sm:w-10 sm:h-10 p-0"
            >
              <Send className="w-3 h-3 sm:w-4 sm:h-4 text-black" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}