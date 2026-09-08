import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Flame,
  Beef,
  Wheat,
  Droplet,
  Apple,
  Plus,
  Trash2,
  Sparkles,
  GlassWater,
  X,
  Search,
} from 'lucide-react';
import { api, formatNumber, todayISO } from '../lib/api';
import type { Food, Meal, NutritionEntry, UserProfile } from '../types';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Field, Input, Select } from '../components/Input';
import { ProgressBar } from '../components/ProgressBar';
import { PageHeader } from '../components/AppLayout';
import { useToast } from '../components/Toast';

const MEAL_NAMES = ['Desayuno', 'Almuerzo', 'Cena', 'Merienda'] as const;

export default function NutritionPage() {
  const { show } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [entry, setEntry] = useState<NutritionEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [waterQuickAdd, setWaterQuickAdd] = useState(false);
  const [modal, setModal] = useState<{ meal: string; open: boolean }>({ meal: '', open: false });
  const [selectedFood, setSelectedFood] = useState('');
  const [grams, setGrams] = useState('100');
  const [search, setSearch] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestCal, setSuggestCal] = useState('600');
  const [suggestProt, setSuggestProt] = useState('45');
  const [suggestFoods, setSuggestFoods] = useState<number[]>([]);
  const [suggestion, setSuggestion] = useState<any>(null);

  const today = todayISO();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, f, m] = await Promise.all([
        api.get<UserProfile>('/users/profile'),
        api.get<Food[]>('/nutrition/foods'),
        api.get<Meal[]>('/nutrition/meals', { from: today, to: today }),
      ]);
      setProfile(p);
      setFoods(f);
      setMeals(m);
      const e = await api.get<NutritionEntry[]>('/nutrition/entry', { from: today, to: today });
      setEntry(e[0] ?? null);
    } catch (err) {
      show((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [show, today]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, meal) => {
        for (const fe of meal.entries) {
          const factor = fe.grams / 100;
          acc.calories += fe.food.kcalPer100 * factor;
          acc.protein += fe.food.proteinPer100 * factor;
          acc.carbs += fe.food.carbsPer100 * factor;
          acc.fats += fe.food.fatsPer100 * factor;
          acc.fiber += fe.food.fiberPer100 * factor;
        }
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
    );
  }, [meals]);

  const waterMl = entry?.waterMl ?? 0;
  const calTarget = profile?.calorieTarget ?? 1850;
  const protTarget = profile?.proteinTarget ?? 145;
  const fatMax = profile?.fatMaxTarget ?? 65;
  const fatMin = profile?.fatMinTarget ?? 55;
  const fiberTarget = profile?.fiberTarget ?? 25;
  const carbTarget = Math.max(0, Math.round((calTarget - totals.protein * 4 - totals.fats * 9) / 4));

  const submitMeal = async (mealName: string) => {
    if (!selectedFood) return;
    try {
      await api.post('/nutrition/meals', {
        date: today,
        name: mealName,
        foods: [{ foodId: Number(selectedFood), grams: Number(grams) || 0 }],
      });
      await api.post('/nutrition/recompute', { from: today });
      setModal({ meal: '', open: false });
      setSelectedFood('');
      setGrams('100');
      show(`${mealName} actualizado`);
      load();
    } catch (e) {
      show((e as Error).message, 'error');
    }
  };

  const removeFood = async (mealId: number, foodEntryId: number) => {
    try {
      const meal = meals.find((m) => m.id === mealId);
      if (!meal) return;
      const remaining = meal.entries.filter((e) => e.id !== foodEntryId);
      await api.post('/nutrition/meals', {
        date: today,
        name: meal.name,
        foods: remaining.map((e) => ({ foodId: e.food.id, grams: e.grams })),
      });
      await api.post('/nutrition/recompute', { from: today });
      show('Alimento eliminado');
      load();
    } catch (e) {
      show((e as Error).message, 'error');
    }
  };

  const addWater = async (ml: number) => {
    const newWater = Math.min(10000, waterMl + ml);
    try {
      await api.post('/nutrition/entry', { date: today, waterMl: newWater });
      setEntry((prev) => (prev ? { ...prev, waterMl: newWater } : ({ date: today, waterMl: newWater } as NutritionEntry)));
      setWaterQuickAdd(false);
      show(`Agua: ${formatNumber(newWater / 1000, 2)} L`);
    } catch (e) {
      show((e as Error).message, 'error');
    }
  };

  const filteredFoods = foods.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  const toggleSuggestFood = (id: number) => {
    setSuggestFoods((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const runSuggestion = async () => {
    setSuggestion(null);
    try {
      const s = await api.post('/nutrition/suggest', {
        caloriesGoal: Number(suggestCal) || 0,
        proteinGoal: Number(suggestProt) || 0,
        availableFoods: suggestFoods,
      });
      setSuggestion(s);
    } catch (e) {
      show((e as Error).message, 'error');
    }
  };

  const mealTotals = (meal: Meal) =>
    meal.entries.reduce(
      (acc, fe) => {
        const factor = fe.grams / 100;
        acc.calories += fe.food.kcalPer100 * factor;
        acc.protein += fe.food.proteinPer100 * factor;
        return acc;
      },
      { calories: 0, protein: 0 }
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up pb-24">
      <PageHeader title="Nutrición" />

      {/* Daily totals */}
      <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-emerald-100 text-sm">Calorías de hoy</p>
            <p className="text-3xl font-black">{formatNumber(totals.calories)}<span className="text-base font-medium"> / {calTarget}</span></p>
          </div>
          <div className="text-right">
            <p className="text-emerald-100 text-xs">{formatNumber(totals.protein)}g proteína</p>
            <p className="text-emerald-100 text-xs">{formatNumber(totals.carbs)}g carbs</p>
            <p className="text-emerald-100 text-xs">{formatNumber(totals.fats)}g grasas</p>
          </div>
        </div>
        <ProgressBar value={totals.calories} max={calTarget} color={totals.calories <= calTarget ? 'green' : 'yellow'} showPct={false} />
        <p className="text-[10px] text-emerald-200 mt-2">Fibra: {formatNumber(totals.fiber)} / {fiberTarget} g</p>
      </Card>

      {/* Macro breakdown mini cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-center">
          <Beef className="w-5 h-5 mx-auto text-rose-500 mb-1" />
          <p className="text-xs text-slate-500">Proteína</p>
          <p className="font-bold text-sm">{formatNumber(totals.protein)}/{protTarget}g</p>
          <div className="mt-1"><ProgressBar value={totals.protein} max={protTarget} color={totals.protein >= protTarget ? 'green' : totals.protein >= protTarget * 0.7 ? 'yellow' : 'red'} /></div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-center">
          <Wheat className="w-5 h-5 mx-auto text-amber-500 mb-1" />
          <p className="text-xs text-slate-500">Carbos</p>
          <p className="font-bold text-sm">{formatNumber(totals.carbs)}/{carbTarget}g</p>
          <div className="mt-1"><ProgressBar value={totals.carbs} max={Math.max(carbTarget, 1)} color="blue" /></div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-center">
          <Droplet className="w-5 h-5 mx-auto text-blue-500 mb-1" />
          <p className="text-xs text-slate-500">Grasas</p>
          <p className="font-bold text-sm">{formatNumber(totals.fats)}/{fatMax}g</p>
          <div className="mt-1"><ProgressBar value={totals.fats} max={fatMax} color="blue" /></div>
        </div>
      </div>

      {/* Water */}
      <Card>
        <CardHeader
          title="Agua"
          subtitle={`${formatNumber(waterMl / 1000, 2)} L de ${formatNumber((profile?.waterTargetMl ?? 2000) / 1000, 1)} L`}
          action={
            <Button variant="secondary" onClick={() => setWaterQuickAdd((v) => !v)} className="py-2 px-3 text-xs">
              <GlassWater className="w-4 h-4" /> Agregar
            </Button>
          }
        />
        <ProgressBar value={waterMl} max={profile?.waterTargetMl ?? 2000} color="blue" />
        {waterQuickAdd && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[250, 500, 1000].map((ml) => (
              <Button key={ml} variant="secondary" onClick={() => addWater(ml)} className="py-3 text-sm font-bold">
                +{formatNumber(ml / 1000, 1)} L
              </Button>
            ))}
          </div>
        )}
      </Card>

      {/* Suggest */}
      <Card>
        <CardHeader title="¿Qué puedo comer?" subtitle="Construye una comida aproximada a tu objetivo" action={<Button variant="secondary" onClick={() => setSuggestOpen(true)} className="py-2 px-3 text-xs"><Sparkles className="w-4 h-4" /> Sugerir</Button>} />
        <p className="text-xs text-slate-500">
          Selecciona alimentos disponibles y un objetivo de calorías/proteína.
        </p>
      </Card>

      {/* Meals */}
      {MEAL_NAMES.map((mealName) => {
        const meal = meals.find((m) => m.name === mealName);
        const t = meal ? mealTotals(meal) : { calories: 0, protein: 0 };
        return (
          <Card key={mealName}>
            <CardHeader
              title={mealName}
              subtitle={`${formatNumber(t.calories)} kcal · ${formatNumber(t.protein, 1)} g prot`}
              action={
                <Button variant="secondary" onClick={() => setModal({ meal: mealName, open: true })} className="py-2 px-3 text-xs">
                  <Plus className="w-4 h-4" /> Añadir
                </Button>
              }
            />
            {!meal || meal.entries.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Sin alimentos registrados</p>
            ) : (
              <div className="space-y-2">
                {meal.entries.map((fe) => (
                  <div key={fe.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                      <Apple className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{fe.food.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {formatNumber(fe.grams)}g · {formatNumber((fe.food.kcalPer100 * fe.grams) / 100)} kcal · {formatNumber((fe.food.proteinPer100 * fe.grams) / 100, 1)}g prot
                      </p>
                    </div>
                    <button
                      onClick={() => removeFood(meal.id, fe.id)}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-500 active:text-rose-600 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {/* Disclaimer */}
      <p className="text-[10px] text-slate-400 text-center px-4 pb-4">
        Las cifras son estimaciones. No constituyen prescripción médica.
      </p>

      {/* Add food modal - bottom sheet */}
      {modal.open && (
        <Modal onClose={() => setModal({ meal: '', open: false })}>
          <h2 className="font-bold text-lg mb-3">Añadir a {modal.meal}</h2>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar alimento…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-3 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1 mb-3">
            {filteredFoods.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-4">No se encontraron alimentos</p>
            ) : (
              filteredFoods.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFood(String(f.id))}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors touch-action-manipulation ${
                    selectedFood === String(f.id)
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 border border-transparent'
                  }`}
                >
                  <p className="font-medium">{f.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatNumber(f.kcalPer100)} kcal · {formatNumber(f.proteinPer100, 1)}g prot /100g
                  </p>
                </button>
              ))
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="Gramos">
              <Input type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} />
            </Field>
            <Field label="Seleccionado">
              <Input value={selectedFood ? foods.find((f) => f.id === Number(selectedFood))?.name ?? '' : ''} disabled />
            </Field>
          </div>
          <Button onClick={() => submitMeal(modal.meal)} disabled={!selectedFood} className="w-full py-4">
            Guardar en {modal.meal}
          </Button>
        </Modal>
      )}

      {/* Suggest modal - bottom sheet */}
      {suggestOpen && (
        <Modal onClose={() => setSuggestOpen(false)}>
          <h2 className="font-bold text-lg mb-1">Sugerencia de comida</h2>
          <p className="text-xs text-slate-500 mb-3">Selecciona los alimentos que tienes disponibles</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Objetivo kcal">
              <Input type="number" inputMode="numeric" value={suggestCal} onChange={(e) => setSuggestCal(e.target.value)} />
            </Field>
            <Field label="Objetivo proteína (g)">
              <Input type="number" inputMode="numeric" value={suggestProt} onChange={(e) => setSuggestProt(e.target.value)} />
            </Field>
          </div>
          <div className="max-h-52 overflow-y-auto space-y-1 mb-3">
            {foods.map((f) => (
              <label key={f.id} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm cursor-pointer active:bg-slate-100 dark:active:bg-slate-800 touch-action-manipulation">
                <input
                  type="checkbox"
                  checked={suggestFoods.includes(f.id)}
                  onChange={() => toggleSuggestFood(f.id)}
                  className="accent-blue-600 w-5 h-5"
                />
                <span>{f.name}</span>
              </label>
            ))}
          </div>
          <Button onClick={runSuggestion} disabled={suggestFoods.length === 0} className="w-full mb-3 py-4">
            <Sparkles className="w-4 h-4" /> Sugerir comida
          </Button>
          {suggestion?.suggestion && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950 p-4 space-y-2">
              {suggestion.suggestion.lines.map((l: any) => (
                <div key={l.foodId} className="text-sm flex justify-between">
                  <span>{l.name} · <b>{l.grams}g</b></span>
                  <span className="text-xs text-slate-500">{l.calories} kcal · {l.protein}g prot</span>
                </div>
              ))}
              <div className="border-t border-emerald-200 dark:border-emerald-800 pt-2 text-sm font-semibold flex justify-between">
                <span>Total</span>
                <span>{suggestion.suggestion.totals.calories} kcal / {suggestion.suggestion.totals.protein}g prot</span>
              </div>
              <p className="text-[10px] text-slate-500">{suggestion.disclaimer}</p>
            </div>
          )}
          {suggestion && !suggestion.suggestion && (
            <p className="text-xs text-amber-600 text-center py-2">No se pudo construir una combinación con los seleccionados.</p>
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto bottom-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full sm:hidden mx-auto" />
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
