'use client';

import { useEffect, useState } from 'react';
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  // String states for numeric inputs so users can delete/clear easily on mobile
  const [servingQtyStr, setServingQtyStr] = useState<string>('1');
  const [calStr, setCalStr] = useState<string>('0');
  const [proStr, setProStr] = useState<string>('0');
  const [carbStr, setCarbStr] = useState<string>('0');
  const [fatStr, setFatStr] = useState<string>('0');
  const [fiberStr, setFiberStr] = useState<string>('0');
  const [sugarStr, setSugarStr] = useState<string>('0');
  const [sodiumStr, setSodiumStr] = useState<string>('0');
  // Auto-scale macros when serving changes (after a barcode scan)
  const [autoScale, setAutoScale] = useState<boolean>(false);
  const [per100, setPer100] = useState<{ cal: number; pro: number; carb: number; fat: number; fiber: number; sugar: number; sodium: number }>({ cal: 0, pro: 0, carb: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });
  const [servingRefGrams, setServingRefGrams] = useState<number | null>(null);

  // Recalculate macros when serving qty changes and we are in auto-scale mode using per-100 values
  useEffect(() => {
    if (!autoScale) return;
    const unit = (form.serving_unit || '').toLowerCase();
    if (unit !== 'g' && unit !== 'ml') return;
    const qty = parseFloat((servingQtyStr || '0').replace(',', '.')) || 0;
    const scale = qty / 100;
    setCalStr(String(Math.round(per100.cal * scale)));
    setProStr(String(+(per100.pro * scale).toFixed(1)));
    setCarbStr(String(+(per100.carb * scale).toFixed(1)));
    setFatStr(String(+(per100.fat * scale).toFixed(1)));
    setFiberStr(String(+(per100.fiber * scale).toFixed(1)));
    setSugarStr(String(+(per100.sugar * scale).toFixed(1)));
    setSodiumStr(String(Math.round(per100.sodium * scale)));
  }, [servingQtyStr, form.serving_unit, autoScale, per100]);

  const update = (key: keyof FoodPayload, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleAdd = async () => {
    const toNum = (s: string, fallback = 0) => {
      if (s == null) return fallback;
      const v = parseFloat(String(s).replace(',', '.'));
      return Number.isFinite(v) ? v : fallback;
    };
    const payload: FoodPayload = {
      meal: form.meal,
      food_name: form.food_name,
      brand: form.brand,
      serving_qty: toNum(servingQtyStr, 1),
      serving_unit: form.serving_unit,
      calories: toNum(calStr, 0),
      protein_g: toNum(proStr, 0),
      carbs_g: toNum(carbStr, 0),
      fat_g: toNum(fatStr, 0),
      fiber_g: toNum(fiberStr, 0),
      sugar_g: toNum(sugarStr, 0),
      sodium_mg: Math.round(toNum(sodiumStr, 0)),
    };
    await onSubmit(payload);
    setOpen(false);
    setForm({ ...form, food_name: '', brand: '', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 });
    setServingQtyStr('1');
    setCalStr('0'); setProStr('0'); setCarbStr('0'); setFatStr('0'); setFiberStr('0'); setSugarStr('0'); setSodiumStr('0');
  };

  const handleSearchFood = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowAutocomplete(false);
      return;
    }
    setSearching(true);
    try {
      // Search UK products first
      const res = await fetch(`https://uk.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&tagtype_0=countries&tag_contains_0=contains&tag_0=united-kingdom`);
      const data = await res.json();
      setSearchResults(data.products || []);
      setShowAutocomplete(true);
    } catch (e) {
      console.error('Search failed', e);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleFoodNameChange = (value: string) => {
    update('food_name', value);

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout to search after user stops typing
    if (value.trim().length >= 3) {
      const timeout = setTimeout(() => {
        handleSearchFood(value);
      }, 500);
      setSearchTimeout(timeout);
    } else {
      setSearchResults([]);
      setShowAutocomplete(false);
    }
  };

  const handleSelectSearchResult = (p: any) => {
    populateFromProduct(p);
    setShowAutocomplete(false);
    setSearchResults([]);
  };

  const populateFromProduct = (p: any) => {
    const nutr = p.nutriments || {};
    // Set base per-100 values for scaling
    const basePer100 = {
      cal: Number(nutr['energy-kcal_100g']) || 0,
      pro: Number(nutr.proteins_100g) || 0,
      carb: Number(nutr.carbohydrates_100g) || 0,
      fat: Number(nutr.fat_100g) || 0,
      fiber: Number(nutr.fiber_100g) || 0,
      sugar: Number(nutr.sugars_100g) || 0,
      sodium: Math.round((Number(nutr.sodium_100g) || 0) * 1000),
    };
    setPer100(basePer100);

    // Try to parse serving size like "30 g" or "1 cup (240 ml)" → prefer grams/ml
    let qty = 1;
    let unit: string = 'serving';
    const ss = (p.serving_size || '').toString();
    const match = ss.match(/([0-9]+(?:[\.,][0-9]+)?)\s*(g|ml|kg|l)/i) || ss.match(/\(([^\)]*)\)/);
    if (match) {
      const txt = match[1] && match[2] ? `${match[1]} ${match[2]}` : (match[1] || '');
      const m2 = txt.match(/([0-9]+(?:[\.,][0-9]+)?)\s*(g|ml|kg|l)/i);
      if (m2) {
        qty = parseFloat(m2[1].replace(',', '.')) || 1;
        unit = m2[2].toLowerCase();
        if (unit === 'kg') { qty = qty * 1000; unit = 'g'; }
        if (unit === 'l') { qty = qty * 1000; unit = 'ml'; }
      }
    }
    // Prefer g/ml for clarity
    let nextUnit = unit === 'kg' ? 'g' : unit === 'l' ? 'ml' : unit;
    // Default to grams if we couldn't parse a concrete unit
    if (!nextUnit || nextUnit === 'serving') {
      nextUnit = 'g';
      qty = 100;
    }
    setForm((f) => ({
      ...f,
      food_name: p.product_name || f.food_name,
      brand: p.brands || f.brand,
      serving_unit: nextUnit || f.serving_unit,
    }));
    setServingQtyStr(String(qty));
    setServingRefGrams(nextUnit === 'g' ? qty : nextUnit === 'ml' ? qty : null);

    // If per-serving macros exist, use those, else scale per-100 by qty
    const calServ = Number(nutr['energy-kcal_serving']);
    const proServ = Number(nutr.proteins_serving);
    const carbServ = Number(nutr.carbohydrates_serving);
    const fatServ = Number(nutr.fat_serving);
    const fiberServ = Number(nutr.fiber_serving);
    const sugarServ = Number(nutr.sugars_serving);
    const sodiumServ = Number(nutr.sodium_serving) ? Math.round(Number(nutr.sodium_serving) * 1000) : undefined;

    const grams = nextUnit === 'g' ? qty : nextUnit === 'ml' ? qty : 0;
    const scale = grams > 0 ? grams / 100 : 1;
    setCalStr(String(Number.isFinite(calServ) && calServ > 0 ? Math.round(calServ) : Math.round(basePer100.cal * scale)));
    setProStr(String(Number.isFinite(proServ) && proServ > 0 ? proServ : +(basePer100.pro * scale).toFixed(1)));
    setCarbStr(String(Number.isFinite(carbServ) && carbServ > 0 ? carbServ : +(basePer100.carb * scale).toFixed(1)));
    setFatStr(String(Number.isFinite(fatServ) && fatServ > 0 ? fatServ : +(basePer100.fat * scale).toFixed(1)));
    setFiberStr(String(Number.isFinite(fiberServ) && fiberServ > 0 ? fiberServ : +(basePer100.fiber * scale).toFixed(1)));
    setSugarStr(String(Number.isFinite(sugarServ) && sugarServ > 0 ? sugarServ : +(basePer100.sugar * scale).toFixed(1)));
    setSodiumStr(String(Number.isFinite(sodiumServ as any) && (sodiumServ as any) > 0 ? sodiumServ : Math.round(basePer100.sodium * scale)));
    setAutoScale(true);
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
      populateFromProduct(p);
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
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 justify-start pr-12 sm:hidden">
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
              <div className="relative">
                <Label htmlFor="food" className="text-white/80 text-sm">Food name</Label>
                <Input
                  id="food"
                  value={form.food_name}
                  onChange={(e) => handleFoodNameChange(e.target.value)}
                  onFocus={() => form.food_name.length >= 3 && searchResults.length > 0 && setShowAutocomplete(true)}
                  onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                  className="mobile-input mt-1 h-12 text-base"
                  placeholder="Start typing to search... e.g., lidl chicken breast"
                />
                {searching && (
                  <div className="absolute right-3 top-9 text-white/50 text-xs">
                    Searching...
                  </div>
                )}
                {showAutocomplete && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-black/95 rounded-lg border border-white/20 max-h-80 overflow-y-auto shadow-xl">
                    {searchResults.map((product: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSearchResult(product)}
                        className="w-full text-left p-3 hover:bg-white/10 border-b border-white/10 last:border-b-0"
                      >
                        <div className="text-white text-sm font-semibold">{product.product_name || 'Unknown'}</div>
                        {product.brands && <div className="text-white/60 text-xs">{product.brands}</div>}
                        {product.nutriments && (
                          <div className="text-white/50 text-xs mt-1">
                            {product.nutriments['energy-kcal_100g'] ? `${Math.round(product.nutriments['energy-kcal_100g'])} kcal/100g` : 'No nutrition data'}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="brand" className="text-white/80 text-sm">Brand (optional)</Label>
                <Input id="brand" value={form.brand ?? ''} onChange={(e) => update('brand', e.target.value)} className="mobile-input mt-1 h-12 text-base" placeholder="e.g., Generic" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white/80 text-sm">Serving</Label>
                <div className="mt-1 grid grid-cols-[1fr_auto] gap-2 items-center">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={servingQtyStr}
                    onChange={(e)=>{
                      const v = (e.target.value || '').replace(/[^0-9.,]/g, '').replace(',', '.');
                      setServingQtyStr(v);
                    }}
                    className="mobile-input h-12 text-base w-full bg-white/10"
                    placeholder="1"
                  />
                  <select value={form.serving_unit ?? 'serving'} onChange={(e)=>{ update('serving_unit', e.target.value); /* keep autoscale if g/ml */ if (e.target.value === 'g' || e.target.value === 'ml') setAutoScale(true); }} className="h-12 text-base px-3 bg-black border border-white/30 rounded-md">
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="cup">cup</option>
                    <option value="tbsp">tbsp</option>
                    <option value="tsp">tsp</option>
                    <option value="serving">serving</option>
                    <option value="slice">slice</option>
                    <option value="piece">piece</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-white/80 text-sm">Calories</Label>
                <input type="text" inputMode="numeric" value={calStr} onChange={(e)=>{ setCalStr((e.target.value||'').replace(/[^0-9]/g,'')); setAutoScale(false); }} className="mobile-input mt-1 h-12 text-base w-full bg-white/10" placeholder="0" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Protein (g)</Label>
                <input type="text" inputMode="decimal" value={proStr} onChange={(e)=>{ setProStr((e.target.value||'').replace(/[^0-9.,]/g,'').replace(',', '.')); setAutoScale(false); }} className="mobile-input mt-1 h-12 text-base w-full bg-white/10" placeholder="0" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Carbs (g)</Label>
                <input type="text" inputMode="decimal" value={carbStr} onChange={(e)=>{ setCarbStr((e.target.value||'').replace(/[^0-9.,]/g,'').replace(',', '.')); setAutoScale(false); }} className="mobile-input mt-1 h-12 text-base w-full bg-white/10" placeholder="0" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Fat (g)</Label>
                <input type="text" inputMode="decimal" value={fatStr} onChange={(e)=>{ setFatStr((e.target.value||'').replace(/[^0-9.,]/g,'').replace(',', '.')); setAutoScale(false); }} className="mobile-input mt-1 h-12 text-base w-full bg-white/10" placeholder="0" />
              </div>

              <div>
                <Label className="text-white/80 text-sm">Fiber (g)</Label>
                <input type="text" inputMode="decimal" value={fiberStr} onChange={(e)=>{ setFiberStr((e.target.value||'').replace(/[^0-9.,]/g,'').replace(',', '.')); setAutoScale(false); }} className="mobile-input mt-1 h-12 text-base w-full bg-white/10" placeholder="0" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Sugar (g)</Label>
                <input type="text" inputMode="decimal" value={sugarStr} onChange={(e)=>{ setSugarStr((e.target.value||'').replace(/[^0-9.,]/g,'').replace(',', '.')); setAutoScale(false); }} className="mobile-input mt-1 h-12 text-base w-full bg-white/10" placeholder="0" />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Sodium (mg)</Label>
                <input type="text" inputMode="numeric" value={sodiumStr} onChange={(e)=>{ setSodiumStr((e.target.value||'').replace(/[^0-9]/g,'')); setAutoScale(false); }} className="mobile-input mt-1 h-12 text-base w-full bg-white/10" placeholder="0" />
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
                <select value={form.serving_unit ?? 'serving'} onChange={(e)=>update('serving_unit', e.target.value)} className="mt-1 h-12 text-base px-3 bg-black border border-white/30 rounded-md">
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="cup">cup</option>
                  <option value="tbsp">tbsp</option>
                  <option value="tsp">tsp</option>
                  <option value="serving">serving</option>
                  <option value="slice">slice</option>
                  <option value="piece">piece</option>
                </select>
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


