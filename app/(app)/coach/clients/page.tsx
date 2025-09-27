'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function CoachClientsPage() {
  const [q, setQ] = useState('');
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email, role, created_at, avatar_url, age, current_weight_kg, goal_weight_kg').eq('role', 'client').order('created_at', { ascending: false }).limit(100);
      setClients(data || []);
    })();
  }, []);

  const filtered = clients.filter((c) => (c.full_name || '').toLowerCase().includes(q.toLowerCase()) || (c.email || '').toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white mb-3">Clients</h1>
      <Input placeholder="Search clients..." value={q} onChange={(e) => setQ(e.target.value)} className="mobile-input mb-3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {filtered.map((c) => (
          <Card key={c.id} className="mobile-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-xs">
                  {c.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white/80">{(c.full_name || c.email || 'C').slice(0,1)}</span>
                  )}
                </div>
                <div>
                  <CardTitle className="text-white text-base">{c.full_name || c.email}</CardTitle>
                  <p className="text-white/60 text-xs mt-0.5">Age {c.age ?? '—'} · {c.current_weight_kg ? `${c.current_weight_kg}kg` : '—'} → {c.goal_weight_kg ? `${c.goal_weight_kg}kg` : '—'}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-white/60 text-xs mb-2">Joined {new Date(c.created_at).toLocaleDateString()}</p>
              <Link href={`/coach/clients/${c.id}`} className="text-gold text-sm underline">Open</Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
