'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Scan } from 'lucide-react';

type FoodPayload = {
  meal: string;
  food_name: string;
  brand?: string | null;
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

export function FoodLogDialog({
  meal,
  onSubmit,
  trigger,
}: {
  meal: string;
  onSubmit: (payload: FoodPayload) => Promise<void> | void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FoodPayload>({
    meal,
    food_name: '',
    brand: '',
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

  const update = (key: keyof FoodPayload, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleAdd = async () => {
    await onSubmit(form);
    setOpen(false);
    setForm({ ...form, food_name: '', brand: '', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 });
  };

  const lookupBarcode = async () => {
    const code = prompt('Enter barcode');
    if (!code) return;
    try {
      // Prefer OpenFoodFacts for UK coverage
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
      const data = await res.json();
      const p = data.product;
      if (!p) return alert('No product found');
      const nutr = p.nutriments || {};
      setForm((f) => ({
        ...f,
        food_name: p.product_name || f.food_name,
        brand: p.brands || f.brand,
        serving_unit: p.serving_size || f.serving_unit,
        calories: Number(nutr['energy-kcal_100g']) || f.calories,
        protein_g: Number(nutr.proteins_100g) || f.protein_g,
        carbs_g: Number(nutr.carbohydrates_100g) || f.carbs_g,
        fat_g: Number(nutr.fat_100g) || f.fat_g,
        fiber_g: Number(nutr.fiber_100g) || f.fiber_g,
        sugar_g: Number(nutr.sugars_100g) || f.sugar_g,
        sodium_mg: Math.round((Number(nutr.sodium_100g) || 0) * 1000),
      }));
    } catch (e) {
      console.error('Barcode lookup failed', e);
      alert('Barcode lookup failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-black border border-white/20 text-white">
        <DialogHeader>
          <DialogTitle>Add Food</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 flex justify-end">
            <Button type="button" variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={lookupBarcode}>
              <Scan className="w-4 h-4 mr-2" /> Lookup barcode
            </Button>
          </div>
          <div>
            <Label htmlFor="food">Food name</Label>
            <Input id="food" value={form.food_name} onChange={(e) => update('food_name', e.target.value)} className="mobile-input mt-1" placeholder="e.g., Chicken breast" />
          </div>
          <div>
            <Label htmlFor="brand">Brand (optional)</Label>
            <Input id="brand" value={form.brand ?? ''} onChange={(e) => update('brand', e.target.value)} className="mobile-input mt-1" placeholder="e.g., Generic" />
          </div>

          <div>
            <Label>Serving qty</Label>
            <Input type="number" min={0} step="0.1" value={form.serving_qty ?? 1} onChange={(e) => update('serving_qty', Number(e.target.value))} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Unit</Label>
            <Input value={form.serving_unit ?? 'serving'} onChange={(e) => update('serving_unit', e.target.value)} className="mobile-input mt-1" />
          </div>

          <div>
            <Label>Calories</Label>
            <Input type="number" min={0} step="1" value={form.calories} onChange={(e) => update('calories', Number(e.target.value))} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Protein (g)</Label>
            <Input type="number" min={0} step="0.1" value={form.protein_g} onChange={(e) => update('protein_g', Number(e.target.value))} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Carbs (g)</Label>
            <Input type="number" min={0} step="0.1" value={form.carbs_g} onChange={(e) => update('carbs_g', Number(e.target.value))} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Fat (g)</Label>
            <Input type="number" min={0} step="0.1" value={form.fat_g} onChange={(e) => update('fat_g', Number(e.target.value))} className="mobile-input mt-1" />
          </div>

          <div>
            <Label>Fiber (g)</Label>
            <Input type="number" min={0} step="0.1" value={form.fiber_g ?? 0} onChange={(e) => update('fiber_g', Number(e.target.value))} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Sugar (g)</Label>
            <Input type="number" min={0} step="0.1" value={form.sugar_g ?? 0} onChange={(e) => update('sugar_g', Number(e.target.value))} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Sodium (mg)</Label>
            <Input type="number" min={0} step="1" value={form.sodium_mg ?? 0} onChange={(e) => update('sodium_mg', Number(e.target.value))} className="mobile-input mt-1" />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="bg-gold hover:bg-gold/90 text-black" onClick={handleAdd}>Add Food</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditFoodLogDialog({
  initial,
  trigger,
  onSave,
}: {
  initial: FoodPayload & { id: string };
  trigger: React.ReactNode;
  onSave: (id: string, updates: Partial<FoodPayload>) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FoodPayload>({ ...initial });
  const update = (key: keyof FoodPayload, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    await onSave(initial.id, form);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-black border border-white/20 text-white">
        <DialogHeader>
          <DialogTitle>Edit Food</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Food name</Label>
            <Input value={form.food_name} onChange={(e) => update('food_name', e.target.value)} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Brand</Label>
            <Input value={form.brand ?? ''} onChange={(e) => update('brand', e.target.value)} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Serving qty</Label>
            <Input type="number" value={form.serving_qty ?? 1} onChange={(e) => update('serving_qty', Number(e.target.value))} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Unit</Label>
            <Input value={form.serving_unit ?? 'serving'} onChange={(e) => update('serving_unit', e.target.value)} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Calories</Label>
            <Input type="number" value={form.calories} onChange={(e) => update('calories', Number(e.target.value))} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Protein (g)</Label>
            <Input type="number" value={form.protein_g} onChange={(e) => update('protein_g', Number(e.target.value))} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Carbs (g)</Label>
            <Input type="number" value={form.carbs_g} onChange={(e) => update('carbs_g', Number(e.target.value))} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Fat (g)</Label>
            <Input type="number" value={form.fat_g} onChange={(e) => update('fat_g', Number(e.target.value))} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Fiber (g)</Label>
            <Input type="number" value={form.fiber_g ?? 0} onChange={(e) => update('fiber_g', Number(e.target.value))} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Sugar (g)</Label>
            <Input type="number" value={form.sugar_g ?? 0} onChange={(e) => update('sugar_g', Number(e.target.value))} className="mobile-input mt-1" />
          </div>
          <div>
            <Label>Sodium (mg)</Label>
            <Input type="number" value={form.sodium_mg ?? 0} onChange={(e) => update('sodium_mg', Number(e.target.value))} className="mobile-input mt-1" />
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="bg-gold hover:bg-gold/90 text-black" onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


