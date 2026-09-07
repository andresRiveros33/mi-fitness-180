import { Router } from 'express';
import { prisma } from '../index.js';
import { getDashboard, getProgramProgress } from '../lib/progress.js';
import { evaluateAdaptive, buildAdaptiveInput } from '../lib/adaptive.js';
import { isRecommendedDisclaimer, toISODate } from '../lib/calculations.js';

const router = Router();

router.get('/dashboard', async (_req, res) => {
  try {
    const dashboard = await getDashboard(prisma);
    const progress = await getProgramProgress(prisma);
    res.json({ ...progress, ...dashboard });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get('/adaptive', async (_req, res) => {
  try {
    const input = await buildAdaptiveInput(prisma, 30);
    const recommendation = evaluateAdaptive(input);
    res.json({
      recommendation,
      input,
      disclaimer: isRecommendedDisclaimer(),
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Personal records detection
router.get('/records', async (_req, res) => {
  try {
    const workouts = await prisma.workout.findMany({
      orderBy: { date: 'asc' },
      include: { exercises: { include: { exercise: true, sets: true } } },
    });
    const byExercise = new Map<number, { exercise: any; maxWeight: number; maxReps: number; maxVolume: number }>();
    for (const w of workouts) {
      for (const we of w.exercises) {
        if (!byExercise.has(we.exerciseId)) {
          byExercise.set(we.exerciseId, {
            exercise: we.exercise,
            maxWeight: 0,
            maxReps: 0,
            maxVolume: 0,
          });
        }
        const rec = byExercise.get(we.exerciseId)!;
        for (const s of we.sets) {
          rec.maxWeight = Math.max(rec.maxWeight, s.weightKg ?? 0);
          rec.maxReps = Math.max(rec.maxReps, s.reps ?? 0);
          rec.maxVolume = Math.max(rec.maxVolume, (s.weightKg ?? 0) * (s.reps ?? 0));
        }
      }
    }
    const records = Array.from(byExercise.values()).map((r) => ({
      exercise: r.exercise.name,
      category: r.exercise.category,
      maxWeight: r.maxWeight,
      maxReps: r.maxReps,
      maxVolume: r.maxVolume,
    }));
    res.json(records);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Calendar: month grid with workout + nutrition status
router.get('/calendar', async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0);
    const workoutRows = await prisma.workout.findMany({ where: { date: { gte: from, lte: to } }, orderBy: { date: 'asc' } });
    const activityRows = await prisma.dailyActivity.findMany({ where: { date: { gte: from, lte: to } }, orderBy: { date: 'asc' } });
    const nutritionRows = await prisma.nutritionEntry.findMany({ where: { date: { gte: from, lte: to } }, orderBy: { date: 'asc' } });
    const dayMap = new Map<string, any>();
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = toISODate(d);
      dayMap.set(key, { workout: null, activity: null, nutrition: null });
    }
    for (const w of workoutRows) dayMap.get(toISODate(w.date))!.workout = w;
    for (const a of activityRows) dayMap.get(toISODate(a.date))!.activity = a;
    for (const n of nutritionRows) dayMap.get(toISODate(n.date))!.nutrition = n;
    const days = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = toISODate(d);
      days.push({ date: key, ...dayMap.get(key) });
    }
    res.json({ year, month, days });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// 180-day progress
router.get('/progress180', async (_req, res) => {
  try {
    const progress = await getProgramProgress(prisma);
    res.json(progress);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;