'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CoachWorkoutDetailPage() {
  const params = useParams();
  const workoutId = params?.id as string;
  const [workout, setWorkout] = useState<any | null>(null);
  const [sets, setSets] = useState<any[]>([]);
  const [trend, setTrend] = useState<Record<string, { week: string; avgWeight: number; avgReps: number }[]>>({});

  useEffect(() => {
    if (!workoutId) return;
    (async () => {
      const { data: w } = await supabase.from('workouts').select('*').eq('id', workoutId).maybeSingle();
      setWorkout(w);
      const { data: s } = await supabase.from('workout_sets').select('*').eq('workout_id', workoutId).order('set_index', { ascending: true });
      setSets(s || []);

      // build trends by exercise name in notes (fallback) or by exercise_id
      const exercises = Array.from(new Set((s || []).map((x: any) => (x.notes || `exercise:${x.exercise_id || 'unknown'}`))));
      const byName: Record<string, { week: string; avgWeight: number; avgReps: number }[]> = {};
      for (const ex of exercises) {
        const name = ex;
        const since = new Date();
        since.setMonth(since.getMonth() - 2);
        const { data: hist } = await supabase
          .from('workout_sets')
          .select('weight_kg, reps, created_at, notes, workout_id, workout:workouts!inner(user_id)')
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: true });
        const relevant = (hist || []).filter((h: any) => (h.notes || '') === name);
        const bucket = new Map<string, { sumW: number; sumR: number; n: number }>();
        for (const r of relevant) {
          const d = new Date(r.created_at);
          const weekKey = getWeekKey(d);
          const cur = bucket.get(weekKey) || { sumW: 0, sumR: 0, n: 0 };
          cur.sumW += Number(r.weight_kg || 0);
          cur.sumR += Number(r.reps || 0);
          cur.n += 1;
          bucket.set(weekKey, cur);
        }
        byName[name] = Array.from(bucket.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([week, v]) => ({ week, avgWeight: v.n ? v.sumW / v.n : 0, avgReps: v.n ? v.sumR / v.n : 0 }));
      }
      setTrend(byName);
    })();
  }, [workoutId]);

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const s of sets) {
      const key = s.notes || `exercise:${s.exercise_id || 'unknown'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    return groups;
  }, [sets]);

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white mb-3">{workout?.name || 'Workout'}</h1>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-white/60 text-sm">No sets yet</p>
      ) : (
        Object.entries(grouped).map(([name, list]) => (
          <Card key={name} className="mobile-card mb-3">
            <CardHeader>
              <CardTitle className="text-white text-base">{name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 mb-3">
                {list.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between text-sm text-white/90">
                    <span>Set {s.set_index}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-white/70">{s.reps || 0} reps @ {Number(s.weight_kg || 0)}kg</span>
                      {s.completed ? (
                        <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[10px]">Done</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-white/5 text-white/70 border border-white/10 text-[10px]">Not completed</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              {trend[name] && trend[name].length > 0 && (
                <div className="text-white/70 text-xs">
                  {trend[name].map((t) => (
                    <div key={t.week} className="flex items-center justify-between">
                      <span>Week {t.week}</span>
                      <span>{t.avgReps.toFixed(1)} reps · {t.avgWeight.toFixed(1)}kg</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <div className="mt-4">
        <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={() => history.back()}>Back</Button>
      </div>
    </div>
  );
}

function getWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (day + 6) % 7; // Monday as first day
  date.setUTCDate(date.getUTCDate() - diff);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
