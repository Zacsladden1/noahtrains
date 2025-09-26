'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Client = { id: string; full_name: string | null; email: string };

export default function CoachAssignWorkoutsPage() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [workoutName, setWorkoutName] = useState<string>('Coach Assigned Workout');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { data } = await supabase
        .from('clients')
        .select('client_id, profiles:client_id(full_name, email)')
        .eq('coach_id', profile.id)
        .order('start_date', { ascending: false });
      const list: Client[] = (data || []).map((r: any) => ({ id: r.client_id, full_name: r.profiles?.full_name || null, email: r.profiles?.email }));
      setClients(list);
    })();
  }, [profile?.id]);

  const assignTodayWorkout = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      // Create a simple placeholder workout for today; sets can be added later
      await supabase.from('workouts').insert({
        user_id: selectedClientId,
        name: workoutName,
        status: 'planned',
        notes: 'Assigned by coach',
      });
      alert('Workout assigned for today.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white mb-3">Assign Workout</h1>

      <Card className="mobile-card mb-4">
        <CardHeader>
          <CardTitle className="text-white text-base">Choose Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                className={`text-left p-3 rounded border ${selectedClientId === c.id ? 'border-gold bg-white/10' : 'border-white/20 hover:bg-white/5'} text-white`}
              >
                <div className="font-medium">{c.full_name || c.email}</div>
                <div className="text-xs text-white/60">{c.email}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-white/80 text-sm">Workout name</label>
              <Input value={workoutName} onChange={(e)=>setWorkoutName(e.target.value)} className="mobile-input mt-1" />
            </div>
            <div className="flex items-end">
              <Button onClick={assignTodayWorkout} disabled={!selectedClientId || saving} className="bg-gold hover:bg-gold/90 text-black w-full">{saving ? 'Assigning…' : 'Assign Today\'s Workout'}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


