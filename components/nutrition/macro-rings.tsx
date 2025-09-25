'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface MacroRingsProps {
  calories: number;
  calorieTarget: number;
  protein: number;
  proteinTarget: number;
  carbs: number;
  carbsTarget: number;
  fat: number;
  fatTarget: number;
}

export function MacroRings({
  calories,
  calorieTarget,
  protein,
  proteinTarget,
  carbs,
  carbsTarget,
  fat,
  fatTarget,
}: MacroRingsProps) {
  const macros = [
    {
      name: 'Calories',
      current: calories,
      target: calorieTarget,
      color: 'text-gold',
      bgColor: 'bg-gold',
    },
    {
      name: 'Protein',
      current: protein,
      target: proteinTarget,
      color: 'text-white',
      bgColor: 'bg-gold',
      unit: 'g',
    },
    {
      name: 'Carbs',
      current: carbs,
      target: carbsTarget,
      color: 'text-white',
      bgColor: 'bg-gold',
      unit: 'g',
    },
    {
      name: 'Fat',
      current: fat,
      target: fatTarget,
      color: 'text-white',
      bgColor: 'bg-gold',
      unit: 'g',
    },
  ];

  return (
    <Card className="mobile-card">
      <CardHeader>
        <CardTitle className="text-white">Daily Macros</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {macros.map((macro) => {
            const percentage = Math.min((macro.current / macro.target) * 100, 100);
            const isOver = macro.current > macro.target;
            
            return (
              <div key={macro.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white">{macro.name}</span>
                  <span className={`text-sm ${isOver ? 'text-white' : 'text-gold'}`}>
                    {Math.round(macro.current)}{macro.unit || ''} / {macro.target}{macro.unit || ''}
                  </span>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-2"
                />
                <div className="text-xs text-right text-white/60">
                  {Math.round(percentage)}%
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}