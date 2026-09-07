import { Router } from 'express';
import { prisma } from '../index.js';
import {
  nutritionEntrySchema,
  mealSchema,
  foodSchema,
  idParamSchema,
  dateQuerySchema,
} from '../lib/validations.js';
import { startOfDay, macroFromFood } from '../lib/calculations.js';

const router = Router();

// ---------- Nutrition entry (daily totals) ----------

router.get('/entry', async (req, res) => {
  try {
    const { from, to } = dateQuerySchema.parse(req.query);
    const where: any = {};
    if (from) where.date = { gte: startOfDay(new Date(from)) };
    if (to) where.date = { ...where.date, lte: startOfDay(new Date(to)) };
    const entries = await prisma.nutritionEntry.findMany({ where, orderBy: { date: 'asc' } });
    res.json(entries);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post('/entry', async (req, res) => {
  try {
    const data = nutritionEntrySchema.parse(req.body);
    const date = startOfDay(new Date(data.date));
    const existing = await prisma.nutritionEntry.findUnique({ where: { date } });
    const entry = existing
      ? await prisma.nutritionEntry.update({ where: { date }, data: { ...data, date } })
      : await prisma.nutritionEntry.create({ data: { ...data, date } });
    res.json(entry);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// Recompute daily totals from meals
router.post('/recompute', async (req, res) => {
  try {
    const date = startOfDay(new Date((dateQuerySchema.parse(req.body || {}).from) || new Date().toISOString()));
    const dateISO = date.toISOString();
    const meals = await prisma.meal.findMany({
      where: { date: dateISO },
      include: { entries: { include: { food: true } } },
    });
    let calories = 0,
      proteinG = 0,
      carbsG = 0,
      fatsG = 0,
      fiberG = 0;
    for (const meal of meals) {
      for (const e of meal.entries) {
        const m = macroFromFood(
          e.food.kcalPer100,
          e.food.proteinPer100,
          e.food.carbsPer100,
          e.food.fatsPer100,
          e.food.fiberPer100,
          e.grams
        );
        calories += m.calories;
        proteinG += m.protein;
        carbsG += m.carbs;
        fatsG += m.fats;
        fiberG += m.fiber;
      }
    }
    const existing = await prisma.nutritionEntry.findUnique({ where: { date: dateISO } });
    const water = existing?.waterMl ?? 0;
    const entry = existing
      ? await prisma.nutritionEntry.update({
          where: { date: dateISO },
          data: { calories, proteinG, carbsG, fatsG, fiberG, waterMl: water },
        })
      : await prisma.nutritionEntry.create({
          data: { date: dateISO, calories, proteinG, carbsG, fatsG, fiberG, waterMl: 0 },
        });
    res.json({ entry, recomputed: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ---------- Foods (database) ----------

router.get('/foods', async (_req, res) => {
  try {
    const foods = await prisma.food.findMany({ orderBy: [{ isBasic: 'desc' }, { name: 'asc' }] });
    res.json(foods);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/foods', async (req, res) => {
  try {
    const data = foodSchema.parse(req.body);
    const food = await prisma.food.create({ data: { ...data, isBasic: false } });
    res.json(food);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.put('/foods/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = foodSchema.parse(req.body);
    const food = await prisma.food.update({ where: { id }, data });
    res.json(food);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.delete('/foods/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await prisma.food.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ---------- Meals ----------

router.get('/meals', async (req, res) => {
  try {
    const { from, to } = dateQuerySchema.parse(req.query);
    const where: any = {};
    if (from) where.date = { gte: startOfDay(new Date(from)) };
    if (to) where.date = { ...where.date, lte: startOfDay(new Date(to)) };
    const meals = await prisma.meal.findMany({
      where,
      orderBy: [{ date: 'asc' }, { name: 'asc' }],
      include: { entries: { include: { food: true } } },
    });
    res.json(meals);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post('/meals', async (req, res) => {
  try {
    const data = mealSchema.parse(req.body);
    const date = startOfDay(new Date(data.date));
    const existing = await prisma.meal.findFirst({
      where: { date, name: data.name },
      include: { entries: true },
    });
    let meal;
    if (existing) {
      // replace foods
      await prisma.mealFood.deleteMany({ where: { mealId: existing.id } });
      meal = await prisma.meal.update({
        where: { id: existing.id },
        data: { entries: { create: data.foods.map((f) => ({ foodId: f.foodId, grams: f.grams })) } },
        include: { entries: { include: { food: true } } },
      });
    } else {
      meal = await prisma.meal.create({
        data: {
          name: data.name,
          date,
          userId: 1,
          entries: { create: data.foods.map((f) => ({ foodId: f.foodId, grams: f.grams })) },
        },
        include: { entries: { include: { food: true } } },
      });
    }
    res.json(meal);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.delete('/meals/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await prisma.meal.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ---------- Suggestions "¿Qué puedo comer?" ----------

router.post('/suggest', async (req, res) => {
  try {
    const { caloriesGoal, proteinGoal, availableFoods } = req.body as {
      caloriesGoal: number;
      proteinGoal: number;
      availableFoods: number[];
    };
    if (!Array.isArray(availableFoods) || availableFoods.length === 0) {
      return res.status(400).json({ error: 'Selecciona al menos un alimento' });
    }
    const foods = await prisma.food.findMany({ where: { id: { in: availableFoods } } });
    if (foods.length === 0) return res.json({ suggestion: null, message: 'No se encontraron alimentos' });

    // Greedy: iterate to find a combination close to the target
    const result = buildSuggestion(foods, caloriesGoal, proteinGoal);
    res.json({
      suggestion: result,
      disclaimer:
        'Ayuda informativa. No sustituye asesoramiento médico o nutricional. Varía con la preparación y el alimento real.',
    });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

interface FoodLite {
  id: number;
  name: string;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatsPer100: number;
  fiberPer100: number;
}

function buildSuggestion(foods: FoodLite[], calTarget: number, proteinTarget: number) {
  // Each food starts at 100g, adjust greedily
  let amounts = new Array(foods.length).fill(0);
  let cal = 0;
  let protein = 0;
  const maxIter = 200;
  let i = 0;
  while (i < maxIter) {
    // Score foods by how much they help reach the protein target without blowing calories
    let bestIdx = -1;
    let bestScore = -Infinity;
    for (let f = 0; f < foods.length; f++) {
      const food = foods[f];
      const incCal = food.kcalPer100;
      const incProt = food.proteinPer100;
      const protShortfall = Math.max(0, proteinTarget - protein);
      const calHeadroom = Math.max(0, calTarget - cal);
      const protValue = protShortfall > 0 ? Math.min(incProt, protShortfall) : 0;
      const score = protValue - incCal / 200 + (calHeadroom > 0 ? 0 : -10);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = f;
      }
    }
    if (bestIdx < 0) break;
    const addG = 25;
    const nextCal = cal + (foods[bestIdx].kcalPer100 * addG) / 100;
    if (nextCal > calTarget * 1.15 && cal > 10) break;
    amounts[bestIdx] += addG;
    cal += nextCal;
    protein += (foods[bestIdx].proteinPer100 * addG) / 100;
    i++;
  }

  const lines = foods.map((f, idx) => ({
    foodId: f.id,
    name: f.name,
    grams: Math.round(amounts[idx] * 4) / 4,
    calories: Math.round((f.kcalPer100 * amounts[idx]) / 100),
    protein: Math.round((f.proteinPer100 * amounts[idx]) / 100),
  }));
  return {
    lines: lines.filter((l) => l.grams > 0),
    totals: {
      calories: Math.round(cal),
      protein: Math.round(protein * 10) / 10,
      targetCalories: calTarget,
      targetProtein: proteinTarget,
    },
  };
}

export default router;