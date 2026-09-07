import type { PrismaClient } from '@prisma/client';

// Algoritmo adaptativo de Mi Fitness 180
// Analiza tendencias, NO reacciona a un único día.

export interface AdaptiveInput {
  weeklyWeightSlope: number; // kg/dia (negativo = pérdida)
  waistChange30d: number; // cm (negativo = reducción)
  avgSetVolumeSlope: number; // positivo = progreso
  nutritionAdherencePct: number; // 0-100
  avgWeeklyCalories: number;
  fatTrendPct: number | undefined; // % grasa en los últimos 30d
  restingTimeDays: number; // días desde la última sesión completa
}

export type RecommendationType =
  | 'adecuado'
  | 'recomposicion'
  | 'estancamiento'
  | 'deficit_agresivo'
  | 'subida_rapida'
  | 'sin_datos';

export interface Recommendation {
  type: RecommendationType;
  title: string;
  message: string;
  color: 'green' | 'yellow' | 'red';
}

const SLOW_LOSS = -0.004; // -0.1 kg / ~14 días
const FAST_LOSS = -0.013; // ~-1.8 kg/semana
const RAPID_GAIN = 0.009; // ~1.25 kg/semana

export function evaluateAdaptive(input: AdaptiveInput): Recommendation {
  const hasWeight = !isNaN(input.weeklyWeightSlope) && input.weeklyWeightSlope !== 0;
  const hasWaist = input.waistChange30d !== undefined && !isNaN(input.waistChange30d);
  const hasStrength = !isNaN(input.avgSetVolumeSlope);
  const hasNutrition = !isNaN(input.nutritionAdherencePct);

  // CASO 4: déficit demasiado agresivo
  if (hasWeight && input.weeklyWeightSlope < FAST_LOSS && hasStrength && input.avgSetVolumeSlope < 0) {
    return {
      type: 'deficit_agresivo',
      title: 'Déficit demasiado agresivo',
      message:
        'El peso baja muy rápido y tu rendimiento baja. El déficit podría ser demasiado agresivo. Revisa la ingesta y la recuperación.',
      color: 'red',
    };
  }

  // CASO 5: subida rápida
  if (hasWeight && input.weeklyWeightSlope > RAPID_GAIN && hasWaist && input.waistChange30d > 0) {
    return {
      type: 'subida_rapida',
      title: 'Revisa la ingesta energética',
      message:
        'El peso y la cintura aumentan rápidamente. Revisa la ingesta energética y la precisión del registro.',
      color: 'red',
    };
  }

  // CASO 1: pérdida lenta y cintura baja y fuerza se mantiene/aumenta
  if (
    hasWeight &&
    input.weeklyWeightSlope < 0 &&
    input.weeklyWeightSlope >= SLOW_LOSS &&
    hasWaist &&
    input.waistChange30d <= 0 &&
    hasStrength &&
    input.avgSetVolumeSlope >= 0
  ) {
    return {
      type: 'adecuado',
      title: 'Progreso adecuado',
      message: 'El peso baja lentamente, la cintura se reduce y la fuerza se mantiene. Mantén las calorías actuales.',
      color: 'green',
    };
  }

  // CASO 2: recomposición
  if (
    hasWeight &&
    Math.abs(input.weeklyWeightSlope) < Math.abs(SLOW_LOSS) &&
    hasWaist &&
    input.waistChange30d < 0 &&
    hasStrength &&
    input.avgSetVolumeSlope > 0
  ) {
    return {
      type: 'recomposicion',
      title: 'Posible recomposición corporal',
      message: 'Peso estable, cintura en descenso y fuerza aumentando. No es necesario reducir calorías.',
      color: 'green',
    };
  }

  // CASO 3: estancamiento (>= 3 semanas sin cambio)
  if (
    hasWeight &&
    Math.abs(input.weeklyWeightSlope) < Math.abs(SLOW_LOSS * 0.5) &&
    hasWaist &&
    Math.abs(input.waistChange30d) < 0.75 &&
    hasNutrition &&
    input.nutritionAdherencePct >= 70
  ) {
    return {
      type: 'estancamiento',
      title: 'Posible estancamiento',
      message:
        'Peso y cintura estables. Considera reducir 100–150 kcal/día o aumentar ligeramente la actividad. (No ambas a la vez.)',
      color: 'yellow',
    };
  }

  return {
    type: 'sin_datos',
    title: 'Registrando datos',
    message: 'Sigue registrando peso, medidas y entrenamientos para recibir una orientación adaptativa.',
    color: 'yellow',
  };
}

export async function buildAdaptiveInput(prisma: PrismaClient, days = 30): Promise<AdaptiveInput> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(today);
  from.setDate(from.getDate() - days);

  // Weight entries last 21 days
  const weights = await prisma.weightEntry.findMany({
    where: { date: { gte: from } },
    orderBy: { date: 'asc' },
  });

  // Measurements
  const measurements = await prisma.bodyMeasurement.findMany({
    where: { date: { gte: from } },
    orderBy: { date: 'asc' },
  });

  // Nutrition adherence
  const nutrition = await prisma.nutritionEntry.findMany({
    where: { date: { gte: from } },
  });

  // Workouts for training volume trend
  const workouts = await prisma.workout.findMany({
    where: { date: { gte: from } },
    include: {
      exercises: {
        include: { sets: true },
      },
    },
    orderBy: { date: 'asc' },
  });

  // Weekly weight slope
  let weeklyWeightSlope = 0;
  if (weights.length >= 4) {
    const avg1 = weights.slice(0, 4).reduce((s, w) => s + w.weightKg, 0) / 4;
    const avg2 = weights.slice(-4).reduce((s, w) => s + w.weightKg, 0) / 4;
    const spanDays = Math.max(
      1,
      (new Date(weights[weights.length - 1].date).getTime() -
        new Date(weights[0].date).getTime()) /
        86400000
    );
    weeklyWeightSlope = (avg2 - avg1) / spanDays;
  }

  // Waist change
  let waistChange30d = 0;
  if (measurements.length >= 2) {
    const waistValues = measurements.filter((m) => m.waistCm !== null);
    if (waistValues.length >= 2) {
      waistChange30d = (waistValues[waistValues.length - 1].waistCm ?? 0) - (waistValues[0].waistCm ?? 0);
    }
  }

  // Strength trend (avg volume per set over time)
  let avgSetVolumeSlope = 0;
  if (workouts.length >= 2) {
    const sessionVolumes = workouts.map((w) => {
      let total = 0;
      let sets = 0;
      for (const e of w.exercises) {
        for (const s of e.sets) {
          total += (s.weightKg ?? 0) * s.reps;
          sets++;
        }
      }
      return { date: new Date(w.date), volume: sets > 0 ? total / sets : 0 };
    });
    if (sessionVolumes.length >= 2) {
      const first = sessionVolumes.slice(0, 2).reduce((s, v) => s + v.volume, 0) / 2;
      const last = sessionVolumes.slice(-2).reduce((s, v) => s + v.volume, 0) / 2;
      avgSetVolumeSlope = (last - first) / Math.max(1, sessionVolumes.length - 1);
    }
  }

  // Nutrition adherence (calories within +/- 15% of target per day)
  let nutritionAdherencePct = 100;
  const daysWithNutrition = days;
  const profile = await prisma.userProfile.findFirst();
  if (profile && nutrition.length > 0) {
    const daysWithData = new Set(
      nutrition.map((n) => new Date(n.date).toISOString().slice(0, 10))
    );
    let onTarget = 0;
    let checked = 0;
    for (let i = 0; i < daysWithNutrition; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      const entry = nutrition.find((n) => new Date(n.date).toISOString().slice(0, 10) === key);
      if (entry) {
        checked++;
        if (Math.abs(entry.calories - profile.calorieTarget) <= profile.calorieTarget * 0.15) {
          onTarget++;
        }
      }
    }
    nutritionAdherencePct = checked > 0 ? (onTarget / checked) * 100 : 100;
  }

  return {
    weeklyWeightSlope,
    waistChange30d,
    avgSetVolumeSlope,
    nutritionAdherencePct,
    avgWeeklyCalories:
      nutrition.length > 0
        ? nutrition.reduce((s, n) => s + n.calories, 0) / Math.max(1, nutrition.length)
        : 0,
    fatTrendPct: undefined,
    restingTimeDays: 0,
  };
}