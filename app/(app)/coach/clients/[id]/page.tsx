'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function CoachClientDetailPage() {
  const params = useParams();
  const clientId = params?.id as string;
  const [client, setClient] = useState<any>(null);
  const [targets, setTargets] = useState<any>({ calories: 2200, protein: 150, carbs: 250, fat: 80, water: 3000 });
  const [recent, setRecent] = useState<any[]>([]);

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
      setRecent(meals || []);
    })();
  }, [clientId]);

  const saveTargets = async () => {
    await supabase.from('nutrition_targets').upsert({
      user_id: clientId,
      calories: targets.calories,
      protein_g: targets.protein,
      carbs_g: targets.carbs,
      fat_g: targets.fat,
      water_ml: targets.water,
    });
    alert('Targets updated');
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
          <div className="grid mobile-grid-4 gap-2 sm:gap-3">
            <Input value={targets.calories} onChange={(e)=>setTargets({...targets, calories:Number(e.target.value)})} className="mobile-input" />
            <Input value={targets.protein} onChange={(e)=>setTargets({...targets, protein:Number(e.target.value)})} className="mobile-input" />
            <Input value={targets.carbs} onChange={(e)=>setTargets({...targets, carbs:Number(e.target.value)})} className="mobile-input" />
            <Input value={targets.fat} onChange={(e)=>setTargets({...targets, fat:Number(e.target.value)})} className="mobile-input" />
          </div>
          <div className="mt-3">
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={saveTargets}>Save</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mobile-card">
        <CardHeader>
          <CardTitle className="text-white text-base">Today’s Meals</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-white/60 text-sm">No meals today</p>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2 bg-white/10 rounded">
                  <div className="text-white text-sm">{r.food_name}</div>
                  <div className="text-white/70 text-sm">{Math.round(r.calories || 0)} cal</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
