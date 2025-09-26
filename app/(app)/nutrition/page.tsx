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
import { FoodLogDialog, EditFoodLogDialog } from '@/components/nutrition/food-log-dialog';
import { NutritionLog, WaterLog, NutritionTargets } from '@/types/supabase';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Settings as SettingsIcon, Trash2, Pencil } from 'lucide-react';
import { MealPresetsDialog, Preset } from '@/components/nutrition/meal-presets-dialog';
import { BarcodeScanner } from '@/components/nutrition/barcode-scanner';

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
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [recentFoods, setRecentFoods] = useState<any[]>([]);
  const [targets, setTargets] = useState<{ calories: number; protein: number; carbs: number; fat: number; water: number } | null>(null);

  useEffect(() => {
    if (profile) {
      fetchTargets();
    }
  }, [profile]);

  const fetchTargets = async () => {
    if (!profile) return;
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
    } else {
      setTargets({ calories: 2200, protein: 150, carbs: 250, fat: 80, water: 3000 });
    }
  };

  const saveTargets = async (next: { calories: number; protein: number; carbs: number; fat: number; water: number }) => {
    if (!profile) return;
    setTargets(next);
    await supabase
      .from('nutrition_targets')
      .upsert({
        user_id: profile.id,
        calories: next.calories,
        protein_g: next.protein,
        carbs_g: next.carbs,
        fat_g: next.fat,
        water_ml: next.water,
      } satisfies Partial<NutritionTargets> & { user_id: string });
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

      const logs = nutrition || [];
      setNutritionLogs(logs);
      // Build recent foods list from latest 25 entries
      setRecentFoods(
        (logs as NutritionLog[])
          .slice(0, 25)
          .map((l: NutritionLog) => ({
            food_name: l.food_name,
            brand: l.brand,
            serving_qty: l.serving_qty,
            serving_unit: l.serving_unit,
            calories: l.calories,
            protein_g: l.protein_g,
            carbs_g: l.carbs_g,
            fat_g: l.fat_g,
            fiber_g: l.fiber_g,
            sugar_g: l.sugar_g,
            sodium_mg: l.sodium_mg,
          }))
      );
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

  const deleteWaterLog = async (id: string) => {
    try {
      const { error } = await supabase
        .from('water_logs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchNutritionData();
    } catch (error) {
      console.error('Error deleting water log:', error);
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

  const updateFoodLog = async (id: string, updates: Partial<NutritionLog>) => {
    try {
      const { error } = await supabase
        .from('nutrition_logs')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      await fetchNutritionData();
    } catch (error) {
      console.error('Error updating food log:', error);
    }
  };

  const deleteFoodLog = async (id: string) => {
    try {
      const { error } = await supabase
        .from('nutrition_logs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchNutritionData();
    } catch (error) {
      console.error('Error deleting food log:', error);
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
          const base64 = publicKey;
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

  return (
    <div className="mobile-padding mobile-spacing bg-black min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-white">Nutrition</h1>
          <p className="text-white/60 text-xs sm:text-sm">Track your daily intake</p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto mobile-input text-xs sm:text-sm"
          />
          <Button
            onClick={() => setShowBarcodeScanner(true)}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm px-2 sm:px-3"
          >
            <Scan className="w-4 h-4 sm:mr-2 text-gold" />
            <span className="hidden sm:inline">Scan</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Macro Overview */}
        <div className="lg:col-span-1">
          {targets && (
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
          )}
        </div>

        {/* Water Tracking */}
        <div className="lg:col-span-2">
          <Card className="mobile-card h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-gold" />
                Water Intake
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xl sm:text-2xl font-bold text-white">{totalWater}ml</span>
                <span className="text-white/60 text-xs sm:text-sm">
                  of {targets?.water ?? 3000}ml ({Math.round((totalWater / (targets?.water ?? 3000)) * 100)}%)
                </span>
              </div>
              
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gold transition-all duration-300"
                  style={{ width: `${Math.min((totalWater / (targets?.water ?? 3000)) * 100, 100)}%` }}
                />
              </div>

              <div className="flex gap-1 sm:gap-2">
                <Button 
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm"
                  size="sm" 
                  onClick={() => quickAddWater(250)}
                >
                  +250ml
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm"
                  size="sm" 
                  onClick={() => quickAddWater(500)}
                >
                  +500ml
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm"
                  size="sm" 
                  onClick={() => quickAddWater(750)}
                >
                  +750ml
                </Button>
              </div>

              {/* Recent water logs */}
              {waterLogs.length > 0 && (
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-xs sm:text-sm font-medium text-white/60">Recent:</p>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {waterLogs.slice(0, 3).map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-xs sm:text-sm text-white">
                        <div className="flex items-center gap-3">
                          <span className="text-white">{log.ml}ml</span>
                          <span className="text-white/60">
                            {new Date(log.created_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={() => deleteWaterLog(log.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
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
      <div className="mobile-spacing">
        {mealTypes.map((meal) => {
          const MealIcon = meal.icon;
          const mealLogs = getMealLogs(meal.id);
          const mealCalories = getMealCalories(meal.id);

          return (
            <Card key={meal.id} className="mobile-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MealIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${meal.color}`} />
                    <CardTitle className="text-base sm:text-lg text-white">{meal.name}</CardTitle>
                    <Badge className="bg-gold text-black">
                      {mealCalories} cal
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <FoodLogDialog
                      meal={meal.id}
                      onSubmit={async (payload) => {
                        await addFoodLog(payload as any);
                      }}
                      trigger={
                        <Button
                          variant="outline"
                          className="border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm px-2 sm:px-3"
                          size="sm"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 text-gold" />
                          <span className="hidden sm:inline">Add Food</span>
                          <span className="sm:hidden">Add</span>
                        </Button>
                      }
                    />
                    <MealPresetsDialog
                      onApply={async (preset: Preset, mult: number) => {
                        await addFoodLog({
                          meal: meal.id,
                          food_name: preset.food_name,
                          brand: null,
                          serving_qty: (preset.serving_qty || 1) * mult,
                          serving_unit: preset.serving_unit || 'serving',
                          calories: Math.round((preset.calories || 0) * mult),
                          protein_g: (preset.protein_g || 0) * mult,
                          carbs_g: (preset.carbs_g || 0) * mult,
                          fat_g: (preset.fat_g || 0) * mult,
                          fiber_g: (preset.fiber_g || 0) * mult,
                          sugar_g: (preset.sugar_g || 0) * mult,
                          sodium_mg: Math.round((preset.sodium_mg || 0) * mult),
                        } as any);
                      }}
                      trigger={
                        <Button
                          variant="outline"
                          className="border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm px-2 sm:px-3"
                          size="sm"
                        >
                          <span className="hidden sm:inline">Presets</span>
                          <span className="sm:hidden">Pre</span>
                        </Button>
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              
              {mealLogs.length > 0 && (
                <CardContent>
                  <div className="space-y-1 sm:space-y-2">
                    {mealLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-2 sm:p-3 bg-white/10 rounded">
                        <div>
                          <p className="font-medium text-white text-sm sm:text-base">{log.food_name}</p>
                          <p className="text-xs text-white/60">
                            P: {Math.round(log.protein_g || 0)}g • 
                            C: {Math.round(log.carbs_g || 0)}g • 
                            F: {Math.round(log.fat_g || 0)}g
                          </p>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="text-right">
                            <p className="font-semibold text-white text-sm sm:text-base">{Math.round(log.calories || 0)} cal</p>
                            <p className="text-xs text-white/60">
                              {log.serving_qty} {log.serving_unit}
                            </p>
                          </div>
                          <EditFoodLogDialog
                            initial={{
                              id: log.id,
                              meal: log.meal || 'snacks',
                              food_name: log.food_name,
                              brand: log.brand,
                              serving_qty: log.serving_qty,
                              serving_unit: log.serving_unit,
                              calories: log.calories || 0,
                              protein_g: log.protein_g || 0,
                              carbs_g: log.carbs_g || 0,
                              fat_g: log.fat_g || 0,
                              fiber_g: log.fiber_g || 0,
                              sugar_g: log.sugar_g || 0,
                              sodium_mg: log.sodium_mg || 0,
                            }}
                            onSave={async (id, updates) => updateFoodLog(id, updates as any)}
                            trigger={
                              <Button variant="ghost" size="icon" className="hover:bg-white/10">
                                <Pencil className="w-3 h-3 sm:w-4 sm:h-4 text-white/70" />
                              </Button>
                            }
                          />
                          <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={() => deleteFoodLog(log.id)}>
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
              
              {mealLogs.length === 0 && (
                <CardContent>
                  <div className="text-center py-8 text-white/60">
                    <Utensils className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50 text-gold" />
                    <p className="text-sm sm:text-base">No foods logged for {meal.name.toLowerCase()}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Recent foods quick add */}
      {recentFoods.length > 0 && (
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-white">Recent foods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {recentFoods.slice(0, 10).map((rf: any, idx: number) => (
                <Button key={idx} variant="outline" className="border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm px-2 sm:px-3" size="sm"
                  onClick={() => addFoodLog({ meal: 'snacks', food_name: rf.food_name as string, calories: Number(rf.calories || 0), protein_g: Number(rf.protein_g || 0), carbs_g: Number(rf.carbs_g || 0), fat_g: Number(rf.fat_g || 0) })}>
                  {rf.food_name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick targets adjustment */}
      {targets && (
      <Card className="mobile-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white"><SettingsIcon className="w-4 h-4 text-gold" /> Daily targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid mobile-grid-4 gap-2 sm:gap-3">
            <div>
              <p className="text-xs text-white/60">Calories</p>
              <Input type="number" value={targets.calories} onChange={(e) => saveTargets({ ...targets, calories: Number(e.target.value) })} className="mobile-input" />
            </div>
            <div>
              <p className="text-xs text-white/60">Protein (g)</p>
              <Input type="number" value={targets.protein} onChange={(e) => saveTargets({ ...targets, protein: Number(e.target.value) })} className="mobile-input" />
            </div>
            <div>
              <p className="text-xs text-white/60">Carbs (g)</p>
              <Input type="number" value={targets.carbs} onChange={(e) => saveTargets({ ...targets, carbs: Number(e.target.value) })} className="mobile-input" />
            </div>
            <div>
              <p className="text-xs text-white/60">Fat (g)</p>
              <Input type="number" value={targets.fat} onChange={(e) => saveTargets({ ...targets, fat: Number(e.target.value) })} className="mobile-input" />
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Barcode Scanner Modal Placeholder */}
      {showBarcodeScanner && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <Card className="w-full max-w-md mobile-card">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg text-white">Barcode Scanner</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-3 sm:space-y-4">
              <div className="w-full">
                <BarcodeScanner
                  onDetected={async (code: string) => {
                    try {
                      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
                      const data = await res.json();
                      const p = data.product;
                      if (p) {
                        await addFoodLog({
                          meal: 'snacks',
                          food_name: p.product_name || 'Scanned item',
                          calories: Number(p.nutriments?.['energy-kcal_100g'] || 0),
                          protein_g: Number(p.nutriments?.proteins_100g || 0),
                          carbs_g: Number(p.nutriments?.carbohydrates_100g || 0),
                          fat_g: Number(p.nutriments?.fat_100g || 0),
                        });
                        setShowBarcodeScanner(false);
                      }
                    } catch (e) {
                      console.error('Scan lookup failed', e);
                    }
                  }}
                  onManualEntry={() => {
                    setShowBarcodeScanner(false);
                    setShowManualEntry(true);
                  }}
                />
              </div>
              <div className="flex gap-1 sm:gap-2">
                <Button 
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10 text-sm"
                  onClick={testPush}
                >
                  Send Test Push
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10 text-sm"
                  onClick={() => setShowBarcodeScanner(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}