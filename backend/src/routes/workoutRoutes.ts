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

const DOW_SCHEDULE: Record<number, string | null> = {
  0: null, // Domingo
  1: 'Tren superior A', // Lunes
  2: 'Piernas A', // Martes
  3: null, // Miércoles
  4: 'Tren superior B', // Jueves
  5: 'Piernas B', // Viernes
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
}

const PROGRAM: Record<string, ExercisePlan[]> = {
  'Tren superior A': [
    { name: 'Press de banca con mancuernas', sets: 3, min: 6, max: 10, unit: 'reps', notes: 'Aprieta escápulas, baja controlado hasta pecho, empuja explosivo.' },
    { name: 'Remo con mancuerna', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Espalda recta, codo cerca del cuerpo, aprieta la espalda arriba.' },
    { name: 'Dominadas / jalón asistido', sets: 3, min: 0, max: 0, unit: 'max', notes: 'Máximas repeticiones posibles. Usa máquina asistida o banda si es necesario. Agarre prono, controla la bajada.' },
    { name: 'Press militar sentado', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Espalda recta contra el respaldo, presiona en arco ligero, baja hasta barbilla.' },
    { name: 'Curl de bíceps', sets: 2, min: 10, max: 15, unit: 'reps', notes: 'Codos pegados al torso, movimiento controlado sin balanceo.' },
    { name: 'Extensión de tríceps', sets: 2, min: 10, max: 15, unit: 'reps', notes: 'Codos fijos, extiende completo, baja controlado.' },
    { name: 'Plancha', sets: 3, min: 30, max: 60, unit: 'seg', notes: 'Cuerpo en línea recta, contrae abdomen y glúteos. No hundas la cadera.' },
  ],
  'Piernas A': [
    { name: 'Sentadilla goblet', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Mancuerna al pecho, descente profundo, rodillas alineadas con pies. Pecho arriba.' },
    { name: 'Peso muerto rumano con mancuernas', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Piernas ligeramente flexionadas, empuja caderas atrás, baja hasta sentir tensión en isquios. Espalda recta.' },
    { name: 'Zancadas', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Paso largo, rodilla trasera cerca del suelo. Mantén torso erguido. Alternar piernas.' },
    { name: 'Hip thrust con mancuerna', sets: 3, min: 10, max: 15, unit: 'reps', notes: 'Espalda alta contra banco, extiende cadera completo, aprieta glúteos arriba 1s.' },
    { name: 'Elevación de pantorrillas', sets: 3, min: 12, max: 20, unit: 'reps', notes: 'De pie en borde de escalón, sube completo, baja estirando. Controla el movimiento.' },
    { name: 'Dead bug', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Espalda baja pegada al suelo, extiende brazo y pierna opuestos. Controla la respiración.' },
  ],
  'Tren superior B': [
    { name: 'Press inclinado con mancuernas', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Banco a 30-45°, baja controlado hasta pecho, empuja en ángulo. Aprieta escápulas.' },
    { name: 'Fondos en paralelas o banco', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Baja hasta 90° en codos, sube empujando. Inclínate ligeramente hacia adelante para pecho.' },
    { name: 'Remo a una mano', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Apoya mano y rodilla en banco, rema la mancuerna hacia la cadera. Espalda recta.' },
    { name: 'Elevaciones laterales', sets: 3, min: 12, max: 20, unit: 'reps', notes: 'Brazos casi rectos, sube hasta paralelo al suelo, baja controlado. Sin impulso.' },
    { name: 'Pájaros / rear delt fly', sets: 2, min: 12, max: 20, unit: 'reps', notes: 'Inclinado hacia adelante, abre brazos en arco, aprieta deltoides posteriores arriba.' },
    { name: 'Curl martillo', sets: 2, min: 10, max: 15, unit: 'reps', notes: 'Palmas enfrentadas, sube controlado, baja lento. Codos fijos.' },
    { name: 'Tríceps por encima de la cabeza', sets: 2, min: 10, max: 15, unit: 'reps', notes: 'Brazo vertical junto a la oreja, extiende el codo. Mantén el codo fijo.' },
  ],
  'Piernas B': [
    { name: 'Sentadilla búlgara', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Pie trasero en banco, baja hasta muslo paralelo. Rodilla delantera alineada. Controla el equilibrio.' },
    { name: 'Peso muerto rumano', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Mancuernas al frente de piernas, empuja caderas atrás. Baja hasta donde mantengas espalda recta.' },
    { name: 'Step-up al banco', sets: 3, min: 8, max: 12, unit: 'reps', notes: 'Sube con pierna delantera, empuja la cadera. Baja controlado. Alterna piernas.' },
    { name: 'Hip thrust', sets: 3, min: 10, max: 15, unit: 'reps', notes: 'Espalda alta en banco, empuja cadera arriba, aprieta glúteos. Pies al ancho de caderas.' },
    { name: 'Pantorrillas', sets: 3, min: 12, max: 20, unit: 'reps', notes: 'De pie en borde de escalón, sube sobre puntas, baja estirando. Rango completo.' },
    { name: 'Plancha lateral', sets: 3, min: 30, max: 45, unit: 'seg', notes: 'Cuerpo en línea recta de lado, cadera elevada. Contrae oblicuos. Alternar lados.' },
  ],
};

export function workoutProgram(): Array<{ name: string; schedule: string; exercises: ExercisePlan[] }> {
  return [
    { name: 'Tren superior A', schedule: 'Lunes', exercises: PROGRAM['Tren superior A'] },
    { name: 'Piernas A', schedule: 'Martes', exercises: PROGRAM['Piernas A'] },
    { name: 'Tren superior B', schedule: 'Jueves', exercises: PROGRAM['Tren superior B'] },
    { name: 'Piernas B', schedule: 'Viernes', exercises: PROGRAM['Piernas B'] },
  ];
}

async function recomputeNutritionFromWorkout(date: Date) {
  // Placeholder: workouts could add active calories later.
  void date;
}

export default router;