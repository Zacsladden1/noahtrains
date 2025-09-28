'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

type Session = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: 'pending' | 'approved' | 'cancelled' | 'completed';
  notes: string | null;
  client_id: string;
  profiles?: { full_name: string | null; email: string | null; avatar_url?: string | null } | null;
};

export default function CoachSchedulePage() {
  const { profile } = useAuth();
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id || !date) return;
    (async () => {
      setLoading(true);
      try {
        const from = `${date}T00:00:00`;
        const to = `${date}T23:59:59`;
        const { data } = await supabase
          .from('sessions')
          .select('id, starts_at, ends_at, status, notes, client_id, profiles:client_id(full_name, email, avatar_url)')
          .eq('coach_id', profile.id)
          .gte('starts_at', from)
          .lte('ends_at', to)
          .order('starts_at', { ascending: true });
        setSessions((data as any) || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id, date]);

  const approve = async (id: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('sessions').update({ status: 'approved' }).eq('id', id);
      if (error) throw error;
      setSessions(prev => prev.map(s => (s.id === id ? { ...s, status: 'approved' } : s)));
    } finally { setUpdatingId(null); }
  };

  const cancel = async (id: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('sessions').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
      setSessions(prev => prev.map(s => (s.id === id ? { ...s, status: 'cancelled' } : s)));
    } finally { setUpdatingId(null); }
  };

  const groups = useMemo(() => {
    const result: Record<string, Session[]> = { pending: [], approved: [], cancelled: [], completed: [] } as any;
    for (const s of sessions) result[s.status].push(s);
    return result;
  }, [sessions]);

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-gold" /> Schedule</h1>

      <Card className="mobile-card">
        <CardHeader>
          <CardTitle className="text-white text-base">Select day</CardTitle>
        </CardHeader>
        <CardContent>
          <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="mobile-input w-full" />
        </CardContent>
      </Card>

      <Card className="mobile-card">
        <CardHeader>
          <CardTitle className="text-white text-base">Today's sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-white/60 text-sm">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="text-white/60 text-sm">No sessions for this day.</div>
          ) : (
            <div className="space-y-2">
              {groups.pending.length > 0 && (
                <div>
                  <div className="text-white/70 text-xs mb-1">Pending</div>
                  <div className="space-y-2">
                    {groups.pending.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-white/15 bg-white/5">
                        <div>
                          <div className="text-white text-sm">{formatTime(s.starts_at)} – {formatTime(s.ends_at)}</div>
                          <div className="text-white/70 text-xs">{s.profiles?.full_name || s.profiles?.email || 'Client'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button className="bg-gold text-black hover:bg-gold/90" size="sm" disabled={updatingId===s.id} onClick={()=>approve(s.id)}>Approve</Button>
                          <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" size="sm" disabled={updatingId===s.id} onClick={()=>cancel(s.id)}>Cancel</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {groups.approved.length > 0 && (
                <div>
                  <div className="text-white/70 text-xs mb-1">Approved</div>
                  <div className="space-y-2">
                    {groups.approved.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-white/15 bg-white/5">
                        <div>
                          <div className="text-white text-sm">{formatTime(s.starts_at)} – {formatTime(s.ends_at)}</div>
                          <div className="text-white/70 text-xs">{s.profiles?.full_name || s.profiles?.email || 'Client'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" size="sm" disabled={updatingId===s.id} onClick={()=>cancel(s.id)}>Cancel</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {groups.cancelled.length > 0 && (
                <div>
                  <div className="text-white/70 text-xs mb-1">Cancelled</div>
                  <div className="space-y-2">
                    {groups.cancelled.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-white/15 bg-white/5">
                        <div>
                          <div className="text-white text-sm line-through opacity-70">{formatTime(s.starts_at)} – {formatTime(s.ends_at)}</div>
                          <div className="text-white/50 text-xs">{s.profiles?.full_name || s.profiles?.email || 'Client'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


