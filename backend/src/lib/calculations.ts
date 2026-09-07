// Sistema de cálculo para Mi Fitness 180

const DAY_MS = 86400000;

export function isoDateToDate(iso: string): Date {
  const d = new Date(iso);
  if (isNaN(d.getTime())) throw new Error('Fecha inválida');
  return d;
}

export function toISODate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date | string): Date {
  let date: Date;
  if (typeof d === 'string') {
    // "YYYY-MM-DD" should be treated as LOCAL date, not UTC
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    } else {
      date = new Date(d);
    }
  } else {
    date = new Date(d);
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d: Date | string, days: number): Date {
  const date = typeof d === 'string' ? new Date(d) : new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

export function daysBetween(a: Date | string, b: Date | string): number {
  const start = startOfDay(a).getTime();
  const end = startOfDay(b).getTime();
  return Math.round((end - start) / DAY_MS);
}

export function currentProgramDay(startDate: Date | string): number {
  const start = startOfDay(startDate).getTime();
  const now = startOfDay(new Date()).getTime();
  return Math.max(0, Math.round((now - start) / DAY_MS)) + 1;
}

export function clampDay(day: number, total = 180): number {
  return Math.min(Math.max(day, 1), total);
}

export function macroFromFood(
  kcalPer100: number,
  proteinPer100: number,
  carbsPer100: number,
  fatsPer100: number,
  fiberPer100: number,
  grams: number
) {
  const factor = grams / 100;
  return {
    calories: round1(kcalPer100 * factor),
    protein: round1(proteinPer100 * factor),
    carbs: round1(carbsPer100 * factor),
    fats: round1(fatsPer100 * factor),
    fiber: round1(fiberPer100 * factor),
  };
}

export function caloriesFromMacros(protein: number, carbs: number, fats: number): number {
  return protein * 4 + carbs * 4 + fats * 9;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round0(n: number): number {
  return Math.round(n);
}

// --- Averages ---

export function weeklyAverage(values: Array<{ date: Date | string; value: number }>): Array<{
  date: Date;
  value: number;
  entries: number;
}> {
  if (values.length === 0) return [];
  const sorted = [...values].sort(
    (a, b) => startOfDay(a.date).getTime() - startOfDay(b.date).getTime()
  );
  const weeks: Array<{ date: Date; sum: number; count: number }> = [];
  for (const v of sorted) {
    const day = startOfDay(v.date);
    const weekStart = addDays(day, -((day.getDay() + 6) % 7)); // Monday
    let week = weeks.find((w) => w.date.getTime() === weekStart.getTime());
    if (!week) {
      week = { date: weekStart, sum: 0, count: 0 };
      weeks.push(week);
    }
    week.sum += v.value;
    week.count += 1;
  }
  return weeks.map((w) => ({ date: w.date, value: round2(w.sum / w.count), entries: w.count }));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- Trend helpers (used by adaptive algorithm) ---

export function slopeOf(values: Array<{ date: Date; value: number }>): number {
  if (values.length < 2) return 0;
  const xMean = values.reduce((s, v, i) => s + i, 0) / values.length;
  const yMean = values.reduce((s, v) => s + v.value, 0) / values.length;
  let num = 0;
  let den = 0;
  values.forEach((v, i) => {
    num += (i - xMean) * (v.value - yMean);
    den += (i - xMean) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

// --- Deployable condition checks ---

export function isRecommendedDisclaimer(): string {
  return 'Orientación basada en tus datos. No sustituye asesoramiento médico o nutricional.';
}