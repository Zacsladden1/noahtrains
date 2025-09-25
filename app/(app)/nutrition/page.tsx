'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Scan, 
  Search, 
  Utensils, 
  Droplets,
  Coffee,
  Sun,
  Sunset,
  Moon,
  Apple
} from 'lucide-react';
import { MacroRings } from '@/components/nutrition/macro-rings';
import { NutritionLog, WaterLog } from '@/types/supabase';

const mealTypes = [
  { id: 'breakfast', name: 'Breakfast', icon: Coffee, color: 'text-orange-400' },
  { id: 'lunch', name: 'Lunch', icon: Sun, color: 'text-yellow-400' },
  { id: 'dinner', name: 'Dinner', icon: Sunset, color: 'text-red-400' },
  { id: 'snacks', name: 'Snacks', icon: Apple, color: 'text-green-400' },
];

export default function NutritionPage() {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Target values (would come from user settings in a real app)
  const targets = {
    calories: 2200,
    protein: 150,
    carbs: 250,
    fat: 80,
    water: 3000,
  };

  useEffect(() => {
    if (profile) {
      fetchNutritionData();
    }
  }, [profile, selectedDate]);

  const fetchNutritionData = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Fetch nutrition logs
      const { data: nutrition, error: nutritionError } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', profile.id)
        .eq('date', selectedDate)
        .order('created_at', { ascending: false });

      if (nutritionError) throw nutritionError;

      // Fetch water logs
      const { data: water, error: waterError } = await supabase
        .from('water_logs')
        .select('*')
        .eq('user_id', profile.id)
        .eq('date', selectedDate)
        .order('created_at', { ascending: false });

      if (waterError) throw waterError;

      setNutritionLogs(nutrition || []);
      setWaterLogs(water || []);
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickAddWater = async (amount: number) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('water_logs')
        .insert({
          user_id: profile.id,
          date: selectedDate,
          ml: amount,
        });

      if (error) throw error;
      await fetchNutritionData();
    } catch (error) {
      console.error('Error adding water:', error);
    }
  };

  const addFoodLog = async (foodData: {
    meal: string;
    food_name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('nutrition_logs')
        .insert({
          user_id: profile.id,
          date: selectedDate,
          ...foodData,
        });

      if (error) throw error;
      await fetchNutritionData();
    } catch (error) {
      console.error('Error adding food log:', error);
    }
  };

  // Calculate totals
  const nutritionTotals = nutritionLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein_g || 0),
      carbs: acc.carbs + (log.carbs_g || 0),
      fat: acc.fat + (log.fat_g || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const totalWater = waterLogs.reduce((acc, log) => acc + log.ml, 0);

  const getMealLogs = (mealType: string) => {
    return nutritionLogs.filter(log => log.meal === mealType);
  };

  const getMealCalories = (mealType: string) => {
    return getMealLogs(mealType).reduce((acc, log) => acc + (log.calories || 0), 0);
  };

  return (
    <div className="mobile-padding space-y-6 bg-black min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading text-white">Nutrition</h1>
          <p className="text-white/60">Track your daily intake</p>
        </div>
        <div className="flex items-center space-x-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto mobile-input"
          />
          <Button
            onClick={() => setShowBarcodeScanner(true)}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <Scan className="w-4 h-4 mr-2 text-gold" />
            Scan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Macro Overview */}
        <div className="lg:col-span-1">
          <MacroRings
            calories={nutritionTotals.calories}
            calorieTarget={targets.calories}
            protein={nutritionTotals.protein}
            proteinTarget={targets.protein}
            carbs={nutritionTotals.carbs}
            carbsTarget={targets.carbs}
            fat={nutritionTotals.fat}
            fatTarget={targets.fat}
          />
        </div>

        {/* Water Tracking */}
        <div className="lg:col-span-2">
          <Card className="mobile-card h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Droplets className="w-5 h-5 text-gold" />
                Water Intake
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{totalWater}ml</span>
                <span className="text-white/60">
                  of {targets.water}ml ({Math.round((totalWater / targets.water) * 100)}%)
                </span>
              </div>
              
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gold transition-all duration-300"
                  style={{ width: `${Math.min((totalWater / targets.water) * 100, 100)}%` }}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10"
                  size="sm" 
                  onClick={() => quickAddWater(250)}
                >
                  +250ml
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10"
                  size="sm" 
                  onClick={() => quickAddWater(500)}
                >
                  +500ml
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10"
                  size="sm" 
                  onClick={() => quickAddWater(750)}
                >
                  +750ml
                </Button>
              </div>

              {/* Recent water logs */}
              {waterLogs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white/60">Recent:</p>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {waterLogs.slice(0, 3).map((log) => (
                      <div key={log.id} className="flex justify-between text-sm text-white">
                        <span className="text-white">{log.ml}ml</span>
                        <span className="text-white/60">
                          {new Date(log.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Meals */}
      <div className="space-y-4">
        {mealTypes.map((meal) => {
          const MealIcon = meal.icon;
          const mealLogs = getMealLogs(meal.id);
          const mealCalories = getMealCalories(meal.id);

          return (
            <Card key={meal.id} className="mobile-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MealIcon className={`w-5 h-5 ${meal.color}`} />
                    <CardTitle className="text-lg text-white">{meal.name}</CardTitle>
                    <Badge className="bg-gold text-black">
                      {mealCalories} cal
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                    size="sm"
                    onClick={() => {
                      // In a real app, this would open an add food modal
                      const foodName = prompt('Food name:');
                      const calories = prompt('Calories:');
                      if (foodName && calories) {
                        addFoodLog({
                          meal: meal.id,
                          food_name: foodName,
                          calories: parseInt(calories),
                          protein_g: 0,
                          carbs_g: 0,
                          fat_g: 0,
                        });
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2 text-gold" />
                    Add Food
                  </Button>
                </div>
              </CardHeader>
              
              {mealLogs.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    {mealLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-2 bg-white/10 rounded">
                        <div>
                          <p className="font-medium text-white">{log.food_name}</p>
                          <p className="text-xs text-white/60">
                            P: {Math.round(log.protein_g || 0)}g • 
                            C: {Math.round(log.carbs_g || 0)}g • 
                            F: {Math.round(log.fat_g || 0)}g
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">{Math.round(log.calories || 0)} cal</p>
                          <p className="text-xs text-white/60">
                            {log.serving_qty} {log.serving_unit}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
              
              {mealLogs.length === 0 && (
                <CardContent>
                  <div className="text-center py-8 text-white/60">
                    <Utensils className="w-8 h-8 mx-auto mb-2 opacity-50 text-gold" />
                    <p>No foods logged for {meal.name.toLowerCase()}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Barcode Scanner Modal Placeholder */}
      {showBarcodeScanner && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md mobile-card">
            <CardHeader>
              <CardTitle className="text-white">Barcode Scanner</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="w-full h-64 bg-white/10 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Scan className="w-12 h-12 mx-auto mb-4 text-gold" />
                  <p className="text-white/60">Camera view would appear here</p>
                  <p className="text-sm text-white/60 mt-2">
                    Point camera at barcode to scan
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10"
                  onClick={() => setShowBarcodeScanner(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-gold hover:bg-gold/90 text-black"
                  onClick={() => {
                    // Demo: simulate scanning a banana
                    addFoodLog({
                      meal: 'snacks',
                      food_name: 'Banana (scanned)',
                      calories: 105,
                      protein_g: 1.3,
                      carbs_g: 27,
                      fat_g: 0.4,
                    });
                    setShowBarcodeScanner(false);
                  }}
                >
                  Demo Scan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}