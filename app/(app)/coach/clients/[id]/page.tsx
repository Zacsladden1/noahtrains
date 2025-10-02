'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Flame, Egg, Wheat, Droplet, Droplets, Coffee, Sun, Sunset, Apple, CircleDot, ChevronDown, Phone, ChevronLeft, ChevronRight, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Check, X } from 'lucide-react';

export default function CoachClientDetailPage() {
  const params = useParams();
  const clientId = params?.id as string;
  const [client, setClient] = useState<any>(null);
  const [targets, setTargets] = useState<any>({ calories: 2200, protein: 150, carbs: 250, fat: 80, water: 3000 });
  const [recent, setRecent] = useState<any[]>([]);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0 });
  const [saving, setSaving] = useState(false);
  const [upcomingWorkout, setUpcomingWorkout] = useState<any | null>(null);
  const [workoutsForDay, setWorkoutsForDay] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [wkName, setWkName] = useState('');
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [exRows, setExRows] = useState<Array<{ exercise: string; sets: number | ''; reps: string | ''; weight: number | ''; videoId?: string }>>([{ exercise: '', sets: 3, reps: '10', weight: 0 }]);
  const [createExOpen, setCreateExOpen] = useState<{ open: boolean; idx: number | null }>({ open: false, idx: null });
  const [newExName, setNewExName] = useState('');
  const [wkDows, setWkDows] = useState<number[]>(() => [new Date().getDay()]); // allow multiple days
  const [repeatWeekly, setRepeatWeekly] = useState<boolean>(true);
  const [repeatWeeks, setRepeatWeeks] = useState<number>(12);
  // Flexible scheduling (not tied to weekdays)
  const [flexibleSchedule, setFlexibleSchedule] = useState<boolean>(false);
  const [flexSessions, setFlexSessions] = useState<number>(24);
  const [flexGapDays, setFlexGapDays] = useState<number>(1);
  const [flexSessionsStr, setFlexSessionsStr] = useState<string>('24');
  const [flexGapDaysStr, setFlexGapDaysStr] = useState<string>('1');
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessLoading, setSessLoading] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState<{ open: boolean; idx: number | null }>({ open: false, idx: null });
  const [videoOptions, setVideoOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');

  const updateRow = (idx: number, patch: Partial<{ exercise: string; sets: number; reps: string; weight: number; videoId: string }>) => {
    setExRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };
  const removeRow = (idx: number) => setExRows(prev => prev.filter((_, i) => i !== idx));

  const saveAssigned = async () => {
    if (!clientId || !wkName.trim()) return;
    setSavingWorkout(true);
    try {
      const base = new Date(selectedDate + 'T00:00:00');
      // Coerce flexible inputs if blank or zero
      const normalizedFlexSessions = Math.max(1, Number(flexSessions || Number(flexSessionsStr || 0) || 0));
      const normalizedFlexGap = Math.max(1, Number(flexGapDays || Number(flexGapDaysStr || 0) || 0));
      let dates: Date[] = [];
      if (flexibleSchedule) {
        const count = normalizedFlexSessions;
        const gap = normalizedFlexGap;
        for (let i = 0; i < count; i++) {
          const dt = new Date(base);
          dt.setDate(base.getDate() + i * gap);
          dates.push(dt);
        }
      } else {
        const selectedDows = wkDows.length ? wkDows : [base.getDay()];
        const weeks = repeatWeekly ? Math.max(1, repeatWeeks) : 1;
        // Compute dates for all occurrences by weekday across N weeks
        for (let w = 0; w < weeks; w++) {
          for (const d of selectedDows) {
            const diff = (d - base.getDay() + 7) % 7;
            const dt = new Date(base);
            dt.setDate(base.getDate() + diff + w * 7);
            dates.push(dt);
          }
        }
      }
      dates.sort((a,b)=>a.getTime()-b.getTime());

      // Create workouts via server endpoint with service key (avoids RLS insert issues from coach context)
      const morningIsoDates = dates.map((dt)=>{
        const d = new Date(dt);
        d.setHours(8,0,0,0);
        return d.toISOString();
      });
      const res = await fetch('/api/coach/workouts/assign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: (await supabase.auth.getUser()).data.user?.id, clientId, name: wkName.trim(), datesIso: morningIsoDates, sets: exRows })
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Failed to assign workouts');

      setAssignOpen(false);
      setWkName('');
      setExRows([{ exercise: '', sets: 3, reps: 10, weight: 0 }]);
      setWkDows([new Date().getDay()]);
      setFlexibleSchedule(false);
      setSelectedVideoId('');
      // refresh day list for current selected day
      const from = `${selectedDate}T00:00:00`;
      const to = `${selectedDate}T23:59:59`;
      const { data: wday } = await supabase
        .from('workouts')
        .select('id, name, status, created_at, completed_at')
        .eq('user_id', clientId)
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: true });
      setWorkoutsForDay(wday || []);
    } catch (e) {
      alert('Failed to save workout');
    } finally {
      setSavingWorkout(false);
    }
  };

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const { data: p } = await supabase.from('profiles').select('id, full_name, email, avatar_url, age, current_weight_kg, goal_weight_kg, phone, created_at').eq('id', clientId).maybeSingle();
      setClient(p);
      const { data: t } = await supabase.from('nutrition_targets').select('*').eq('user_id', clientId).maybeSingle();
      if (t) setTargets({
        calories: t.calories ?? 2200,
        protein: Number(t.protein_g ?? 150),
        carbs: Number(t.carbs_g ?? 250),
        fat: Number(t.fat_g ?? 80),
        water: t.water_ml ?? 3000,
      });
      const today = new Date().toISOString().split('T')[0];
      const { data: meals } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', clientId)
        .eq('date', selectedDate)
        .order('created_at', { ascending: false })
        .limit(20);
      const list = meals || [];
      setRecent(list);
      setTotals({
        calories: Math.round(list.reduce((a: number, x: any) => a + (x.calories || 0), 0)),
        protein: Math.round(list.reduce((a: number, x: any) => a + (x.protein_g || 0), 0)),
        carbs: Math.round(list.reduce((a: number, x: any) => a + (x.carbs_g || 0), 0)),
      });
      const { data: uw } = await supabase
        .from('workouts')
        .select('id, name, status, created_at')
        .eq('user_id', clientId)
        .in('status', ['planned', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1);
      setUpcomingWorkout((uw && uw[0]) || null);

      // Workouts for selected day (completed or any status that day)
      const from = `${selectedDate}T00:00:00`;
      const to = `${selectedDate}T23:59:59`;
      const { data: wday } = await supabase
        .from('workouts')
        .select('id, name, status, created_at, completed_at')
        .eq('user_id', clientId)
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: true });
      setWorkoutsForDay(wday || []);

      // Load sessions for this client
      setSessLoading(true);
      try {
        const { data: s } = await supabase
          .from('sessions')
          .select('id, starts_at, ends_at, status, notes, coach_id, client_id')
          .eq('client_id', clientId)
          .order('starts_at', { ascending: true });
        setSessions(s || []);
      } finally { setSessLoading(false); }
    })();
  }, [clientId, selectedDate]);

  // Realtime updates for today's meals
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`coach-client-meals-${clientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nutrition_logs', filter: `user_id=eq.${clientId}` }, async () => {
        try {
          const today = selectedDate;
          // Refetch latest list to keep ordering consistent
          const { data: meals } = await supabase
            .from('nutrition_logs')
            .select('*')
            .eq('user_id', clientId)
            .eq('date', today)
            .order('created_at', { ascending: false })
            .limit(20);
          const list = meals || [];
          setRecent(list);
          setTotals({
            calories: Math.round(list.reduce((a: number, x: any) => a + (x.calories || 0), 0)),
            protein: Math.round(list.reduce((a: number, x: any) => a + (x.protein_g || 0), 0)),
            carbs: Math.round(list.reduce((a: number, x: any) => a + (x.carbs_g || 0), 0)),
          });
        } catch {}
      })
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch {} };
  }, [clientId, selectedDate]);

  const saveTargets = async () => {
    setSaving(true);
    try {
      await supabase.from('nutrition_targets').upsert({
        user_id: clientId,
        calories: Number(targets.calories) || 0,
        protein_g: Number(targets.protein) || 0,
        carbs_g: Number(targets.carbs) || 0,
        fat_g: Number(targets.fat) || 0,
        water_ml: Number(targets.water) || 0,
      });
    } finally {
      setSaving(false);
    }
  };

  const openThread = async () => {
    // find existing
    const { data: existing } = await supabase
      .from('message_threads')
      .select('id')
      .eq('client_id', clientId)
      .limit(1);
    let threadId = existing && existing[0]?.id;
    if (!threadId) {
      // create with coach as current user
      const { data: created, error } = await supabase
        .from('message_threads')
        .insert({ client_id: clientId, coach_id: (await supabase.auth.getUser()).data.user?.id || null })
        .select('id')
        .single();
      if (!error) threadId = created.id;
    }
    if (threadId) {
      window.location.href = `/coach/messages/${threadId}`;
    }
  };

  const approveSession = async (id: string) => {
    try {
      await supabase.from('sessions').update({ status: 'approved' }).eq('id', id);
      setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
    } catch {}
  };
  const cancelSession = async (id: string) => {
    try {
      await supabase.from('sessions').update({ status: 'cancelled' }).eq('id', id);
      setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s));
    } catch {}
  };

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="w-9 h-9">
          {client?.avatar_url ? <AvatarImage src={client.avatar_url} alt="Avatar" /> : null}
          <AvatarFallback className="bg-gold text-black">{(client?.full_name || client?.email || 'C').slice(0,1)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white">{client?.full_name || 'Client'}</h1>
          <p className="text-white/60 text-xs">Age {client?.age ?? '—'} · {client?.current_weight_kg ? `${client.current_weight_kg}kg` : '—'} → {client?.goal_weight_kg ? `${client.goal_weight_kg}kg` : '—'}</p>
        </div>
      </div>

      {/* Assign workout */}
      <div className="mb-3">
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gold hover:bg-gold/90 text-black flex items-center gap-2"><Plus className="w-4 h-4" /> Assign workout for {new Date(selectedDate).toLocaleDateString()}</Button>
          </DialogTrigger>
          <DialogContent className="bg-black border border-white/20 text-white max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto" aria-describedby="assign-desc">
            <DialogHeader>
              <DialogTitle>Assign Workout</DialogTitle>
            </DialogHeader>
            <p id="assign-desc" className="text-white/60 text-xs px-1">Create planned workouts for this client on the dates you choose.</p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-white/80 text-sm">Title</label>
                  <Input value={wkName} onChange={(e)=>setWkName(e.target.value)} className="mobile-input mt-1 h-10" placeholder="Push Day" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-white/80 text-sm">Scheduling</label>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-1 rounded-md border ${!flexibleSchedule? 'bg-gold text-black border-gold':'border-white/20 text-white/70'}`}>
                        By weekday
                      </span>
                      <button type="button" className={`px-2 py-1 rounded-md border ${flexibleSchedule? 'bg-gold text-black border-gold':'border-white/20 text-white/70'}`} onClick={()=>setFlexibleSchedule(v=>!v)}>
                        {flexibleSchedule ? 'Flexible' : 'Flexible'}
                      </button>
                    </div>
                  </div>
                  {!flexibleSchedule ? (
                    <>
                      <div className="mt-1 grid grid-cols-7 gap-1">
                        {[ 'Sun','Mon','Tue','Wed','Thu','Fri','Sat' ].map((d, i)=> (
                          <button key={i} type="button" onClick={()=> setWkDows(prev=> prev.includes(i) ? prev.filter(x=>x!==i) : [...prev, i]) } className={`px-2 py-1 text-xs rounded-md border transition-colors ${wkDows.includes(i)?'bg-gold text-black border-gold':'border-white/20 text-white/70 hover:bg-white/10'}`}>{d}</button>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-white/70 text-xs">Repeat weekly</label>
                        <input type="checkbox" checked={repeatWeekly} onChange={(e)=>setRepeatWeekly(e.target.checked)} />
                        {repeatWeekly && (
                          <>
                            <span className="text-white/70 text-xs">for</span>
                            <input type="number" min={1} max={52} value={repeatWeeks} onChange={(e)=>setRepeatWeeks(Math.max(1, Number(e.target.value||12)))} className="mobile-input h-8 w-16 text-center" />
                            <span className="text-white/70 text-xs">weeks</span>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-white/70 text-xs">Number of sessions</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={flexSessionsStr}
                          onChange={(e)=>{
                            const v = (e.target.value || '').replace(/[^0-9]/g, '');
                            setFlexSessionsStr(v);
                            setFlexSessions(v === '' ? 0 : Number(v));
                          }}
                          className="mobile-input h-8 w-full text-center"
                          placeholder="e.g. 24"
                        />
                      </div>
                      <div>
                        <label className="text-white/70 text-xs">Gap (days) between sessions</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={flexGapDaysStr}
                          onChange={(e)=>{
                            const v = (e.target.value || '').replace(/[^0-9]/g, '');
                            setFlexGapDaysStr(v);
                            setFlexGapDays(v === '' ? 0 : Number(v));
                          }}
                          className="mobile-input h-8 w-full text-center"
                          placeholder="e.g. 1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-white/80 text-sm">Exercises</div>
                {exRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-end p-2 rounded-md bg-white/5 border border-white/10">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white/80 text-sm">{idx+1}</div>
                    <div className="sm:col-span-2">
                      <label className="text-white/70 text-xs">Exercise</label>
                      <div className="flex gap-2 mt-1">
                        <Input value={row.exercise} onChange={(e)=>updateRow(idx,{ exercise: e.target.value })} className="mobile-input h-10 w-full" placeholder="Bench Press" />
                        <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 h-10 whitespace-nowrap" type="button" onClick={()=>{ setCreateExOpen({ open: true, idx }); setNewExName(row.exercise || ''); }}>Create</Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-white/70 text-xs">Sets</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={row.sets === '' ? '' : String(row.sets)}
                        onChange={(e)=>{
                          const v = (e.target.value || '').replace(/[^0-9]/g, '');
                          updateRow(idx, { sets: v === '' ? '' : Number(v) });
                        }}
                        className="mobile-input mt-1 h-10 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-white/70 text-xs">Reps</label>
                      <input
                        type="text"
                        inputMode="text"
                        value={row.reps === '' ? '' : String(row.reps)}
                        onChange={(e)=>{
                          updateRow(idx, { reps: e.target.value });
                        }}
                        className="mobile-input mt-1 h-10 w-full"
                        placeholder="e.g. 8-12 or 10"
                      />
                    </div>
                    <div>
                      <label className="text-white/70 text-xs">Weight (kg)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.weight === '' ? '' : String(row.weight)}
                        onChange={(e)=>{
                          let v = (e.target.value || '').replace(/[^0-9.,]/g, '');
                          v = v.replace(',', '.');
                          updateRow(idx, { weight: v === '' ? '' : Number(v) });
                        }}
                        className="mobile-input mt-1 h-10 w-full"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        className="border-white/30 text-white hover:bg-white/10 h-10"
                        type="button"
                        onClick={async ()=>{
                          setVideoPickerOpen({ open: true, idx });
                          setSelectedVideoId(row.videoId || '');
                          try {
                            const { data } = await supabase
                              .from('videos')
                              .select('id, title, section')
                              .eq('section', 'form')
                              .order('title', { ascending: true });
                            setVideoOptions((data || []).map((v:any)=>({ id: v.id, title: v.title || 'Untitled' })));
                          } catch { setVideoOptions([]); }
                        }}
                      >
                        {row.videoId ? 'Change' : 'Add video'}
                      </Button>
                      {row.videoId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-600/50 text-red-500 hover:bg-red-600/10 h-10 px-2"
                          type="button"
                          onClick={()=>updateRow(idx, { videoId: '' })}
                        >
                          Remove
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={()=>removeRow(idx)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={()=>setExRows(prev=>[...prev,{ exercise:'', sets:3, reps:'10', weight:0 }])}><Plus className="w-4 h-4 mr-1" /> Add exercise</Button>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={()=>setAssignOpen(false)}>Cancel</Button>
                <Button className="bg-gold hover:bg-gold/90 text-black" disabled={savingWorkout || !wkName.trim()} onClick={saveAssigned}>{savingWorkout? 'Saving…':'Save'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Create Exercise Inline Dialog */}
        <Dialog open={createExOpen.open} onOpenChange={(o)=>setCreateExOpen({ open: o, idx: createExOpen.idx })}>
          <DialogContent className="bg-black border border-white/20 text-white max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Exercise</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-white/80 text-sm">Exercise name</label>
                <Input value={newExName} onChange={(e)=>setNewExName(e.target.value)} className="mobile-input mt-1" placeholder="e.g., Incline Bench Press" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={()=>setCreateExOpen({ open:false, idx:null })}>Cancel</Button>
                <Button className="bg-gold hover:bg-gold/90 text-black" onClick={()=>{
                  const idx = createExOpen.idx;
                  if (idx==null) { setCreateExOpen({open:false, idx:null}); return; }
                  setExRows(prev => prev.map((r,i)=> i===idx ? { ...r, exercise: newExName } : r));
                  setCreateExOpen({ open:false, idx:null });
                }}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Video Picker */}
        <Dialog open={videoPickerOpen.open} onOpenChange={(o)=>{
          if (!o && videoPickerOpen.idx !== null) {
            // Apply the selected video to the specific row
            if (selectedVideoId) {
              setExRows(prev => prev.map((r, i) => i === videoPickerOpen.idx ? { ...r, videoId: selectedVideoId } : r));
            }
          }
          setVideoPickerOpen({ open: o, idx: o ? videoPickerOpen.idx : null });
        }}>
          <DialogContent className="bg-black border border-white/20 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Select form video</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {videoOptions.length === 0 ? (
                <p className="text-white/60 text-sm">No form videos found.</p>
              ) : (
                videoOptions.map(v => (
                  <button
                    key={v.id}
                    className={`w-full text-left p-2 rounded border ${selectedVideoId===v.id?'border-gold bg-white/10':'border-white/20 hover:bg-white/5'}`}
                    onClick={()=>setSelectedVideoId(v.id)}
                  >
                    <div className="text-white text-sm">{v.title}</div>
                    {selectedVideoId===v.id && <div className="text-gold text-xs mt-0.5">Selected</div>}
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={()=>{
                setSelectedVideoId('');
                if (videoPickerOpen.idx !== null) {
                  setExRows(prev => prev.map((r, i) => i === videoPickerOpen.idx ? { ...r, videoId: '' } : r));
                }
                setVideoPickerOpen({ open: false, idx: null });
              }}>Clear</Button>
              <Button className="bg-gold hover:bg-gold/90 text-black" onClick={()=> {
                if (videoPickerOpen.idx !== null && selectedVideoId) {
                  setExRows(prev => prev.map((r, i) => i === videoPickerOpen.idx ? { ...r, videoId: selectedVideoId } : r));
                }
                setVideoPickerOpen({ open: false, idx: null });
              }}>Done</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex gap-2 mb-3">
        <Button
          variant="outline"
          size="icon"
          aria-label="Message client"
          className="border-white/30 text-white hover:bg-white/10 w-10 h-10 rounded-full"
          onClick={openThread}
        >
          <MessageCircle className="w-5 h-5 text-gold" />
        </Button>
        {client?.phone && (
          <a href={`tel:${client.phone}`} className="inline-flex">
            <Button
              variant="outline"
              size="icon"
              aria-label="Call client"
              className="border-white/30 text-white hover:bg-white/10 w-10 h-10 rounded-full"
            >
              <Phone className="w-5 h-5 text-gold" />
            </Button>
          </a>
        )}
      </div>

      {/* Day selector */}
      <div className="flex items-center gap-2 mb-3">
        <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10" onClick={()=>{
          const d = new Date(selectedDate);
          d.setDate(d.getDate()-1);
          setSelectedDate(d.toISOString().split('T')[0]);
        }}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Prev
        </Button>
        <div className="text-white/80 text-sm px-2 py-1 rounded border border-white/10">
          {new Date(selectedDate).toLocaleDateString()}
        </div>
        <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10" onClick={()=>{
          const d = new Date(selectedDate);
          d.setDate(d.getDate()+1);
          const next = d.toISOString().split('T')[0];
          setSelectedDate(next);
        }}>
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <Card className="mobile-card mb-4">
        <CardHeader>
          <CardTitle className="text-white text-base">Daily Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex items-center gap-2 text-white underline text-sm">
              <ChevronDown className="w-4 h-4 text-white" /> Show targets
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="flex flex-col">
              <label className="flex items-center gap-2 text-white/80 text-sm mb-1"><Flame className="w-4 h-4 text-gold" /> Calories</label>
              <Input type="number" inputMode="numeric" value={targets.calories ?? ''} onChange={(e)=>{
                const v = e.target.value;
                setTargets({...targets, calories: v === '' ? '' : Number(v)});
              }} className="mobile-input w-full" />
            </div>
            <div className="flex flex-col">
              <label className="flex items-center gap-2 text-white/80 text-sm mb-1"><Egg className="w-4 h-4 text-gold" /> Protein (g)</label>
              <Input type="number" inputMode="numeric" value={targets.protein ?? ''} onChange={(e)=>{
                const v = e.target.value;
                setTargets({...targets, protein: v === '' ? '' : Number(v)});
              }} className="mobile-input w-full" />
            </div>
            <div className="flex flex-col">
              <label className="flex items-center gap-2 text-white/80 text-sm mb-1"><Wheat className="w-4 h-4 text-gold" /> Carbs (g)</label>
              <Input type="number" inputMode="numeric" value={targets.carbs ?? ''} onChange={(e)=>{
                const v = e.target.value;
                setTargets({...targets, carbs: v === '' ? '' : Number(v)});
              }} className="mobile-input w-full" />
            </div>
            <div className="flex flex-col">
              <label className="flex items-center gap-2 text-white/80 text-sm mb-1"><CircleDot className="w-4 h-4 text-gold" /> Fat (g)</label>
              <Input type="number" inputMode="numeric" value={targets.fat ?? ''} onChange={(e)=>{
                const v = e.target.value;
                setTargets({...targets, fat: v === '' ? '' : Number(v)});
              }} className="mobile-input w-full" />
            </div>
            <div className="flex flex-col sm:col-span-2 lg:col-span-1">
              <label className="flex items-center gap-2 text-white/80 text-sm mb-1"><Droplets className="w-4 h-4 text-gold" /> Water (ml)</label>
              <Input type="number" inputMode="numeric" value={targets.water ?? ''} onChange={(e)=>{
                const v = e.target.value;
                setTargets({...targets, water: v === '' ? '' : Number(v)});
              }} className="mobile-input w-full" />
            </div>
          </div>
          <div className="mt-4">
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={saveTargets} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {upcomingWorkout && (
        <Card className="mobile-card mb-4">
          <CardHeader>
            <CardTitle className="text-white text-base">Upcoming Workout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-white/80 text-sm flex items-center justify-between">
              <span className="truncate max-w-[240px]">{upcomingWorkout.name || 'Workout'}</span>
              <span className="text-white/60 capitalize">{upcomingWorkout.status.replace('_',' ')}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mobile-card mb-4">
        <CardHeader>
          <CardTitle className="text-white text-base">Workouts on {new Date(selectedDate).toLocaleDateString()}</CardTitle>
        </CardHeader>
        <CardContent>
          {workoutsForDay.length === 0 ? (
            <p className="text-white/60 text-sm">No workouts for this day</p>
          ) : (
            <div className="space-y-2">
              {workoutsForDay.map((w)=> (
                <a key={w.id} href={`/coach/workouts/${w.id}`} className="block">
                  <div className="flex items-center justify-between p-2 bg-white/10 rounded hover:bg-white/15">
                    <div className="text-white text-sm truncate max-w-[220px]">{w.name || 'Workout'}</div>
                    <div className="text-white/60 text-xs capitalize">{(w.status || '').replace('_',' ')}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mobile-card">
        <CardHeader>
          <CardTitle className="text-white text-base">Today’s Meals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="p-2 rounded bg-white/10 text-center">
              <div className="text-white/60 text-xs">Calories</div>
              <div className="text-white text-sm font-semibold">{totals.calories}</div>
            </div>
            <div className="p-2 rounded bg-white/10 text-center">
              <div className="text-white/60 text-xs">Protein (g)</div>
              <div className="text-white text-sm font-semibold">{totals.protein}</div>
            </div>
            <div className="p-2 rounded bg-white/10 text-center">
              <div className="text-white/60 text-xs">Carbs (g)</div>
              <div className="text-white text-sm font-semibold">{totals.carbs}</div>
            </div>
          </div>
          {recent.length === 0 ? (
            <p className="text-white/60 text-sm">No meals today</p>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => {
                const NutrIcon = r.meal === 'breakfast' ? Coffee : r.meal === 'lunch' ? Sun : r.meal === 'dinner' ? Sunset : Apple;
                return (
                  <div key={r.id} className="flex items-center justify-between p-2 bg-white/10 rounded">
                    <div className="flex items-center gap-3">
                      <NutrIcon className="w-4 h-4 text-gold" />
                      <div>
                        <div className="text-white text-sm">{r.food_name}</div>
                        <div className="text-white/60 text-xs">P {Math.round(r.protein_g || 0)}g • C {Math.round(r.carbs_g || 0)}g • F {Math.round(r.fat_g || 0)}g</div>
                        <div className="text-white/50 text-[10px] uppercase mt-0.5">{r.meal || 'snacks'}</div>
                      </div>
                    </div>
                    <div className="text-white/70 text-sm">{Math.round(r.calories || 0)} cal</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card className="mobile-card mt-4">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-gold" /> Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessLoading ? (
            <p className="text-white/60 text-sm">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-white/60 text-sm">No sessions yet</p>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2 bg-white/10 rounded">
                  <div className="text-white text-sm">
                    <div>{new Date(s.starts_at).toLocaleString()} — {Math.round((new Date(s.ends_at).getTime()-new Date(s.starts_at).getTime())/60000)}m</div>
                    <div className="text-white/60 text-xs capitalize">{s.status}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.status === 'pending' && (
                      <>
                        <Button size="sm" className="bg-gold hover:bg-gold/90 text-black" onClick={()=>approveSession(s.id)}><Check className="w-4 h-4 mr-1" /> Approve</Button>
                        <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={()=>cancelSession(s.id)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                      </>
                    )}
                    {s.status === 'approved' && (
                      <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={()=>cancelSession(s.id)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
