'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Scan, X } from 'lucide-react';
import { BarcodeScanner } from '@/components/nutrition/barcode-scanner';

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
  const [showScanner, setShowScanner] = useState(false);

  const update = (key: keyof FoodPayload, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleAdd = async () => {
    await onSubmit(form);
    setOpen(false);
    setForm({ ...form, food_name: '', brand: '', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 });
  };

  const onBarcodeDetected = async (code: string) => {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
      const data = await res.json();
      const p = data.product;
      if (!p) {
        alert('No product found');
        setShowScanner(false);
        return;
      }
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
      setShowScanner(false);
    } catch (e) {
      console.error('Barcode lookup failed', e);
      alert('Barcode lookup failed');
      setShowScanner(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-black border border-white/20 text-white p-0 sm:p-6 rounded-none sm:rounded-xl w-screen sm:w-auto max-w-none sm:max-w-lg h-[100dvh] sm:h-auto overflow-y-auto">
        <div className="min-h-full flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between sm:hidden">
            <DialogTitle className="text-base">Add Food</DialogTitle>
            <Button type="button" size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={()=>setShowScanner(true)}>
              <Scan className="w-4 h-4 mr-2" /> Scan
            </Button>
          </div>
          <div className="hidden sm:block">
            <DialogHeader>
              <DialogTitle>Add Food</DialogTitle>
            </DialogHeader>
          </div>

          <div className="px-4 sm:px-0 pb-24">
            {showScanner && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/80 text-sm">Scan a barcode</p>
                  <Button type="button" size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={()=>setShowScanner(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <BarcodeScanner onDetected={onBarcodeDetected} onManualEntry={()=>setShowScanner(false)} />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 sm:pt-0">
              <div>
                <Label htmlFor="food" className="text-white/80 text-sm">Food name</Label>
                <Input id="food" value={form.food_name} onChange={(e) => update('food_name', e.target.value)} className="mobile-input mt-1 h-12 text-base" placeholder="e.g., Chicken breast" />
              </div>
              <div>
                <Label htmlFor="brand" className="text-white/80 text-sm">Brand (optional)</Label>
                <Input id="brand" value={form.brand ?? ''} onChange={(e) => update('brand', e.target.value)} className="mobile-input mt-1 h-12 text-base" placeholder="e.g., Generic" />
              </div>

              <div>
                <Label className="text-white/80 text-sm">Serving qty</Label>
                <Input type="number" inputMode="decimal" min={0} step="0.1" value={form.serving_qty ?? 1} onChange={(e) => update('serving_qty', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Unit</Label>
                <Input value={form.serving_unit ?? 'serving'} onChange={(e) => update('serving_unit', e.target.value)} className="mobile-input mt-1 h-12 text-base" />
              </div>

              <div>
                <Label className="text-white/80 text-sm">Calories</Label>
                <Input type="number" inputMode="numeric" min={0} step="1" value={form.calories} onChange={(e) => update('calories', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Protein (g)</Label>
                <Input type="number" inputMode="decimal" min={0} step="0.1" value={form.protein_g} onChange={(e) => update('protein_g', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Carbs (g)</Label>
                <Input type="number" inputMode="decimal" min={0} step="0.1" value={form.carbs_g} onChange={(e) => update('carbs_g', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Fat (g)</Label>
                <Input type="number" inputMode="decimal" min={0} step="0.1" value={form.fat_g} onChange={(e) => update('fat_g', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>

              <div>
                <Label className="text-white/80 text-sm">Fiber (g)</Label>
                <Input type="number" inputMode="decimal" min={0} step="0.1" value={form.fiber_g ?? 0} onChange={(e) => update('fiber_g', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Sugar (g)</Label>
                <Input type="number" inputMode="decimal" min={0} step="0.1" value={form.sugar_g ?? 0} onChange={(e) => update('sugar_g', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Sodium (mg)</Label>
                <Input type="number" inputMode="numeric" min={0} step="1" value={form.sodium_mg ?? 0} onChange={(e) => update('sodium_mg', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 sm:mt-6 bg-black/80 backdrop-blur px-4 py-3 border-t border-white/10 grid grid-cols-2 gap-2">
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 w-full" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gold hover:bg-gold/90 text-black w-full" onClick={handleAdd}>Add Food</Button>
          </DialogFooter>
        </div>
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
      <DialogContent className="bg-black border border-white/20 text-white p-0 sm:p-6 rounded-none sm:rounded-xl w-screen sm:w-auto max-w-none sm:max-w-lg h-[100dvh] sm:h-auto overflow-y-auto">
        <div className="min-h-full flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 sm:px-0">
            <DialogHeader>
              <DialogTitle>Edit Food</DialogTitle>
            </DialogHeader>
          </div>
          <div className="px-4 sm:px-0 pb-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 sm:pt-0">
              <div>
                <Label className="text-white/80 text-sm">Food name</Label>
                <Input value={form.food_name} onChange={(e) => update('food_name', e.target.value)} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Brand</Label>
                <Input value={form.brand ?? ''} onChange={(e) => update('brand', e.target.value)} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Serving qty</Label>
                <Input type="number" inputMode="decimal" value={form.serving_qty ?? 1} onChange={(e) => update('serving_qty', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Unit</Label>
                <Input value={form.serving_unit ?? 'serving'} onChange={(e) => update('serving_unit', e.target.value)} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Calories</Label>
                <Input type="number" inputMode="numeric" value={form.calories} onChange={(e) => update('calories', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Protein (g)</Label>
                <Input type="number" inputMode="decimal" value={form.protein_g} onChange={(e) => update('protein_g', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Carbs (g)</Label>
                <Input type="number" inputMode="decimal" value={form.carbs_g} onChange={(e) => update('carbs_g', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Fat (g)</Label>
                <Input type="number" inputMode="decimal" value={form.fat_g} onChange={(e) => update('fat_g', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Fiber (g)</Label>
                <Input type="number" inputMode="decimal" value={form.fiber_g ?? 0} onChange={(e) => update('fiber_g', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Sugar (g)</Label>
                <Input type="number" inputMode="decimal" value={form.sugar_g ?? 0} onChange={(e) => update('sugar_g', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Sodium (mg)</Label>
                <Input type="number" inputMode="numeric" value={form.sodium_mg ?? 0} onChange={(e) => update('sodium_mg', Number(e.target.value))} className="mobile-input mt-1 h-12 text-base" />
              </div>
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 sm:mt-6 bg-black/80 backdrop-blur px-4 py-3 border-t border-white/10 grid grid-cols-2 gap-2">
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 w-full" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gold hover:bg-gold/90 text-black w-full" onClick={save}>Save</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}


