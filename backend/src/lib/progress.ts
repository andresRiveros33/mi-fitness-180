import type { PrismaClient } from '@prisma/client';
import { startOfDay, addDays, daysBetween, currentProgramDay, clampDay } from './calculations.js';

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

const WORKOUT_SCHEDULE = ['Tren superior A', 'Piernas A', 'Tren superior B', 'Piernas B'];
// Lunes, Martes, Jueves, Viernes

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

  // Next workout based on today's day of week
  const getNextWorkout = () => {
    const dayOfWeek = today.getDay(); // 0 sun .. 6 sat
    const map: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 2, 4: 3, 5: 4, 6: 4 };
    const idx = map[dayOfWeek];
    const schedule = idx >= 4 ? [] : WORKOUT_SCHEDULE.slice(idx, idx + 4);
    return schedule.includes(WORKOUT_SCHEDULE[0]) ? schedule[0] : WORKOUT_SCHEDULE[0];
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
    todaysWorkout: WORKOUT_SCHEDULE[(today.getDay() + 6) % 7], // temp
    nextWorkout: getNextWorkout(),
    steps: activity?.steps ?? 0,
    waterMl: nutrition?.waterMl ?? 0,
    workoutDoneToday: !!workout,
    nutritionLoggedToday: !!nutrition,
  };
}

export async function getProgramProgress(prisma: PrismaClient) {
  const profile = await prisma.userProfile.findFirst();
  const total = profile?.daysProgram ?? 180;
  const start = profile?.startDate ?? new Date();
  const startTime = startOfDay(start).getTime();
  const todayTime = startOfDay(new Date()).getTime();
  const day = Math.max(1, Math.round((todayTime - startTime) / 86400000) + 1);
  const clamped = Math.min(Math.max(day, 1), total);
  const currentMonth = Math.min(6, Math.max(1, Math.ceil((clamped - 1) / 30) + 1));
  return {
    day: clamped,
    total,
    pct: Math.round((clamped / total) * 100),
    currentMonth,
    startDate: start,
    daysRemaining: Math.max(0, total - clamped),
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