'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
const OverviewCards = dynamic(() => import('@/components/dashboard/overview-cards').then(m => m.OverviewCards), { ssr: false });
const TodaysWorkout = dynamic(() => import('@/components/dashboard/todays-workout').then(m => m.TodaysWorkout), { ssr: false });
const MacroRings = dynamic(() => import('@/components/nutrition/macro-rings').then(m => m.MacroRings), { ssr: false });
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, MessageCircle, Bell } from 'lucide-react';
import { Workout, NutritionLog, WaterLog } from '@/types/supabase';

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
  const [loading, setLoading] = useState(true);

  // Target values (in a real app, these would come from user settings)
  const targets = {
    calories: 2200,
    protein: 150,
    carbs: 250,
    fat: 80,
    water: 3000,
  };

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
      fetchDashboardData();
    }
  }, [profile]);

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

        {/* Recent Messages */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-white">
              <MessageCircle className="w-5 h-5 text-gold" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm text-white/60 mb-2 sm:mb-3">
              {isAdmin ? 'Check in with your clients' : 'Connect with your coach'}
            </p>
            <Button variant="outline" size="sm" className="w-full border-white/30 text-white hover:bg-white/10">
              <Plus className="w-4 h-4 mr-2 text-gold" />
              New Message
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-white">
              <Bell className="w-5 h-5 text-gold" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm text-white/60 mb-2 sm:mb-3">
              Send yourself a test push notification
            </p>
            <Button onClick={testPush} variant="outline" size="sm" className="w-full border-white/30 text-white hover:bg-white/10">
              Send Test Push
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}