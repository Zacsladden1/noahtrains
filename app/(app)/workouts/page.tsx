'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Calendar, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Dumbbell
} from 'lucide-react';
import { Workout, Exercise } from '@/types/supabase';
import Link from 'next/link';

export default function WorkoutsPage() {
  const { profile } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchWorkouts();
    }
  }, [profile]);

  const fetchWorkouts = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setWorkouts(data || []);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    }
  };

  useEffect(() => { setLoading(false); }, []);

  // Clients no longer create workouts themselves; coaches assign them.

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'in_progress':
        return <Play className="w-4 h-4 text-blue-400" />;
      default:
        return <Calendar className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-400/10 text-green-400 border-green-400/20';
      case 'in_progress':
        return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const filteredExercises = exercises.filter(exercise =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.muscle_groups?.some(muscle => 
      muscle.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white">Workouts</h1>
          <p className="text-white/60 text-xs sm:text-sm">Your coach assigns daily workouts. Log and track progress here.</p>
        </div>
      </div>

      <Tabs defaultValue="history" className="mobile-spacing">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mobile-spacing">
          {workouts.length === 0 ? (
            <Card className="mobile-card">
              <CardContent className="text-center py-12">
                <Dumbbell className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2 text-white">No workouts yet</h3>
                <p className="text-white/60 mb-4 text-sm">
                  Your coach will assign your workouts here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="mobile-spacing">
              {workouts.map((workout) => (
                <Card key={workout.id} className="mobile-card hover:border-gold/50 transition-colors">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          {getStatusIcon(workout.status)}
                          <div>
                            <h3 className="font-semibold text-white text-sm sm:text-base truncate max-w-[160px] sm:max-w-none">{workout.name}</h3>
                            <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-sm text-white/60">
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1 text-gold" />
                                {new Date(workout.created_at).toLocaleDateString()}
                              </span>
                              {workout.completed_at && (
                                <span className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1 text-gold" />
                                  {Math.round(
                                    (new Date(workout.completed_at).getTime() - 
                                     new Date(workout.started_at || workout.created_at).getTime()) / 
                                    (1000 * 60)
                                  )} min
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 flex-shrink-0 w-auto">
                        <Badge className={`hidden sm:inline-flex ${getStatusColor(workout.status)}`}>
                          {workout.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Link href={`/workouts/${workout.id}`}>
                          <Button 
                            className={workout.status === 'completed' 
                              ? 'border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm px-2 w-full sm:w-auto' 
                              : 'bg-gold hover:bg-gold/90 text-black text-xs sm:text-sm px-2 w-full sm:w-auto'
                            }
                            variant={workout.status === 'completed' ? 'outline' : 'default'}
                            size="sm"
                          >
                            {workout.status === 'completed' ? 'View' : 'Continue'}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        

        <TabsContent value="analytics" className="mobile-spacing">
          <div className="grid mobile-grid-3 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            <Card className="mobile-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-white">Total Workouts</CardTitle>
                <TrendingUp className="h-4 w-4 text-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-white">{workouts.length}</div>
                <p className="text-xs text-white/60">
                  {workouts.filter(w => w.status === 'completed').length} completed
                </p>
              </CardContent>
            </Card>

            <Card className="mobile-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-white">This Month</CardTitle>
                <Calendar className="h-4 w-4 text-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {workouts.filter(w => {
                    const workoutDate = new Date(w.created_at);
                    const now = new Date();
                    return workoutDate.getMonth() === now.getMonth() && 
                           workoutDate.getFullYear() === now.getFullYear();
                  }).length}
                </div>
                <p className="text-xs text-white/60">workouts</p>
              </CardContent>
            </Card>

            <Card className="mobile-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-white">Avg Duration</CardTitle>
                <Clock className="h-4 w-4 text-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-white">45</div>
                <p className="text-xs text-white/60">minutes</p>
              </CardContent>
            </Card>
          </div>

          {/* Placeholder for charts */}
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg text-white">Workout Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-white/60">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50 text-gold" />
                  <p className="text-sm sm:text-base">Workout analytics will appear here</p>
                  <p className="text-xs sm:text-sm">Complete more workouts to see trends</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}