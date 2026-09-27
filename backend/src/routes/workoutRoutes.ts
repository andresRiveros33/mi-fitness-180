import { Router } from 'express';
import { prisma } from '../index.js';
import { workoutSchema, idParamSchema } from '../lib/validations.js';
import { startOfDay } from '../lib/calculations.js';
import {
  PROGRAM,
  PROGRAM_EXERCISE_ALIASES,
  PROGRAM_EXERCISE_NAMES,
  getProgramDay,
  type ExercisePlan,
} from '../lib/program.js';

const router = Router();

/** Incluye ejercicios y series siempre en el orden en que se entrenaron. */
const workoutDetailInclude = {
  exercises: {
    orderBy: { order: 'asc' },
    include: { exercise: true, sets: { orderBy: { setNumber: 'asc' } } },
  },
} as const;

router.get('/', async (req, res) => {
  try {
    const workouts = await prisma.workout.findMany({
      orderBy: { date: 'desc' },
      include: workoutDetailInclude,
    });
    res.json(workouts);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Detalle de una sesión: ejercicios, series, peso (kg), reps, RIR y descanso.
router.get('/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const workout = await prisma.workout.findUnique({
      where: { id },
      include: workoutDetailInclude,
    });
    if (!workout) {
      res.status(404).json({ error: 'Entrenamiento no encontrado' });
      return;
    }
    res.json(workout);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// Resuelve a un Exercise existente o, si el id no está disponible (0 o null),
// lo busca o crea por nombre para que el guardado nunca falle por datos faltantes.
async function resolveExerciseId(ex: { exerciseId: number; name?: string }): Promise<number> {
  if (ex.exerciseId && ex.exerciseId > 0) return ex.exerciseId;
  const name = (ex.name ?? '').trim();
  if (!name) {
    throw new Error('Es necesario un ejercicio válido para guardar la serie');
  }
  const found = await prisma.exercise.findFirst({ where: { name } });
  if (found) return found.id;
  const created = await prisma.exercise.create({
    data: { name, category: 'general', isProgram: false },
  });
  return created.id;
}

router.post('/', async (req, res) => {
  try {
    const data = workoutSchema.parse(req.body);
    const date = startOfDay(new Date(data.date));
    const existing = await prisma.workout.findUnique({ where: { date } });

    const mapExercises = async () =>
      Promise.all(
        data.exercises.map(async (ex) => {
          const exerciseId = await resolveExerciseId(ex as { exerciseId: number; name?: string });
          return {
            exerciseId,
            order: ex.order,
            sets: { create: ex.sets.map((s) => ({ ...s })) },
          };
        })
      );

    if (existing) {
      await prisma.workoutExercise.deleteMany({ where: { workoutId: existing.id } });
      const related = await prisma.workout.update({
        where: { date },
        data: {
          name: data.name,
          durationMin: data.durationMin,
          notes: data.notes ?? null,
          exercises: { create: await mapExercises() },
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
          create: await mapExercises(),
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

function planToExercises(plan: ExercisePlan[], dbExercises: Array<{ id: number; name: string }>) {
  return plan.map((p) => {
    // Un ejercicio renombrado conserva su historial: se busca por el nombre
    // actual o por cualquiera de sus nombres anteriores.
    const db = dbExercises.find(
      (e) => e.name === p.name || (p.aliases?.length ? p.aliases.includes(e.name) : false)
    );
    return {
      name: p.name,
      targetSets: p.sets,
      min: p.min,
      max: p.max,
      unit: p.unit,
      notes: p.notes ?? null,
      mediaUrl: p.mediaUrl ?? null,
      bodyweight: p.bodyweight ?? false,
      exerciseId: db?.id ?? null,
    };
  });
}

async function loadPlanExercises(plan: ExercisePlan[]) {
  const names = [...plan.map((p) => p.name), ...plan.flatMap((p) => p.aliases ?? [])];
  const dbExercises = await prisma.exercise.findMany({ where: { name: { in: names } } });
  return planToExercises(plan, dbExercises);
}

// "Entrenamiento de hoy" plan — accepts optional ?day=0..6 query param
router.get('/plan/today', async (req, res) => {
  try {
    const dayParam = req.query.day !== undefined ? Number(req.query.day) : null;
    const dow = dayParam !== null && dayParam >= 0 && dayParam <= 6 ? dayParam : new Date().getDay();
    const day = getProgramDay(dow);
    if (!day) return res.json({ workout: null, focus: null, exercises: [], dayOfWeek: dow });
    const exercises = await loadPlanExercises(day.exercises);
    res.json({ workout: day.name, focus: day.focus, exercises, dayOfWeek: dow });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Semana completa: nombre, enfoque y ejercicios de cada día.
// Se declara antes de /plan/:day para que "week" no se interprete como día.
router.get('/plan/week', async (_req, res) => {
  try {
    const names = [...PROGRAM_EXERCISE_NAMES, ...PROGRAM_EXERCISE_ALIASES];
    const dbExercises = await prisma.exercise.findMany({ where: { name: { in: names } } });
    res.json({
      trainingDays: PROGRAM.filter((d) => !d.cardio).length,
      days: PROGRAM.map((d) => ({
        name: d.name,
        schedule: d.schedule,
        dow: d.dow,
        focus: d.focus,
        cardio: d.cardio ?? false,
        exercises: planToExercises(d.exercises, dbExercises),
      })),
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Plan for any specific day of the week (0=Sun .. 6=Sat)
router.get('/plan/:day', async (req, res) => {
  try {
    const dow = Number(req.params.day);
    if (isNaN(dow) || dow < 0 || dow > 6) {
      return res.status(400).json({ error: 'day must be 0-6' });
    }
    const day = getProgramDay(dow);
    if (!day) return res.json({ workout: null, focus: null, exercises: [], dayOfWeek: dow });
    const exercises = await loadPlanExercises(day.exercises);
    res.json({ workout: day.name, focus: day.focus, exercises, dayOfWeek: dow });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Exercise history for progression
router.get('/history/exercises', async (_req, res) => {
  try {
    const workouts = await prisma.workout.findMany({
      orderBy: { date: 'asc' },
      include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true, sets: true } } },
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

async function recomputeNutritionFromWorkout(date: Date) {
  // Placeholder: workouts could add active calories later.
  void date;
}

export default router;
