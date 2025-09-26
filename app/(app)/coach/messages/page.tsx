'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Thread = {
  id: string;
  client_id: string;
  coach_id: string;
  last_message_at: string | null;
  created_at: string;
};

export default function CoachMessagesPage() {
  const { profile } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [clients, setClients] = useState<Record<string, any>>({});
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { data: th } = await supabase
        .from('message_threads')
        .select('id, client_id, coach_id, last_message_at, created_at')
        .eq('coach_id', profile.id)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      const list = (th || []) as Thread[];
      setThreads(list);
      const clientIds = Array.from(new Set(list.map((t) => t.client_id)));
      if (clientIds.length) {
        const { data: cps } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', clientIds);
        const map: Record<string, any> = {};
        (cps || []).forEach((c: any) => { map[c.id] = c; });
        setClients(map);
      }
    })();
  }, [profile?.id]);

  const filtered = threads.filter((t) => {
    const c = clients[t.client_id];
    const name = (c?.full_name || c?.email || '').toLowerCase();
    return name.includes(q.toLowerCase());
  });

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white mb-3">Messages</h1>
      <Input placeholder="Search clients..." value={q} onChange={(e) => setQ(e.target.value)} className="mobile-input mb-3" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {filtered.map((t) => {
          const c = clients[t.client_id];
          const title = c?.full_name || c?.email || 'Client';
          const when = t.last_message_at ? new Date(t.last_message_at).toLocaleString() : new Date(t.created_at).toLocaleString();
          return (
            <Card key={t.id} className="mobile-card">
              <CardHeader>
                <CardTitle className="text-white text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/60 text-xs mb-2">Last activity: {when}</p>
                <Link href={`/coach/messages/${t.id}`} className="text-gold text-sm underline">Open Thread</Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-white/60 text-sm mt-4">No threads yet.</p>
      )}
    </div>
  );
}
