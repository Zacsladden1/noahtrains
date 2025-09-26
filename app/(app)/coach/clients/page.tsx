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
      const { data } = await supabase.from('profiles').select('id, full_name, email, role, created_at').eq('role', 'client').order('created_at', { ascending: false }).limit(100);
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
              <CardTitle className="text-white text-base">{c.full_name || c.email}</CardTitle>
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
