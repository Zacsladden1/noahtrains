'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, Clock } from 'lucide-react';
import { Workout } from '@/types/supabase';

interface TodaysWorkoutProps {
  workout?: Workout & {
    exercises?: Array<{
      name: string;
      sets: number;
    }>;
  };
}

export function TodaysWorkout({ workout }: TodaysWorkoutProps) {
  if (!workout) {
    return (
      <Card className="mobile-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Clock className="h-5 w-5 text-gold" />
            Today&apos;s Workout
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-white/60 mb-4">No workout scheduled for today</p>
          <Link href="/workouts">
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
              Browse Workouts
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    planned: {
      icon: Play,
      label: 'Start Workout',
      variant: 'default' as const, 
      color: 'text-gold',
    },
    in_progress: {
      icon: Play,
      label: 'Continue Workout',
      variant: 'default' as const,
      color: 'text-gold',
    },
    completed: {
      icon: CheckCircle,
      label: 'Completed',
      variant: 'secondary' as const,
      color: 'text-gold',
    },
  };

  const config = statusConfig[workout.status];
  const StatusIcon = config.icon;

  return (
    <Card className="mobile-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${config.color}`} />
            Today&apos;s Workout
          </div>
          <Badge className="bg-gold text-black">
            {workout.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg text-white">{workout.name || 'Workout Session'}</h3>
          {workout.exercises && workout.exercises.length > 0 && (
            <p className="text-sm text-white/60">
              {workout.exercises.length} exercises •{' '}
              {workout.exercises.reduce((total, ex) => total + (ex.sets || 0), 0)} total sets
            </p>
          )}
        </div>

        {workout.exercises && workout.exercises.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-white/60">Exercises:</p>
            <div className="space-y-1">
              {workout.exercises.slice(0, 3).map((exercise, index) => (
                <div key={index} className="flex justify-between text-sm text-white">
                  <span className="text-white">{exercise.name}</span>
                  <span className="text-white/60">{exercise.sets} sets</span>
                </div>
              ))}
              {workout.exercises.length > 3 && (
                <p className="text-xs text-white/60">
                  +{workout.exercises.length - 3} more exercises
                </p>
              )}
            </div>
          </div>
        )}

        <div className="pt-2">
          {workout.status !== 'completed' ? (
            <Link href={`/workouts/${workout.id}`}>
              <Button className="w-full bg-gold hover:bg-gold/90 text-black">
                <StatusIcon className="w-4 h-4 mr-2" />
                {config.label}
              </Button>
            </Link>
          ) : (
            <div className="text-center py-2">
              <CheckCircle className="w-6 h-6 text-gold mx-auto mb-2" />
              <p className="text-sm text-white/60">Great job today!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}