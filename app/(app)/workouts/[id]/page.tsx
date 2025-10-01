'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Play, StopCircle } from 'lucide-react';
import { VideoDialog } from '@/components/system/video-dialog';

export default function ClientWorkoutDetailPage() {
  const params = useParams();
  const workoutId = params?.id as string;
  const [workout, setWorkout] = useState<any | null>(null);
  const [sets, setSets] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [videoLinksByExercise, setVideoLinksByExercise] = useState<Record<string, { url: string; title: string }>>({});
  const normalize = (s: any) => (String(s || '').trim().toLowerCase());
  const [workoutVideo, setWorkoutVideo] = useState<{ url: string; title: string } | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<{ url: string; title?: string } | null>(null);

  useEffect(() => {
    if (!workoutId) return;
    (async () => {
      const { data: w } = await supabase.from('workouts').select('*').eq('id', workoutId).maybeSingle();
      setWorkout(w);
      const { data: s } = await supabase
        .from('workout_sets')
        .select('id, set_index, reps, reps_text, weight_kg, completed, notes')
        .eq('workout_id', workoutId)
        .order('set_index', { ascending: true });
      setSets((s || []).map((x: any) => ({ ...x, reps: Number(x.reps || 0), reps_text: x.reps_text || null, reps_input: '', weight_kg: Number(x.weight_kg || 0) })));

      // Load per-set video links
      try {
        let { data: links, error } = await supabase
          .from('workout_exercise_videos')
          .select('exercise_label, public_url, video_title')
          .eq('workout_id', workoutId);
        const map: Record<string, { url: string; title: string }> = {};
        for (const row of (links || []) as any[]) {
          const url = row?.public_url as string | undefined;
          const label = (row?.exercise_label || 'Exercise') as string;
          if (url) map[label] = { url, title: row?.video_title || 'Form video' };
        }
        // Fallback: if no public_url saved, try joining videos table
        if (Object.keys(map).length === 0) {
          const { data: joined } = await supabase
            .from('workout_exercise_videos')
            .select('exercise_label, video:videos(storage_path, title)')
            .eq('workout_id', workoutId);
          for (const row of (joined || []) as any[]) {
            const path = row?.video?.storage_path as string | undefined;
            const label = (row?.exercise_label || 'Exercise') as string;
            if (!path) continue;
            const pub = supabase.storage.from('videos').getPublicUrl(path);
            const url = (pub && pub.data && pub.data.publicUrl) || '';
            if (url) map[label] = { url, title: row?.video?.title || 'Form video' };
          }
        }
        // Normalize keys for robust matching
        const normalized: Record<string, { url: string; title: string }> = {};
        for (const [k, v] of Object.entries(map)) normalized[normalize(k)] = v;
        setVideoLinksByExercise(normalized);

        // Also fetch workout-level video link
        try {
          const { data: wv } = await supabase
            .from('workout_videos')
            .select('video:videos(storage_path, title)')
            .eq('workout_id', workoutId)
            .limit(1)
            .maybeSingle();
          const path = (wv as any)?.video?.storage_path as string | undefined;
          if (path) {
            const pub = supabase.storage.from('videos').getPublicUrl(path);
            const url = (pub && pub.data && pub.data.publicUrl) || '';
            if (url) setWorkoutVideo({ url, title: (wv as any)?.video?.title || 'Form video' });
          }
        } catch {}
      } catch {}
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

  const saveSet = (id: string, patch: Partial<{ reps: number; weight_kg: number; completed: boolean; reps_input: string }>) => {
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
      const completedAt = new Date().toISOString();
      await supabase.from('workouts').update({ status: 'completed', completed_at: completedAt }).eq('id', workoutId);
      setWorkout((w: any) => ({ ...w, status: 'completed', completed_at: completedAt }));
      // Notify coach about completion
      try {
        const { data: rel } = await supabase.from('clients').select('coach_id').eq('client_id', (workout as any)?.user_id).maybeSingle();
        const coachId = rel?.coach_id;
        if (coachId) {
          try {
            const { data: prof } = await supabase.from('profiles').select('full_name, email').eq('id', (workout as any)?.user_id).maybeSingle();
            const who = (prof?.full_name || prof?.email || 'Client');
            const what = (workout as any)?.name || 'Workout';
            await fetch('/api/push/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userIds: [coachId], payload: { title: 'Workout completed', body: `${who} completed ${what}`, url: '/coach' } }) });
          } catch {}
        }
      } catch {}
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base">{name}</CardTitle>
                {videoLinksByExercise[normalize(name)] ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 text-xs h-7 px-2"
                    onClick={() => { const v = videoLinksByExercise[normalize(name)]; setCurrentVideo(v); setVideoOpen(true); }}
                    aria-label={`Open video for ${name}`}
                  >
                    View video
                  </Button>
                ) : workoutVideo ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 text-xs h-7 px-2"
                    onClick={() => { const v = workoutVideo; setCurrentVideo(v); setVideoOpen(true); }}
                    aria-label={`Open workout video`}
                  >
                    View video
                  </Button>
                ) : null}
              </div>
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
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={s.reps_input ?? ''}
                      onChange={(e)=>{
                        const v = e.target.value;
                        saveSet(s.id,{ reps_input: v, reps: Number(v || 0) });
                      }}
                      placeholder={s.reps_text || undefined}
                      className="mobile-input w-16 sm:w-20"
                    />
                    <span className="text-white/60 text-xs">reps</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={s.weight_input ?? ''}
                      onChange={(e)=>{
                        let v = (e.target.value || '').replace(/[^0-9.,]/g, '');
                        const parsed = parseFloat(v.replace(',', '.'));
                        saveSet(s.id,{ weight_input: v, weight_kg: isNaN(parsed) ? 0 : parsed });
                      }}
                      placeholder={Number(s.weight_kg || 0) ? String(s.weight_kg) : undefined}
                      className="mobile-input w-20 sm:w-24" />
                    <span className="text-white/60 text-xs">kg</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
      {currentVideo && (
        <VideoDialog
          open={videoOpen}
          onOpenChange={setVideoOpen}
          url={currentVideo.url}
          title={currentVideo.title}
        />
      )}
    </div>
  );
}
