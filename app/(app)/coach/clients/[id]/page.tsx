'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Flame, Egg, Wheat, Droplet, Droplets, Coffee, Sun, Sunset, Apple, CircleDot, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { supabase } from '@/lib/supabase';

export default function CoachClientDetailPage() {
  const params = useParams();
  const clientId = params?.id as string;
  const [client, setClient] = useState<any>(null);
  const [targets, setTargets] = useState<any>({ calories: 2200, protein: 150, carbs: 250, fat: 80, water: 3000 });
  const [recent, setRecent] = useState<any[]>([]);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const { data: p } = await supabase.from('profiles').select('id, full_name, email').eq('id', clientId).maybeSingle();
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
    })();
  }, [clientId]);

  // Realtime updates for today's meals
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`coach-client-meals-${clientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nutrition_logs', filter: `user_id=eq.${clientId}` }, async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
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
  }, [clientId]);

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

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white mb-3">{client?.full_name || 'Client'}</h1>

      <div className="flex gap-2 mb-3">
        <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={openThread}>Message client</Button>
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
    </div>
  );
}
