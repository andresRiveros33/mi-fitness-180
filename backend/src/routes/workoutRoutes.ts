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

const DOW_SCHEDULE: Record<number, string | null> = {
  0: null, // Domingo
  1: 'Push', // Lunes
  2: null, // Martes
  3: 'Pull', // Miércoles
  4: null, // Jueves
  5: 'Legs', // Viernes
  6: null, // Sábado
};

function resolveWorkoutName(dow: number): string | null {
  return DOW_SCHEDULE[dow] ?? null;
}

function planToExercises(plan: ExercisePlan[], dbExercises: any[]) {
  return plan.map((p) => {
    const db = dbExercises.find((e) => e.name === p.name);
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

// "Entrenamiento de hoy" plan — accepts optional ?day=0..6 query param
router.get('/plan/today', async (req, res) => {
  try {
    const dayParam = req.query.day !== undefined ? Number(req.query.day) : null;
    const dow = dayParam !== null && dayParam >= 0 && dayParam <= 6 ? dayParam : new Date().getDay();
    const name = resolveWorkoutName(dow);
    if (!name) return res.json({ workout: null, exercises: [], dayOfWeek: dow });
    const plan = PROGRAM[name] ?? [];
    const dbExercises = await prisma.exercise.findMany({ where: { name: { in: plan.map((p) => p.name) } } });
    const exercises = planToExercises(plan, dbExercises);
    res.json({ workout: name, exercises, dayOfWeek: dow });
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
    const name = resolveWorkoutName(dow);
    if (!name) return res.json({ workout: null, exercises: [], dayOfWeek: dow });
    const plan = PROGRAM[name] ?? [];
    const dbExercises = await prisma.exercise.findMany({ where: { name: { in: plan.map((p) => p.name) } } });
    const exercises = planToExercises(plan, dbExercises);
    res.json({ workout: name, exercises, dayOfWeek: dow });
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

interface ExercisePlan {
  name: string;
  sets: number;
  min: number;
  max: number;
  unit: string;
  notes?: string;
  mediaUrl?: string;
  bodyweight?: boolean;
}

const PROGRAM: Record<string, ExercisePlan[]> = {
  Push: [
    { name: 'Flexiones de pecho (Push-ups)', sets: 3, min: 8, max: 15, unit: 'reps', bodyweight: true, notes: 'Cuerpo en línea recta, baja hasta que el pecho toque el suelo, empuja explosivo. Aprieta glúteos y abdomen.' },
    { name: 'Fondos en banco (Bench dips)', sets: 3, min: 8, max: 15, unit: 'reps', bodyweight: true, notes: 'Manos en el borde del banco, baja hasta 90° en codos, sube empujando. Piernas extendidas para más dificultad.' },
    { name: 'Press de banca plano con mancuernas', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Aprieta escápulas, baja controlado hasta el pecho, empuja sin bloquear codos.' },
    { name: 'Press militar de pie con mancuernas', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'De pie, abdomen firme, presiona en arco evitando arquear la zona baja. Baja hasta la barbilla.' },
    { name: 'Elevaciones laterales con banda elástica', sets: 3, min: 12, max: 20, unit: 'reps', notes: 'De pie sobre la banda, sube hasta paralelo al suelo, baja controlado. Sin impulso.' },
    { name: 'Extensión de tríceps con barra romana o banda', sets: 2, min: 10, max: 15, unit: 'reps', notes: 'Codos fijos junto a la cabeza, extiende completo, baja controlado.' },
  ],
  Pull: [
    { name: 'Remo horizontal con barra o mancuernas', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Espalda recta, jala hacia el abdomen, aprieta la espalda. Baja controlado.' },
    { name: 'Remo con banda elástica', sets: 3, min: 12, max: 20, unit: 'reps', notes: 'Siéntate con piernas extendidas, jala la banda hacia el abdomen manteniendo la espalda recta.' },
    { name: 'Pullover con mancuerna en banco', sets: 3, min: 10, max: 15, unit: 'reps', notes: 'Acostado sobre el banco, baja la mancuerna detrás de la cabeza con brazos casi rectos, vuelve sobre el pecho.' },
    { name: 'Vuelos posteriores / Pájaro con mancuernas', sets: 3, min: 12, max: 20, unit: 'reps', notes: 'Inclinado hacia adelante, abre los brazos en arco, aprieta los deltoides posteriores arriba.' },
    { name: 'Curl de bíceps con barra romana', sets: 3, min: 10, max: 15, unit: 'reps', notes: 'Codos pegados al torso, sube la barra sin balanceo, baja controlado.' },
    { name: 'Curl martillo con mancuernas', sets: 2, min: 10, max: 15, unit: 'reps', notes: 'Palmas enfrentadas, sube controlado, baja lento. Codos fijos.' },
    { name: 'Plancha abdominal', sets: 3, min: 30, max: 60, unit: 'seg', bodyweight: true, notes: 'Cuerpo en línea recta, contrae abdomen y glúteos. No hundas la cadera.' },
  ],
  Legs: [
    { name: 'Sentadilla libre (peso corporal)', sets: 3, min: 10, max: 20, unit: 'reps', bodyweight: true, notes: 'Desciende profundo con pecho arriba, rodillas alineadas con los pies. Empuja el suelo al subir.' },
    { name: 'Sentadilla Goblet con mancuerna', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Mancuerna al pecho, desciende profundo, rodillas alineadas con los pies. Mantén el pecho arriba.' },
    { name: 'Peso muerto rumano con barra', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Piernas ligeramente flexionadas, empuja caderas atrás, baja hasta sentir tensión en isquios. Espalda recta.' },
    { name: 'Zancadas / Lunges alternadas', sets: 3, min: 10, max: 20, unit: 'reps', bodyweight: true, notes: 'Paso largo, rodilla trasera cerca del suelo. Torso erguido. Alterna piernas.' },
    { name: 'Hip thrust en banco', sets: 3, min: 10, max: 15, unit: 'reps', bodyweight: true, notes: 'Espalda alta contra el banco, extiende la cadera completo, aprieta glúteos arriba 1 s.' },
    { name: 'Elevación de talones de pie', sets: 3, min: 12, max: 25, unit: 'reps', bodyweight: true, notes: 'De pie en el borde de un escalón, sube completo sobre puntas, baja estirando. Controla el movimiento.' },
  ],
};

export function workoutProgram(): Array<{ name: string; schedule: string; exercises: ExercisePlan[] }> {
  return [
    { name: 'Push', schedule: 'Lunes', exercises: PROGRAM['Push'] },
    { name: 'Pull', schedule: 'Miércoles', exercises: PROGRAM['Pull'] },
    { name: 'Legs', schedule: 'Viernes', exercises: PROGRAM['Legs'] },
  ];
}

async function recomputeNutritionFromWorkout(date: Date) {
  // Placeholder: workouts could add active calories later.
  void date;
}

export default router;