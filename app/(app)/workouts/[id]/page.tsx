'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Play, StopCircle } from 'lucide-react';

export default function ClientWorkoutDetailPage() {
  const params = useParams();
  const workoutId = params?.id as string;
  const [workout, setWorkout] = useState<any | null>(null);
  const [sets, setSets] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workoutId) return;
    (async () => {
      const { data: w } = await supabase.from('workouts').select('*').eq('id', workoutId).maybeSingle();
      setWorkout(w);
      const { data: s } = await supabase
        .from('workout_sets')
        .select('id, set_index, reps, weight_kg, completed, notes')
        .eq('workout_id', workoutId)
        .order('set_index', { ascending: true });
      setSets((s || []).map((x: any) => ({ ...x, reps: Number(x.reps || 0), weight_kg: Number(x.weight_kg || 0) })));
    })();
  }, [workoutId]);

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const s of sets) {
      const key = s.notes || 'Exercise';
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [sets]);

  const startWorkout = async () => {
    if (!workout) return;
    try {
      setSaving(true);
      await supabase.from('workouts').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', workout.id);
      setWorkout({ ...workout, status: 'in_progress', started_at: new Date().toISOString() });
    } finally { setSaving(false); }
  };

  const saveSet = (id: string, patch: Partial<{ reps: number; weight_kg: number; completed: boolean }>) => {
    setSets(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const persist = async () => {
    try {
      setSaving(true);
      for (const s of sets) {
        await supabase.from('workout_sets').update({ reps: Number(s.reps || 0), weight_kg: Number(s.weight_kg || 0), completed: !!s.completed }).eq('id', s.id);
      }
    } finally {
      setSaving(false);
    }
  };

  const finishWorkout = async () => {
    try {
      setSaving(true);
      await persist();
      await supabase.from('workouts').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', workoutId);
      setWorkout((w: any) => ({ ...w, status: 'completed', completed_at: new Date().toISOString() }));
    } finally { setSaving(false); }
  };

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white">{workout?.name || 'Workout'}</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {workout?.status !== 'in_progress' && workout?.status !== 'completed' && (
            <Button onClick={startWorkout} disabled={saving} size="sm" className="bg-gold hover:bg-gold/90 text-black flex-1 sm:flex-none">
              <Play className="w-4 h-4 mr-2" /> Start
            </Button>
          )}
          {workout?.status === 'in_progress' && (
            <Button onClick={persist} disabled={saving} size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10 flex-1 sm:flex-none">
              Save
            </Button>
          )}
          {workout?.status !== 'completed' && (
            <Button onClick={finishWorkout} disabled={saving} size="sm" className="bg-gold hover:bg-gold/90 text-black flex-1 sm:flex-none">
              <StopCircle className="w-4 h-4 mr-2" /> Finish
            </Button>
          )}
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-white/60 text-sm">No sets assigned</p>
      ) : (
        Object.entries(grouped).map(([name, list]) => (
          <Card key={name} className="mobile-card">
            <CardHeader>
              <CardTitle className="text-white text-base">{name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {list.map((s: any) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 py-1">
                  <div className="flex items-center gap-2 w-14">
                    <Checkbox
                      checked={!!s.completed}
                      onCheckedChange={(v)=>saveSet(s.id,{ completed: !!v })}
                      className="h-4 w-4 border-white/40 data-[state=checked]:bg-gold data-[state=checked]:text-black"
                      aria-label={`Set ${s.set_index} completed`}
                    />
                    <span className="text-white/70 text-xs">Set {s.set_index}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input type="number" inputMode="numeric" value={s.reps}
                      onChange={(e)=>saveSet(s.id,{ reps: Number(e.target.value||0) })}
                      className="mobile-input w-16 sm:w-20" />
                    <span className="text-white/60 text-xs">reps</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input type="number" inputMode="decimal" value={s.weight_kg}
                      onChange={(e)=>saveSet(s.id,{ weight_kg: Number(e.target.value||0) })}
                      className="mobile-input w-20 sm:w-24" />
                    <span className="text-white/60 text-xs">kg</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
