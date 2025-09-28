'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Bell, Video, BarChart3, MessageCircle, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card as UICard } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

export default function CoachHome() {
  const { profile } = useAuth();
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [recentMeals, setRecentMeals] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [activeToday, setActiveToday] = useState<number>(0);
  const [recentThreads, setRecentThreads] = useState<any[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, any>>({});
  useEffect(() => {
    (async () => {
      const { data: rc } = await supabase.from('profiles').select('id, full_name, email, created_at').eq('role','client').order('created_at', { ascending: false }).limit(6);
      setRecentClients(rc || []);
      const today = new Date().toISOString().split('T')[0];
      const { data: rm } = await supabase.from('nutrition_logs').select('id, user_id, food_name, calories').eq('date', today).order('created_at', { ascending: false }).limit(6);
      setRecentMeals(rm || []);
      const { count: totalClients } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client');
      setActiveUsers(totalClients || 0);

      // Users active today (sent message or logged nutrition today)
      const [msgRes, nutrRes] = await Promise.all([
        supabase.from('messages').select('sender_id, created_at').gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
        supabase.from('nutrition_logs').select('user_id, created_at').gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
      ]);
      const ids = new Set<string>();
      (msgRes.data || []).forEach((m: any) => ids.add(m.sender_id));
      (nutrRes.data || []).forEach((n: any) => ids.add(n.user_id));
      setActiveToday(ids.size);

      // Recent threads with activity in last 7 days
      if (profile?.id) {
        const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
        const { data: th } = await supabase
          .from('message_threads')
          .select('id, client_id, coach_id, last_message_at')
          .eq('coach_id', profile.id)
          .gte('last_message_at', sevenDaysAgo)
          .order('last_message_at', { ascending: false })
          .limit(6);
        setRecentThreads(th || []);
        const clientIds = Array.from(new Set((th || []).map((t:any)=>t.client_id)));
        if (clientIds.length) {
          const { data: cps } = await supabase.from('profiles').select('id, full_name, email').in('id', clientIds);
          const map: Record<string, any> = {};
          (cps || []).forEach((c:any)=> map[c.id] = c);
          setClientMap(map);
        }
      }
    })();
  }, [profile?.id]);
  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white">Coach Dashboard</h1>
        <p className="text-white/70 text-xs sm:text-sm">Overview and quick actions</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-3">
        <Card className="mobile-card"><CardContent className="p-3"><div className="text-white/60 text-xs">Active users</div><div className="text-white text-xl font-semibold">{activeUsers}</div></CardContent></Card>
        <Card className="mobile-card"><CardContent className="p-3"><div className="text-white/60 text-xs">Users active today</div><div className="text-white text-xl font-semibold">{activeToday}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Users className="w-5 h-5 text-gold" /> Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60 text-sm mb-3">View all clients, search, and open details</p>
            <Link href="/coach/clients"><Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">Open Clients</Button></Link>
          </CardContent>
        </Card>

        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Bell className="w-5 h-5 text-gold" /> Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60 text-sm mb-3">Send in-app notifications to clients</p>
            <Link href="/coach/notifications"><Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">Open Notifications</Button></Link>
          </CardContent>
        </Card>


        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><MessageCircle className="w-5 h-5 text-gold" /> Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60 text-sm mb-3">Open your conversations with clients</p>
            <Link href="/coach/messages"><Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">Open Messages</Button></Link>
          </CardContent>
        </Card>

        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Calendar className="w-5 h-5 text-gold" /> Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60 text-sm mb-3">Set your weekly gym hours</p>
            <Link href="/coach/availability"><Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">Edit Availability</Button></Link>
          </CardContent>
        </Card>

        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Calendar className="w-5 h-5 text-gold" /> Today’s Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60 text-sm mb-3">View today’s client sessions</p>
            <Link href="/coach/schedule"><Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">Open Schedule</Button></Link>
          </CardContent>
        </Card>
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Video className="w-5 h-5 text-gold" /> Content Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60 text-sm mb-3">Upload and manage videos and documents</p>
            <Link href="/coach/library"><Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">Open Manager</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
