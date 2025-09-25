'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export type Preset = {
  id: string;
  name: string;
  food_name: string;
  serving_qty?: number | null;
  serving_unit?: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function MealPresetsDialog({
  trigger,
  onApply,
}: {
  trigger: React.ReactNode;
  onApply: (preset: Preset, multiplier: number) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [creating, setCreating] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [form, setForm] = useState<Preset>({
    id: '',
    name: '',
    food_name: '',
    serving_qty: 1,
    serving_unit: 'serving',
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('meal_presets');
      setPresets(saved ? JSON.parse(saved) : []);
    } catch {
      setPresets([]);
    }
  }, [open]);

  const persist = (list: Preset[]) => {
    setPresets(list);
    try { localStorage.setItem('meal_presets', JSON.stringify(list)); } catch {}
  };

  const create = () => {
    const p: Preset = { ...form, id: uid() };
    persist([p, ...presets]);
    setCreating(false);
    setForm({ ...form, id: '', name: '', food_name: '', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 });
  };

  const remove = (id: string) => persist(presets.filter(p => p.id !== id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-black border border-white/20 text-white">
        <DialogHeader>
          <DialogTitle>Meal presets</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 mb-3">
          <Label className="text-white/70">Portion</Label>
          <select value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))} className="px-3 py-2 bg-black border border-white/30 rounded-md text-sm">
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
          <Button variant="outline" className="ml-auto border-white/30 text-white hover:bg-white/10" onClick={() => setCreating(true)}>Create preset</Button>
        </div>

        {creating && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mobile-input mt-1" />
            </div>
            <div>
              <Label>Food name</Label>
              <Input value={form.food_name} onChange={(e) => setForm({ ...form, food_name: e.target.value })} className="mobile-input mt-1" />
            </div>
            <div>
              <Label>Serving qty</Label>
              <Input type="number" value={form.serving_qty ?? 1} onChange={(e) => setForm({ ...form, serving_qty: Number(e.target.value) })} className="mobile-input mt-1" />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={form.serving_unit ?? 'serving'} onChange={(e) => setForm({ ...form, serving_unit: e.target.value })} className="mobile-input mt-1" />
            </div>
            <div>
              <Label>Calories</Label>
              <Input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: Number(e.target.value) })} className="mobile-input mt-1" />
            </div>
            <div>
              <Label>Protein (g)</Label>
              <Input type="number" value={form.protein_g} onChange={(e) => setForm({ ...form, protein_g: Number(e.target.value) })} className="mobile-input mt-1" />
            </div>
            <div>
              <Label>Carbs (g)</Label>
              <Input type="number" value={form.carbs_g} onChange={(e) => setForm({ ...form, carbs_g: Number(e.target.value) })} className="mobile-input mt-1" />
            </div>
            <div>
              <Label>Fat (g)</Label>
              <Input type="number" value={form.fat_g} onChange={(e) => setForm({ ...form, fat_g: Number(e.target.value) })} className="mobile-input mt-1" />
            </div>

            <div>
              <Label>Fiber (g)</Label>
              <Input type="number" value={form.fiber_g ?? 0} onChange={(e) => setForm({ ...form, fiber_g: Number(e.target.value) })} className="mobile-input mt-1" />
            </div>
            <div>
              <Label>Sugar (g)</Label>
              <Input type="number" value={form.sugar_g ?? 0} onChange={(e) => setForm({ ...form, sugar_g: Number(e.target.value) })} className="mobile-input mt-1" />
            </div>
            <div>
              <Label>Sodium (mg)</Label>
              <Input type="number" value={form.sodium_mg ?? 0} onChange={(e) => setForm({ ...form, sodium_mg: Number(e.target.value) })} className="mobile-input mt-1" />
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {presets.length === 0 && (
            <p className="text-white/60 text-sm">No presets yet. Create one above.</p>
          )}
          {presets.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-2 bg-white/10 rounded">
              <div className="text-sm">
                <p className="text-white font-medium">{p.name}</p>
                <p className="text-white/60">{p.food_name} • {p.calories} kcal • P{p.protein_g} C{p.carbs_g} F{p.fat_g}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" size="sm" onClick={() => onApply(p, multiplier)}>
                  Add {multiplier}x
                </Button>
                <Button variant="ghost" className="text-destructive" size="sm" onClick={() => remove(p.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>

        {creating && (
          <DialogFooter className="mt-4">
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={() => setCreating(false)}>Cancel</Button>
            <Button className="bg-gold hover:bg-gold/90 text-black" onClick={create}>Save preset</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}


