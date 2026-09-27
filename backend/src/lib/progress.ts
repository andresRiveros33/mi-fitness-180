import type { PrismaClient } from '@prisma/client';
import { startOfDay, addDays, daysBetween, currentProgramDay, clampDay } from './calculations.js';
import { CARDIO_DAY_NAMES, TRAINING_DAYS_PER_WEEK, getProgramDay } from './program.js';

export interface DashboardData {
  programDay: number;
  programTotal: number;
  programPct: number;
  currentWeight: number | null;
  weeklyAvgWeight: number | null;
  weightChange: number | null;
  waist: number | null;
  waistChange30d: number | null;
  caloriesConsumed: number;
  caloriesRemaining: number;
  proteinConsumed: number;
  proteinRemaining: number;
  todaysWorkout: string | null;
  nextWorkout: string | null;
  steps: number;
  waterMl: number;
  workoutDoneToday: boolean;
  nutritionLoggedToday: boolean;
}

// Torso A (Lunes), Pierna A (Martes), Cardio (Miércoles),
// Torso B (Jueves), Pierna B (Viernes)
function programWorkoutFor(dow: number): string | null {
  return getProgramDay(dow)?.name ?? null;
}

export async function getDashboard(prisma: PrismaClient): Promise<DashboardData> {
  const profile = await prisma.userProfile.findFirst();
  const today = startOfDay(new Date());
  const todayISO = today.toISOString();

  const programDay = profile ? clampDay(currentProgramDay(profile.startDate), profile.daysProgram) : 1;
  const programTotal = profile?.daysProgram ?? 180;

  const [lastWeight, weights, todayWaist, measurements, nutrition, activity, workout] =
    await Promise.all([
      prisma.weightEntry.findFirst({ orderBy: { date: 'desc' } }),
      prisma.weightEntry.findMany({ orderBy: { date: 'asc' } }),
      prisma.bodyMeasurement.findFirst({ orderBy: { date: 'desc' } }),
      prisma.bodyMeasurement.findMany({ orderBy: { date: 'asc' } }),
      prisma.nutritionEntry.findUnique({ where: { date: todayISO } }),
      prisma.dailyActivity.findUnique({ where: { date: todayISO } }),
      prisma.workout.findUnique({ where: { date: todayISO } }),
    ]);

  // Weekly average of weight: last 7 entries
  let weeklyAvg = null;
  if (weights.length > 0) {
    const last7 = weights.slice(-7);
    weeklyAvg = Math.round((last7.reduce((s, w) => s + w.weightKg, 0) / last7.length) * 100) / 100;
  }

  const weightChange = weights.length >= 2 ? weights[weights.length - 1].weightKg - weights[0].weightKg : null;

  let waistChange30d = null;
  const waistEntries = measurements.filter((m) => m.waistCm !== null);
  const monthAgo = addDays(today, -30).getTime();
  const recentWaist = waistEntries.filter((m) => new Date(m.date).getTime() >= monthAgo);
  if (recentWaist.length >= 2) {
    waistChange30d = Math.round((recentWaist[recentWaist.length - 1].waistCm! - recentWaist[0].waistCm!) * 10) / 10;
  } else if (waistEntries.length >= 2) {
    waistChange30d =
      Math.round((waistEntries[waistEntries.length - 1].waistCm! - waistEntries[0].waistCm!) * 10) / 10;
  }

  const caloriesConsumed = nutrition?.calories ?? 0;
  const caloriesRemaining = Math.max(0, (profile?.calorieTarget ?? 1850) - caloriesConsumed);
  const proteinConsumed = nutrition?.proteinG ?? 0;
  const proteinRemaining = Math.max(0, (profile?.proteinTarget ?? 145) - proteinConsumed);

  // Next workout: el día de entrenamiento que sigue (o de hoy si aún no se registró)
  const getNextWorkout = () => {
    const dow = today.getDay(); // 0 sun .. 6 sat
    const todaysName = programWorkoutFor(dow);
    if (todaysName && !workout) return todaysName;
    for (let i = 1; i <= 7; i++) {
      const d = (dow + i) % 7;
      const name = programWorkoutFor(d);
      if (name) return name;
    }
    return null;
  };

  return {
    programDay,
    programTotal,
    programPct: Math.round((programDay / programTotal) * 100),
    currentWeight: lastWeight?.weightKg ?? profile?.initialWeightKg ?? null,
    weeklyAvgWeight: weeklyAvg,
    weightChange: weightChange === null ? null : Math.round(weightChange * 10) / 10,
    waist: todayWaist?.waistCm ?? waistEntries[waistEntries.length - 1]?.waistCm ?? null,
    waistChange30d,
    caloriesConsumed,
    caloriesRemaining,
    proteinConsumed,
    proteinRemaining,
    todaysWorkout: programWorkoutFor(today.getDay()),
    nextWorkout: getNextWorkout(),
    steps: activity?.steps ?? 0,
    waterMl: nutrition?.waterMl ?? 0,
    workoutDoneToday: !!workout,
    nutritionLoggedToday: !!nutrition,
  };
}

// Bloque de fase activo. El nombre y la duración son parte del diseño del
// programa (código); la fecha de arranque vive en el perfil para poder reiniciar
// el contador de semanas sin desplegar ni tocar el día del programa de 180 días.
const ACTIVE_PHASE = {
  number: 2,
  name: 'Hipertrofia y Recomposición (Torso / Pierna)',
  weeks: 12,
};
const PHASE_DAYS = ACTIVE_PHASE.weeks * 7;

export async function getProgramProgress(prisma: PrismaClient) {
  const profile = await prisma.userProfile.findFirst();
  const total = profile?.daysProgram ?? 180;
  const start = profile?.startDate ?? new Date();
  const startTime = startOfDay(start).getTime();
  const todayTime = startOfDay(new Date()).getTime();
  const day = Math.max(1, Math.round((todayTime - startTime) / 86400000) + 1);
  const clamped = Math.min(Math.max(day, 1), total);
  const currentMonth = Math.min(6, Math.max(1, Math.ceil((clamped - 1) / 30) + 1));

  // Fase: arranca en phaseStartDate y dura ACTIVE_PHASE.weeks semanas.
  const phaseStart = startOfDay(profile?.phaseStartDate ?? new Date());
  const phaseStartTime = phaseStart.getTime();
  const phaseDay = Math.min(Math.max(Math.round((todayTime - phaseStartTime) / 86400000) + 1, 1), PHASE_DAYS);
  const phaseWeek = Math.min(ACTIVE_PHASE.weeks, Math.floor((phaseDay - 1) / 7) + 1);
  // Porcentaje de días completados con redondeo a la baja: el día 1 de la fase
  // marca 0% (el bloque arranca claramente en cero) y el último día marca 100%.
  const phasePct =
    phaseDay >= PHASE_DAYS ? 100 : Math.floor(((phaseDay - 1) / PHASE_DAYS) * 100);

  // Entrenamientos completados en la semana calendario actual (lunes a domingo),
  // contados solo desde el arranque de la fase: el progreso del bloque empieza
  // en cero aunque la semana en curso arranquera con días del programa anterior.
  // El cardio del miércoles no cuenta para la meta de 4 días de fuerza.
  const today = startOfDay(new Date());
  const weekStart = addDays(today, -((today.getDay() + 6) % 7));
  const countFrom = new Date(Math.max(weekStart.getTime(), phaseStartTime));
  const nextWeek = addDays(weekStart, 7);
  const weekWorkoutsDone = await prisma.workout.count({
    where: {
      date: { gte: countFrom, lt: nextWeek },
      name: { notIn: CARDIO_DAY_NAMES },
    },
  });

  return {
    day: clamped,
    total,
    pct: Math.round((clamped / total) * 100),
    currentMonth,
    startDate: start,
    daysRemaining: Math.max(0, total - clamped),
    phaseNumber: ACTIVE_PHASE.number,
    phaseName: ACTIVE_PHASE.name,
    phaseStartDate: phaseStart,
    phaseWeek,
    phaseWeeks: ACTIVE_PHASE.weeks,
    phasePct,
    weekWorkoutsDone,
    weekWorkoutsTotal: TRAINING_DAYS_PER_WEEK,
  };
}

// Weekly averages for weight
export async function getWeeklyWeightAverages(prisma: PrismaClient, days = 180) {
  const from = addDays(new Date(), -days);
  const weights = await prisma.weightEntry.findMany({
    where: { date: { gte: from } },
    orderBy: { date: 'asc' },
  });
  // group by ISO week
  const groups = new Map<string, { start: Date; values: number[] }>();
  for (const w of weights) {
    const d = new Date(w.date);
    const weekStart = addDays(d, -((d.getDay() + 6) % 7));
    const key = weekStart.toISOString().slice(0, 10);
    if (!groups.has(key)) groups.set(key, { start: weekStart, values: [] });
    groups.get(key)!.values.push(w.weightKg);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[1].start.getTime() - b[1].start.getTime())
    .map(([key, g]) => ({
      date: key,
      avg: Math.round((g.values.reduce((s, v) => s + v, 0) / g.values.length) * 100) / 100,
      min: Math.min(...g.values),
      max: Math.max(...g.values),
    }));
}