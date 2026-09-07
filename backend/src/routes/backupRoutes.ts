import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

const MODEL_MAP: Record<string, string> = {
  profiles: 'userProfile',
  weights: 'weightEntry',
  measurements: 'bodyMeasurement',
  foods: 'food',
  meals: 'meal',
  mealFoods: 'mealFood',
  nutrition: 'nutritionEntry',
  supplements: 'supplement',
  activity: 'dailyActivity',
  workouts: 'workout',
  workoutExercises: 'workoutExercise',
  workoutSets: 'workoutSet',
  photos: 'progressPhoto',
  monthlyGoals: 'monthlyGoal',
  recording: 'achievement',
  personalRecords: 'personalRecord',
};

// Export all data as JSON
router.get('/export', async (_req, res) => {
  try {
    const [
      profiles, weights, measurements, foods, meals, mealFoods,
      nutrition, supplements, activity, workouts, workoutExercises,
      workoutSets, photos, monthlyGoals, personalRecords,
    ] = await Promise.all([
      prisma.userProfile.findMany(),
      prisma.weightEntry.findMany(),
      prisma.bodyMeasurement.findMany(),
      prisma.food.findMany(),
      prisma.meal.findMany(),
      prisma.mealFood.findMany(),
      prisma.nutritionEntry.findMany(),
      prisma.supplement.findMany(),
      prisma.dailyActivity.findMany(),
      prisma.workout.findMany(),
      prisma.workoutExercise.findMany(),
      prisma.workoutSet.findMany(),
      prisma.progressPhoto.findMany(),
      prisma.monthlyGoal.findMany(),
      prisma.personalRecord.findMany(),
    ]);
    res.json({
      app: 'Mi Fitness 180',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        profiles, weights, measurements, foods, meals, mealFoods,
        nutrition, supplements, activity, workouts, workoutExercises,
        workoutSets, photos, monthlyGoals, personalRecords,
      },
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Import backup
router.post('/import', async (req, res) => {
  try {
    const { data } = req.body as any;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Backup inválido' });
    }
    const results: Record<string, number> = {};
    for (const [key, model] of Object.entries(MODEL_MAP)) {
      const rows = data[key];
      if (Array.isArray(rows) && rows.length > 0) {
        const client = prisma as any;
        const count = await client[model].count();
        if (count === 0) {
          await client[model].createMany({ data: rows });
        } else {
          // Upsert by id where possible
          for (const row of rows) {
            try {
              await client[model].upsert({
                where: { id: row.id },
                create: row,
                update: row,
              });
            } catch {
              // ignore conflicting rows
            }
          }
        }
        results[key] = rows.length;
      }
    }
    res.json({ ok: true, imported: results });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Export weights as CSV
router.get('/weights.csv', async (_req, res) => {
  try {
    const weights = await prisma.weightEntry.findMany({ orderBy: { date: 'asc' } });
    let csv = 'fecha,peso_kg\n';
    for (const w of weights) {
      const d = new Date(w.date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      csv += `${dateStr},${w.weightKg}\n`;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="peso.csv"');
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;