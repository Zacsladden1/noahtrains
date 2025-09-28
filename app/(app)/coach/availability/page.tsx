'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function CoachAvailabilityPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Array<{ dow: number; start_time: string; end_time: string }>>(
    Array.from({ length: 7 }).map((_, i) => ({ dow: i, start_time: '', end_time: '' }))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('coach_availability')
        .select('dow, start_time, end_time')
        .eq('coach_id', profile.id);
      const map = new Map<number, any>();
      (data || []).forEach((r:any)=> map.set(r.dow, { dow: r.dow, start_time: r.start_time, end_time: r.end_time }));
      setRows(Array.from({ length: 7 }).map((_, i) => map.get(i) || { dow: i, start_time: '', end_time: '' }));
    })();
  }, [profile?.id]);

  const save = async () => {
    if (!profile?.id) return;
    try {
      setSaving(true);
      // Upsert non-empty rows
      const payload = rows.filter(r => r.start_time && r.end_time).map(r => ({ coach_id: profile.id, dow: r.dow, start_time: r.start_time, end_time: r.end_time }));
      // Delete removed days then upsert
      await supabase.from('coach_availability').delete().eq('coach_id', profile.id);
      if (payload.length) await supabase.from('coach_availability').insert(payload);
      alert('Saved');
    } catch (e) {
      alert('Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white">Availability</h1>
      <Card className="mobile-card">
        <CardHeader>
          <CardTitle className="text-white text-base">Weekly gym hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-center">
                <div className="text-white/80 text-sm">{DAYS[r.dow]}</div>
                <input
                  type="time"
                  aria-label="Start time"
                  className="h-11 sm:h-12 w-full appearance-none rounded-lg bg-white/10 border border-white/60 text-white placeholder:text-white/70 focus-visible:ring-2 focus-visible:ring-white/40 px-3"
                  style={{ WebkitTextFillColor: '#ffffff', color: '#ffffff' }}
                  value={r.start_time}
                  onChange={(e)=>setRows(prev=>prev.map((x,idx)=>idx===i?{...x,start_time:e.target.value}:x))}
                />
                <input
                  type="time"
                  aria-label="End time"
                  className="h-11 sm:h-12 w-full appearance-none rounded-lg bg-white/10 border border-white/60 text-white placeholder:text-white/70 focus-visible:ring-2 focus-visible:ring-white/40 px-3"
                  style={{ WebkitTextFillColor: '#ffffff', color: '#ffffff' }}
                  value={r.end_time}
                  onChange={(e)=>setRows(prev=>prev.map((x,idx)=>idx===i?{...x,end_time:e.target.value}:x))}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Button className="bg-gold hover:bg-gold/90 text-black" onClick={save} disabled={saving}>{saving?'Saving…':'Save'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


