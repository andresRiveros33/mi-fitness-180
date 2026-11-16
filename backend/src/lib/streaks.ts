import type { PrismaClient, WeeklyStreak } from '@prisma/client';
import { TRAINING_DAYS_PER_WEEK, getProgramDay } from './program.js';

export interface WeeklyStreakView {
  weekStart: string;
  weekEnd: string;
  sessionsCompleted: number;
  sessionsTarget: number;
  completed: boolean;
  completedAt: string | null;
  streakAfter: number;
  isCurrent: boolean;
}

export interface WeekDayView {
  dow: number;
  name: string;
  completed: boolean;
  date: string;
}

export interface SessionBadge {
  id: string;
  title: string;
  message: string;
  emoji: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface StreakStatus {
  weekStart: string;
  weekEnd: string;
  sessionsCompleted: number;
  sessionsTarget: number;
  weekCompleted: boolean;
  currentStreak: number;
  bestStreak: number;
  isInvicto: boolean;
  totalWorkouts: number;
  weeksCompleted: number;
  weekDays: WeekDayView[];
  history: WeeklyStreakView[];
  badge: SessionBadge;
  motivation: { title: string; message: string };
}

// Los entrenamientos se guardan como fecha sin hora en UTC (medianoche), pero
// el usuario vive en su zona horaria. Para que un lunes no caiga en la semana
// anterior, todas las cuentas de racha se hacen con días UTC construidos a
// partir de la fecha calendario local.
const DAY_MS = 86400000;

function utcDateFromLocal(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/** Fechas de rachas: guardadas como medianoche UTC normalizada. */
function utcDateFromDb(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Fechas de entrenamientos: guardadas como medianoche local del servidor. */
function localDateFromDb(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function startOfWeekUTC(dateOnlyUTC: Date): Date {
  const offset = (dateOnlyUTC.getUTCDay() + 6) % 7;
  return addDaysUTC(dateOnlyUTC, -offset);
}

function isoUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Lunes de la semana de una fecha, normalizado a medianoche UTC. */
export function startOfWeek(date: Date | string): Date {
  if (typeof date === 'string') {
    const dateOnly = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
    return startOfWeekUTC(dateOnly);
  }
  return startOfWeekUTC(localDateFromDb(date));
}

export function endOfWeek(date: Date | string): Date {
  return addDaysUTC(startOfWeek(date), 6);
}

const MAX_WEEKS = 104;

const STARTER_BADGE: SessionBadge = {
  id: 'start-today',
  title: 'Empieza hoy',
  message: 'Tu primera sesión enciende la racha. Solo hay que dar el primer paso.',
  emoji: '🌱',
  tier: 'bronze',
};

const BADGES: Array<SessionBadge & { threshold: number }> = [
  {
    threshold: 1,
    id: 'first-step',
    title: 'Primer paso',
    message: 'El primer entrenamiento es el que más cuesta. Ya lo hiciste.',
    emoji: '🥇',
    tier: 'bronze',
  },
  {
    threshold: 3,
    id: 'consistency',
    title: 'Constancia',
    message: 'Tres sesiones registradas. La constancia empieza a notarse.',
    emoji: '🔥',
    tier: 'bronze',
  },
  {
    threshold: 6,
    id: 'solid-routine',
    title: 'Rutina sólida',
    message: 'Seis sesiones completadas. Tu cuerpo está entrando en ritmo.',
    emoji: '💪',
    tier: 'silver',
  },
  {
    threshold: 10,
    id: 'unstoppable',
    title: 'Imparable',
    message: 'Diez sesiones. La disciplina está ganando la partida.',
    emoji: '⚡',
    tier: 'silver',
  },
  {
    threshold: 15,
    id: 'conditioned',
    title: 'Acondicionado',
    message: 'Quince sesiones. Base construida y lista para subir el nivel.',
    emoji: '🛡️',
    tier: 'gold',
  },
  {
    threshold: 25,
    id: 'machine',
    title: 'Máquina',
    message: 'Veinticinco sesiones. Esto ya no es motivación, es un estilo de vida.',
    emoji: '🏆',
    tier: 'gold',
  },
  {
    threshold: 50,
    id: 'legend',
    title: 'Leyenda',
    message: 'Cincuenta sesiones. Tu historial habla por ti.',
    emoji: '👑',
    tier: 'platinum',
  },
  {
    threshold: 100,
    id: 'elite',
    title: 'Élite',
    message: 'Cien sesiones. Pocos llegan hasta aquí; tú sí.',
    emoji: '🌟',
    tier: 'platinum',
  },
];

const PERFECT_WEEK_BADGE: SessionBadge = {
  id: 'perfect-week',
  title: '¡Semana perfecta!',
  message: '3 de 3 entrenamientos completados. Racha semanal asegurada.',
  emoji: '🎯',
  tier: 'gold',
};

export function sessionBadge(totalWorkouts: number, weekCompleted: boolean): SessionBadge {
  if (weekCompleted) return PERFECT_WEEK_BADGE;
  if (totalWorkouts === 0) return STARTER_BADGE;
  let selected = BADGES[0];
  for (const badge of BADGES) {
    if (totalWorkouts >= badge.threshold) selected = badge;
  }
  const { threshold: _threshold, ...badge } = selected;
  return badge;
}

function motivationFor(sessionsCompleted: number, target: number, currentStreak: number) {
  const missing = Math.max(0, target - sessionsCompleted);
  if (target > 0 && sessionsCompleted >= target) {
    return {
      title: '¡Semana completa!',
      message:
        currentStreak > 1
          ? `Llevas ${currentStreak} semanas seguidas cumpliendo. ¡Mantén el invicto!`
          : 'Racha semanal asegurada. La próxima semana empieza de cero: ¡a defenderla!',
    };
  }
  if (sessionsCompleted === 0) {
    return {
      title: 'Arranca la semana',
      message: `Completa tus ${target} entrenamientos para encender la racha.`,
    };
  }
  return {
    title: `Te ${missing === 1 ? 'falta' : 'faltan'} ${missing} para la racha`,
    message:
      missing === 1
        ? 'Una sesión más y la semana queda completa. ¡Tú puedes!'
        : `Llevas ${sessionsCompleted} de ${target}. Sigue sumando sesiones esta semana.`,
  };
}

function weekKey(date: Date | string): string {
  return isoUTC(startOfWeek(date));
}

function mapWorkoutCounts(workouts: Array<{ date: Date }>) {
  const counts = new Map<string, { count: number; last: Date }>();
  for (const workout of workouts) {
    const key = weekKey(workout.date);
    const current = counts.get(key);
    const date = localDateFromDb(workout.date);
    if (!current) {
      counts.set(key, { count: 1, last: date });
    } else {
      current.count += 1;
      if (date.getTime() > current.last.getTime()) current.last = date;
    }
  }
  return counts;
}

function toWeeklyView(row: WeeklyStreak, currentWeekStart: Date): WeeklyStreakView {
  return {
    weekStart: isoUTC(row.weekStart),
    weekEnd: isoUTC(row.weekEnd),
    sessionsCompleted: row.sessionsCompleted,
    sessionsTarget: row.sessionsTarget,
    completed: row.completed,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    streakAfter: row.streakAfter,
    isCurrent: utcDateFromDb(row.weekStart).getTime() === currentWeekStart.getTime(),
  };
}

export async function refreshStreakProgress(prisma: PrismaClient): Promise<StreakStatus> {
  const today = utcDateFromLocal(new Date());
  const currentWeekStart = startOfWeekUTC(today);
  const currentWeekEnd = addDaysUTC(currentWeekStart, 6);
  const profile = await prisma.userProfile.findFirst();

  const allWorkouts = await prisma.workout.findMany({
    orderBy: { date: 'asc' },
    select: { date: true },
  });
  const currentWeekWorkouts = allWorkouts.filter(
    (workout) => weekKey(workout.date) === isoUTC(currentWeekStart)
  );

  // La racha se mide desde el arranque de la fase activa. Reiniciar la fase
  // desde ajustes reinicia el contador sin borrar el historial de entrenamientos.
  const programStart = startOfWeekUTC(
    utcDateFromLocal(profile?.phaseStartDate ?? profile?.startDate ?? new Date())
  );
  let cursor = programStart;
  const earliestAllowed = addDaysUTC(currentWeekStart, -7 * MAX_WEEKS);
  if (cursor.getTime() < earliestAllowed.getTime()) cursor = earliestAllowed;

  const counts = mapWorkoutCounts(allWorkouts);
  const weeks: Array<{
    start: Date;
    end: Date;
    count: number;
    last: Date | null;
    completed: boolean;
    streakAfter: number;
  }> = [];
  let runningStreak = 0;

  while (cursor.getTime() <= currentWeekStart.getTime()) {
    const start = cursor;
    const end = addDaysUTC(start, 6);
    const entry = counts.get(isoUTC(start));
    const sessionsCompleted = entry?.count ?? 0;
    const completed = sessionsCompleted >= TRAINING_DAYS_PER_WEEK;
    const isCurrentWeek = start.getTime() === currentWeekStart.getTime();

    // La semana en curso no rompe la racha mientras siga en juego: solo las
    // semanas cerradas sin 3/3 reinician el contador a cero.
    let streakAfter = runningStreak;
    if (completed) {
      runningStreak += 1;
      streakAfter = runningStreak;
    } else if (!isCurrentWeek) {
      runningStreak = 0;
      streakAfter = 0;
    }

    weeks.push({
      start,
      end,
      count: sessionsCompleted,
      last: entry?.last ?? null,
      completed,
      streakAfter,
    });

    cursor = addDaysUTC(start, 7);
  }

  for (const week of weeks) {
    await prisma.weeklyStreak.upsert({
      where: { weekStart: week.start },
      create: {
        weekStart: week.start,
        weekEnd: week.end,
        sessionsCompleted: week.count,
        sessionsTarget: TRAINING_DAYS_PER_WEEK,
        completed: week.completed,
        completedAt: week.completed ? (week.last ?? week.end) : null,
        streakAfter: week.streakAfter,
      },
      update: {
        weekEnd: week.end,
        sessionsCompleted: week.count,
        sessionsTarget: TRAINING_DAYS_PER_WEEK,
        completed: week.completed,
        completedAt: week.completed ? (week.last ?? week.end) : null,
        streakAfter: week.streakAfter,
      },
    });
  }

  const savedRows = await prisma.weeklyStreak.findMany({
    where: { weekStart: { gte: weeks[0]?.start ?? currentWeekStart } },
    orderBy: { weekStart: 'asc' },
  });
  // Blindaje ante filas antiguas guardadas con hora local: una sola fila por
  // semana calendario, quedándose con la actualización más reciente.
  const byWeek = new Map<string, WeeklyStreak>();
  for (const row of savedRows) {
    const key = isoUTC(row.weekStart);
    const previous = byWeek.get(key);
    if (!previous || row.updatedAt.getTime() >= previous.updatedAt.getTime()) {
      byWeek.set(key, row);
    }
  }
  const savedWeeks = Array.from(byWeek.values()).sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
  );
  const currentRow = savedWeeks.find(
    (row) => utcDateFromDb(row.weekStart).getTime() === currentWeekStart.getTime()
  );
  const currentWeekStreak = currentRow?.streakAfter ?? 0;
  const best = savedWeeks.reduce((max, row) => Math.max(max, row.streakAfter), 0);

  const totalWorkouts = allWorkouts.length;
  const weeksCompleted = savedWeeks.filter((row) => row.completed).length;
  const weekCompleted = currentRow?.completed ?? false;

  const progress = await prisma.streakProgress.findFirst();
  if (progress) {
    await prisma.streakProgress.update({
      where: { id: progress.id },
      data: {
        currentWeekStreak,
        bestWeekStreak: best,
        totalWorkouts,
        lastWeekStart: currentWeekStart,
      },
    });
  } else {
    await prisma.streakProgress.create({
      data: {
        currentWeekStreak,
        bestWeekStreak: best,
        totalWorkouts,
        lastWeekStart: currentWeekStart,
      },
    });
  }

  const completedDates = new Set(currentWeekWorkouts.map((w) => isoUTC(localDateFromDb(w.date))));
  const weekDays: WeekDayView[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const date = addDaysUTC(currentWeekStart, offset);
    const day = getProgramDay(date.getUTCDay());
    if (!day) continue;
    weekDays.push({
      dow: day.dow,
      name: day.name,
      completed: completedDates.has(isoUTC(date)),
      date: isoUTC(date),
    });
  }

  const sessionsCompleted = currentRow?.sessionsCompleted ?? 0;

  return {
    weekStart: isoUTC(currentWeekStart),
    weekEnd: isoUTC(currentWeekEnd),
    sessionsCompleted,
    sessionsTarget: TRAINING_DAYS_PER_WEEK,
    weekCompleted,
    currentStreak: currentWeekStreak,
    bestStreak: Math.max(best, currentWeekStreak),
    isInvicto: currentWeekStreak > 0,
    totalWorkouts,
    weeksCompleted,
    weekDays,
    history: savedWeeks.map((row) => toWeeklyView(row, currentWeekStart)),
    badge: sessionBadge(totalWorkouts, weekCompleted),
    motivation: motivationFor(sessionsCompleted, TRAINING_DAYS_PER_WEEK, currentWeekStreak),
  };
}
