import { Router } from 'express';
import { prisma } from '../index.js';
import { workoutSchema, idParamSchema } from '../lib/validations.js';
import { startOfDay } from '../lib/calculations.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const workouts = await prisma.workout.findMany({
      orderBy: { date: 'desc' },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: 'asc' } },
          },
        },
      },
    });
    res.json(workouts);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const workout = await prisma.workout.findUnique({
      where: { id },
      include: {
        exercises: { include: { exercise: true, sets: { orderBy: { setNumber: 'asc' } } } },
      },
    });
    res.json(workout);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = workoutSchema.parse(req.body);
    const date = startOfDay(new Date(data.date));
    const existing = await prisma.workout.findUnique({ where: { date } });

    if (existing) {
      await prisma.workoutExercise.deleteMany({ where: { workoutId: existing.id } });
      const related = await prisma.workout.update({
        where: { date },
        data: {
          name: data.name,
          durationMin: data.durationMin,
          notes: data.notes ?? null,
          exercises: {
            create: data.exercises.map((ex) => ({
              exerciseId: ex.exerciseId,
              order: ex.order,
              sets: { create: ex.sets.map((s) => ({ ...s })) },
            })),
          },
        },
        include: { exercises: { include: { sets: true, exercise: true } } },
      });
      await recomputeNutritionFromWorkout(date);
      res.json(related);
      return;
    }

    const workout = await prisma.workout.create({
      data: {
        date,
        name: data.name,
        durationMin: data.durationMin,
        notes: data.notes ?? null,
        exercises: {
          create: data.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            order: ex.order,
            sets: {
              create: ex.sets.map((s) => ({ ...s })),
            },
          })),
        },
      },
      include: { exercises: { include: { sets: true, exercise: true } } },
    });
    res.json(workout);
  } catch (e) {
    console.error('POST /workouts', (e as Error).message);
    res.status(400).json({ error: (e as Error).message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await prisma.workout.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// "Entrenamiento de hoy" plan
router.get('/plan/today', async (_req, res) => {
  try {
    const dow = new Date().getDay(); // 0=Sun
    const schedule: Record<number, string | null> = {
      0: null,
      1: 'Tren superior A',
      2: 'Piernas A',
      3: null,
      4: 'Tren superior B',
      5: 'Piernas B',
      6: null,
    };
    const name = schedule[dow];
    if (!name) return res.json({ workout: null, exercises: [] });
    const plan = await prisma.exercise.findMany({ where: { name: { in: exerciseNamesFor(name) } } });
    res.json({ workout: name, exercises: plan });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Exercise history for progression
router.get('/history/exercises', async (_req, res) => {
  try {
    const workouts = await prisma.workout.findMany({
      orderBy: { date: 'asc' },
      include: {
        exercises: { include: { exercise: true, sets: true } },
      },
    });
    // Group by exercise id
    const map = new Map<number, any>();
    for (const w of workouts) {
      for (const we of w.exercises) {
        if (!map.has(we.exerciseId)) {
          map.set(we.exerciseId, { exercise: we.exercise, sessions: [] });
        }
        map.get(we.exerciseId).sessions.push({
          date: w.date,
          workoutName: w.name,
          sets: we.sets,
          totalVolume: we.sets.reduce((s: number, set: any) => s + (set.weightKg ?? 0) * set.reps, 0),
          bestSetWeight: we.sets.reduce((m: number, set: any) => Math.max(m, set.weightKg ?? 0), 0),
        });
      }
    }
    res.json(Array.from(map.values()));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

const PROGRAM: Record<string, string[]> = {
  'Tren superior A': ['Press de banca con mancuernas', 'Remo con mancuerna', 'Press militar sentado', 'Remo inclinado con mancuernas', 'Curl de bíceps', 'Extensión de tríceps', 'Plancha'],
  'Piernas A': ['Sentadilla goblet', 'Peso muerto rumano con mancuernas', 'Zancadas', 'Hip thrust con mancuerna', 'Elevación de pantorrillas', 'Dead bug'],
  'Tren superior B': ['Press inclinado con mancuernas', 'Remo a una mano', 'Flexiones', 'Elevaciones laterales', 'Pájaros (rear delt fly)', 'Curl martillo', 'Tríceps por encima de la cabeza'],
  'Piernas B': ['Sentadilla búlgara', 'Peso muerto rumano', 'Step-up al banco', 'Hip thrust', 'Pantorrillas', 'Plancha lateral'],
};

function exerciseNamesFor(workoutName: string): string[] {
  return PROGRAM[workoutName] ?? [];
}

async function recomputeNutritionFromWorkout(date: Date) {
  // Placeholder: workouts could add active calories later.
  void date;
}

export default router;