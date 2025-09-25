'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Send, 
  Paperclip, 
  MessageCircle, 
  Phone, 
  Video,
  MoreVertical,
  Image as ImageIcon,
  File
} from 'lucide-react';
import { Message, Profile } from '@/types/supabase';

export default function MessagesPage() {
  const { profile, isAdmin } = useAuth();
  const [messages, setMessages] = useState<(Message & { sender: Profile })[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      initializeMessaging();
    }
  }, [profile]);

  const initializeMessaging = async () => {
    if (!profile) return;

    try {
      // For demo purposes, we'll create a simple messaging interface
      // In a real app, this would handle multiple threads for admins
      
      if (isAdmin) {
        // Admin sees all client conversations
        // For now, we'll just show a placeholder
        setLoading(false);
        return;
      }

      // Client sees conversation with coach
      // First, find or create a thread with the admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .single();

      if (!adminProfile) {
        setLoading(false);
        return;
      }

      // Find existing thread or create one
      const { data: existingThread } = await supabase
        .from('message_threads')
        .select('id')
        .eq('client_id', profile.id)
        .eq('coach_id', adminProfile.id)
        .single();

      let currentThreadId = existingThread?.id;

      if (!currentThreadId) {
        const { data: newThread } = await supabase
          .from('message_threads')
          .insert({
            client_id: profile.id,
            coach_id: adminProfile.id,
          })
          .select('id')
          .single();
        
        currentThreadId = newThread?.id;
      }

      if (currentThreadId) {
        setThreadId(currentThreadId);
        await fetchMessages(currentThreadId);
      }
    } catch (error) {
      console.error('Error initializing messaging:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (threadId: string) => {
    try {
      const { data } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(*)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !threadId || !profile) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: profile.id,
          body: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage('');
      await fetchMessages(threadId);
    } catch (error) {
      console.error('Error sending message:', error);
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

  if (isAdmin) {
    return (
      <div className="mobile-padding space-y-6 bg-black min-h-screen">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading text-white">Messages</h1>
          <p className="text-white/60">Communicate with your clients</p>
        </div>

        <Card className="mobile-card">
          <CardContent className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gold mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-white">Client Conversations</h3>
            <p className="text-white/60 mb-4">
              Advanced messaging interface for managing multiple client conversations would appear here
            </p>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
              View All Conversations
            </Button>
          </CardContent>
        </Card>
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
                <AvatarFallback className="bg-gold text-black">NT</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-sm sm:text-lg text-white">Noah (Coach)</CardTitle>
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
                          <AvatarFallback className="text-xs bg-gold text-black">
                            {message.sender.full_name?.split(' ').map(n => n[0]).join('') || 'C'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-gold text-black'
                            : 'bg-white/10 text-white'
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
                onKeyPress={handleKeyPress}
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        <Card className="mobile-card">
          <CardContent className="p-3 sm:p-4">
            <h3 className="font-semibold mb-2 text-white text-sm sm:text-base">Share Progress Photos</h3>
            <p className="text-xs sm:text-sm text-white/60 mb-2 sm:mb-3">
              Show your coach your form or progress
            </p>
            <Button variant="outline" size="sm" className="w-full border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm">
              <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-gold" />
              Upload Photo
            </Button>
          </CardContent>
        </Card>

        <Card className="mobile-card">
          <CardContent className="p-3 sm:p-4">
            <h3 className="font-semibold mb-2 text-white text-sm sm:text-base">Schedule Check-in</h3>
            <p className="text-xs sm:text-sm text-white/60 mb-2 sm:mb-3">
              Book a call with your coach
            </p>
            <Button variant="outline" size="sm" className="w-full border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm">
              <Video className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-gold" />
              Schedule Call
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}