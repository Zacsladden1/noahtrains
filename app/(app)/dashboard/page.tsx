'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { TodaysWorkout } from '@/components/dashboard/todays-workout';
import { MacroRings } from '@/components/nutrition/macro-rings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Workout, NutritionLog } from '@/types/supabase';

export default function DashboardPage() {
  const { profile, isAdmin } = useAuth();
  const [todaysWorkout, setTodaysWorkout] = useState<Workout | null>(null);
  const [nutritionData, setNutritionData] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [waterIntake, setWaterIntake] = useState(0);
  const [workoutStreak, setWorkoutStreak] = useState(0);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState(0);
  const [weightHistory, setWeightHistory] = useState<{ date: string; weight_kg: number }[]>([]);
  const [weightView, setWeightView] = useState<'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(true);

  // Targets loaded from nutrition_targets, with sensible defaults
  const [targets, setTargets] = useState({
    calories: 2200,
    protein: 150,
    carbs: 250,
    fat: 80,
    water: 3000,
  });

  const testPush = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Push not supported in this browser');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        alert('Notifications not granted');
        return;
      }
      if (process.env.NODE_ENV !== 'production') {
        alert('Push requires production service worker. Skipping in dev.');
        return;
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      const response = await fetch('/api/push/vapid');
      const { publicKey } = await response.json();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: (() => {
          const base64 = publicKey || '';
          const padding = '='.repeat((4 - (base64.length % 4)) % 4);
          const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
          const raw = atob(b64);
          const arr = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
          return arr;
        })()
      });
      await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub })
      });
      alert('Test push sent (if supported on device).');
    } catch (e) {
      console.error(e);
      alert('Failed to send test push');
    }
  };

  useEffect(() => {
    if (profile) {
      loadTargets();
      fetchDashboardData();
      loadWeightHistory();
    }
  }, [profile]);

  const loadTargets = async () => {
    if (!profile) return;
    try {
      const { data } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();
      if (data) {
        setTargets({
          calories: data.calories ?? 2200,
          protein: Number(data.protein_g ?? 150),
          carbs: Number(data.carbs_g ?? 250),
          fat: Number(data.fat_g ?? 80),
          water: data.water_ml ?? 3000,
        });
      }
    } catch {}
  };

  const fetchDashboardData = async () => {
    if (!profile) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's workout
      const { data: workouts } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', profile.id)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (workouts && workouts.length > 0) {
        setTodaysWorkout(workouts[0]);
      }

      // Fetch today's nutrition
      const { data: nutrition } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', profile.id)
        .eq('date', today);

      if (nutrition) {
        const totals = (nutrition as NutritionLog[]).reduce((acc: { calories: number; protein: number; carbs: number; fat: number }, item: NutritionLog) => ({
          calories: acc.calories + (item.calories || 0),
          protein: acc.protein + (item.protein_g || 0),
          carbs: acc.carbs + (item.carbs_g || 0),
          fat: acc.fat + (item.fat_g || 0),
        }), {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        });
        setNutritionData(totals);
      }

      // Fetch today's water intake
      const { data: water } = await supabase
        .from('water_logs')
        .select('ml')
        .eq('user_id', profile.id)
        .eq('date', today);

      if (water) {
        const totalWater = (water as { ml: number }[]).reduce((acc: number, item: { ml: number }) => acc + item.ml, 0);
        setWaterIntake(totalWater);
      }

      // Calculate workout streak and weekly count
      // This is a simplified version - a real implementation would be more sophisticated
      const { data: recentWorkouts } = await supabase
        .from('workouts')
        .select('completed_at')
        .eq('user_id', profile.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(30);

      if (recentWorkouts) {
        // Calculate streak (consecutive days with workouts)
        let streak = 0;
        const today = new Date();
        const workoutDates = (recentWorkouts as { completed_at: string }[]).map((w: { completed_at: string }) => 
          new Date(w.completed_at!).toISOString().split('T')[0]
        );
        
        for (let i = 0; i < 30; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - i);
          const dateStr = checkDate.toISOString().split('T')[0];
          
          if (workoutDates.includes(dateStr)) {
            streak++;
          } else if (i > 0) { // Allow first day to not have workout
            break;
          }
        }
        setWorkoutStreak(streak);

        // Calculate this week's workouts
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = weekStart.toISOString().split('T')[0];
        
        const weeklyCount = (recentWorkouts as { completed_at: string }[]).filter((w: { completed_at: string }) => {
          const workoutDate = new Date(w.completed_at!).toISOString().split('T')[0];
          return workoutDate >= weekStartStr;
        }).length;
        setWeeklyWorkouts(weeklyCount);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeightHistory = async () => {
    if (!profile?.id) return;
    try {
      const since = new Date();
      since.setMonth(since.getMonth() - 3);
      const { data } = await supabase
        .from('weight_logs')
        .select('date, weight_kg')
        .eq('user_id', profile.id)
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true });
      const history = (data || []).map((d:any)=>({ date: d.date, weight_kg: Number(d.weight_kg) }));
      if (history.length === 0) {
        const startWeight = (profile as any)?.current_weight_kg;
        if (startWeight != null && startWeight !== '') {
          const startDate = ((profile as any)?.created_at || new Date().toISOString()).split('T')[0];
          setWeightHistory([{ date: startDate, weight_kg: Number(startWeight) }]);
          return;
        }
      }
      setWeightHistory(history);
    } catch {}
  };

  // Helpers for grouping
  const startOfWeek = (d: Date) => {
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = date.getUTCDay();
    const diff = (day + 6) % 7; // Monday=0
    date.setUTCDate(date.getUTCDate() - diff);
    return date.toISOString().split('T')[0];
  };

  const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

  const displaySeries = useMemo(() => {
    const data = [...weightHistory].sort((a, b) => a.date.localeCompare(b.date));
    if (data.length === 0) return [] as { date: string; weight_kg: number }[];
    const buckets = new Map<string, number>();
    for (const w of data) {
      const dt = new Date(w.date + 'T00:00:00Z');
      const key = weightView === 'weekly' ? startOfWeek(dt) : monthKey(dt);
      buckets.set(key, Number(w.weight_kg)); // last value wins
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, weight_kg]) => ({ date, weight_kg }));
  }, [weightHistory, weightView]);

  const quickAddWater = async (amount: number) => {
    if (!profile) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('water_logs').insert({
        user_id: profile.id,
        date: today,
        ml: amount,
      });
      
      setWaterIntake(prev => prev + amount);
    } catch (error) {
      console.error('Error adding water:', error);
    }
  };

  const [weightOpen, setWeightOpen] = useState(false);
  const [weightValue, setWeightValue] = useState('');
  const addWeight = async () => {
    if (!profile?.id) return;
    const value = Number(weightValue);
    if (Number.isNaN(value) || value <= 0) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('weight_logs').insert({ user_id: profile.id, date: today, weight_kg: value });
      setWeightHistory((prev) => {
        const next = [...prev.filter(w => w.date !== today), { date: today, weight_kg: value }].sort((a,b)=>a.date.localeCompare(b.date));
        return next;
      });
      await supabase.from('profiles').update({ current_weight_kg: value }).eq('id', profile.id);
      setWeightOpen(false);
      setWeightValue('');
    } catch (e) {
      setWeightOpen(false);
      setWeightValue('');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      {/* Header */}
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {profile?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-white/70 text-xs sm:text-sm md:text-base">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Overview Cards */}
      <OverviewCards
        workoutStreak={workoutStreak}
        todaysCalories={Math.round(nutritionData.calories)}
        calorieTarget={targets.calories}
        todaysWater={waterIntake}
        waterTarget={targets.water}
        weeklyWorkouts={weeklyWorkouts}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {/* Today's Workout */}
        <div className="lg:col-span-2">
          <TodaysWorkout workout={todaysWorkout || undefined} />
        </div>

        {/* Macro Rings */}
        <div>
        <MacroRings
          calories={nutritionData.calories}
          calorieTarget={targets.calories}
          protein={nutritionData.protein}
          proteinTarget={targets.protein}
          carbs={nutritionData.carbs}
          carbsTarget={targets.carbs}
          fat={nutritionData.fat}
          fatTarget={targets.fat}
        />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {/* Weight Trend */}
        <Card className="mobile-card md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-white">Weight Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {displaySeries.length === 0 ? (
              <p className="text-white/60 text-sm">No weight entries yet</p>
            ) : (
              <div className="h-48 sm:h-64">
                {/* Simple inline chart using SVG for minimal deps */}
                <svg viewBox="0 0 100 40" className="w-full h-full">
                  {(() => {
                    const values = displaySeries.map(w => Number(w.weight_kg));
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    const span = Math.max(1, max - min);
                    const toPoint = (w: {weight_kg:number}, i:number) => {
                      const x = (i / Math.max(1, displaySeries.length - 1)) * 100;
                      const y = 100 - (((Number(w.weight_kg) - min) / span) * 100);
                      return { x, y: (y * 0.35 + 5) };
                    };
                    if (displaySeries.length <= 1) {
                      const p = toPoint(displaySeries[0], 0);
                      return (
                        <>
                          <circle cx={p.x || 2} cy={p.y || 20} r="1.5" fill="#cda738" />
                          <text x={(p.x || 2) + 2} y={(p.y || 20) - 2} fontSize="3" fill="#cda738">
                            {displaySeries[0].weight_kg}kg
                          </text>
                        </>
                      );
                    }
                    const points = displaySeries.map((w,i)=>{
                      const p = toPoint(w,i);
                      return `${p.x},${p.y}`;
                    }).join(' ');
                    return (
                      <>
                        <polyline fill="none" stroke="#cda738" strokeWidth="2" points={points} />
                        {displaySeries.map((w,i)=>{
                          const p = toPoint(w,i);
                          return (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="1.3" fill="#cda738" />
                              {i === displaySeries.length - 1 && (
                                <text x={p.x + 2} y={p.y - 2} fontSize="3" fill="#cda738">{w.weight_kg}kg</text>
                              )}
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <button className={`px-2 py-1 text-xs rounded border ${weightView==='weekly'?'border-gold text-gold':'border-white/20 text-white/70'}`} onClick={()=>setWeightView('weekly')}>Weekly</button>
              <button className={`px-2 py-1 text-xs rounded border ${weightView==='monthly'?'border-gold text-gold':'border-white/20 text-white/70'}`} onClick={()=>setWeightView('monthly')}>Monthly</button>
            </div>
            <div className="mt-3">
              <Dialog open={weightOpen} onOpenChange={setWeightOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">Add Weight</Button>
                </DialogTrigger>
                <DialogContent className="bg-black border border-white/20 text-white">
                  <DialogHeader>
                    <DialogTitle>Add Weight</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="text-white/80 text-sm">Weight (kg)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={weightValue}
                        onChange={(e)=>setWeightValue(e.target.value)}
                        className="mobile-input mt-1 w-full"
                        placeholder="e.g. 80"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={()=>setWeightOpen(false)}>Cancel</Button>
                      <Button className="bg-gold hover:bg-gold/90 text-black" onClick={addWeight} disabled={!weightValue}>Save</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
        {/* Quick Water Add */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-white">Quick Add Water</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <div className="flex gap-1 sm:gap-2">
              <Button 
                variant="outline"
                className="flex-1 border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm"
                size="sm" 
                onClick={() => quickAddWater(250)}
              >
                250ml
              </Button>
              <Button 
                variant="outline"
                className="flex-1 border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm"
                size="sm" 
                onClick={() => quickAddWater(500)}
              >
                500ml
              </Button>
              <Button 
                variant="outline"
                className="flex-1 border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm"
                size="sm" 
                onClick={() => quickAddWater(750)}
              >
                750ml
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Messages - only if there is at least one thread with a coach */}
        <ClientMessagesCTA />
      </div>
    </div>
  );
}

function ClientMessagesCTA() {
  const { profile } = useAuth();
  const [hasThread, setHasThread] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      try {
        if (!profile?.id) return;
        const { data: rel } = await supabase
          .from('clients')
          .select('coach_id')
          .eq('client_id', profile.id)
          .maybeSingle();
        if (!rel?.coach_id) { setHasThread(false); return; }
        const { data: th } = await supabase
          .from('message_threads')
          .select('id')
          .eq('client_id', profile.id)
          .eq('coach_id', rel.coach_id)
          .limit(1);
        setHasThread(!!(th && th.length > 0));
      } catch {
        setHasThread(false);
      }
    })();
  }, [profile?.id]);

  if (!hasThread) return null;

  return (
    <Card className="mobile-card">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-white">
          <MessageCircle className="w-5 h-5 text-gold" />
          Messages
        </CardTitle>
      </CardHeader>
      <CardContent>
        <a href="/messages" className="block">
          <Button variant="outline" size="sm" className="w-full border-white/30 text-white hover:bg-white/10">
            <Plus className="w-4 h-4 mr-2 text-gold" />
            Open Messages
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}