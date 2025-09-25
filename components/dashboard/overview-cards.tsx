'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dumbbell, Target, Droplets, Flame } from 'lucide-react';

interface OverviewCardsProps {
  workoutStreak: number;
  todaysCalories: number;
  calorieTarget: number;
  todaysWater: number;
  waterTarget: number;
  weeklyWorkouts: number;
}

export function OverviewCards({
  workoutStreak,
  todaysCalories,
  calorieTarget,
  todaysWater,
  waterTarget,
  weeklyWorkouts,
}: OverviewCardsProps) {
  const calorieProgress = Math.min((todaysCalories / calorieTarget) * 100, 100);
  const waterProgress = Math.min((todaysWater / waterTarget) * 100, 100);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* Workout Streak */}
      <Card className="mobile-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Streak</CardTitle>
          <Dumbbell className="h-4 w-4 text-gold" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gold">{workoutStreak}</div>
          <p className="text-xs text-white/60">days</p>
        </CardContent>
      </Card>

      {/* Today's Calories */}
      <Card className="mobile-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Calories</CardTitle>
          <Flame className="h-4 w-4 text-gold" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{todaysCalories}</div>
          <p className="text-xs text-white/60">
            of {calorieTarget} ({Math.round(calorieProgress)}%)
          </p>
          <Progress value={calorieProgress} className="mt-2 h-1" />
        </CardContent>
      </Card>

      {/* Today's Water */}
      <Card className="mobile-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Water</CardTitle>
          <Droplets className="h-4 w-4 text-gold" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{todaysWater}ml</div>
          <p className="text-xs text-white/60">
            of {waterTarget}ml ({Math.round(waterProgress)}%)
          </p>
          <Progress value={waterProgress} className="mt-2 h-1" />
        </CardContent>
      </Card>

      {/* Weekly Workouts */}
      <Card className="mobile-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">This Week</CardTitle>
          <Target className="h-4 w-4 text-gold" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{weeklyWorkouts}</div>
          <p className="text-xs text-white/60">workouts</p>
          <Badge variant="secondary" className="mt-2 text-xs bg-white/10 text-white">
            {weeklyWorkouts >= 4 ? 'On Track' : 'Behind'}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}