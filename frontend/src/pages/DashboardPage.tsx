import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Scale,
  Dumbbell,
  Flame,
  Beef,
  Footprints,
  Droplets,
  Ruler,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { api, formatNumber } from '../lib/api';
import type { DashboardData, AdaptiveResponse, UserProfile } from '../types';
import { Card, CardHeader } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { ProgressBar } from '../components/ProgressBar';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [adaptive, setAdaptive] = useState<AdaptiveResponse | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, a, p] = await Promise.all([
        api.get<DashboardData>('/stats/dashboard'),
        api.get<AdaptiveResponse>('/stats/adaptive'),
        api.get<UserProfile>('/users/profile'),
      ]);
      setData(d);
      setAdaptive(a);
      setProfile(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <DashboardSkeleton />;
  if (error) return (
    <div className="text-rose-600 p-4 rounded-xl bg-rose-50 dark:bg-rose-950 dark:text-rose-300 text-sm">
      {error}
      <button onClick={load} className="block mt-2 text-xs underline">Reintentar</button>
    </div>
  );
  if (!data) return null;

  const calTarget = profile?.calorieTarget ?? 1850;
  const protTarget = profile?.proteinTarget ?? 145;
  const waterTarget = profile?.waterTargetMl ?? 2000;
  const stepsTarget = profile?.stepsTarget ?? 7000;
  const rec = adaptive?.recommendation;
  const recColor =
    rec?.color === 'green'
      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      : rec?.color === 'yellow'
      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800';

  return (
    <div className="space-y-4 animate-slide-up pb-24">
      {/* Header */}
      <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Día del programa</p>
            <p className="text-4xl font-black leading-tight">
              {data.programDay}<span className="text-lg font-semibold text-blue-200">/{data.programTotal}</span>
            </p>
            <p className="text-blue-100 text-xs mt-1">Mes {Math.min(6, Math.ceil(data.programDay / 30))} · {data.programPct}% completado</p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-xs">Progreso</p>
            <div className="w-24 mt-1">
              <ProgressBar value={data.programDay} max={data.programTotal} color="green" showPct={false} />
            </div>
            <p className="text-xs mt-1.5 text-blue-200">{data.daysRemaining} días restantes</p>
          </div>
        </div>
      </Card>

      {/* Weight & waist cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Scale}
          label="Peso actual"
          value={`${formatNumber(data.currentWeight ?? 0, 1)} kg`}
          sub={
            data.weightChange !== null && (
              <span className={data.weightChange <= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {data.weightChange <= 0 ? <TrendingDown className="inline w-3 h-3" /> : <TrendingUp className="inline w-3 h-3" />}{' '}
                {formatNumber(data.weightChange, 1)} kg
              </span>
            )
          }
          status={data.weightChange !== null && data.weightChange <= 0 ? 'green' : 'neutral'}
        />
        <StatCard
          icon={Ruler}
          label="Cintura"
          value={data.waist ? `${formatNumber(data.waist, 1)} cm` : '—'}
          sub={
            data.waistChange30d !== null
              ? `Últ. 30d: ${formatNumber(data.waistChange30d, 1)} cm`
              : 'Registra medidas'
          }
          status={data.waistChange30d !== null && data.waistChange30d <= 0 ? 'green' : 'neutral'}
        />
      </div>

      {/* Nutrition quick view */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Calorías</p>
              <p className="font-bold text-sm">{formatNumber(data.caloriesConsumed)}<span className="text-slate-400 font-normal"> / {calTarget}</span></p>
            </div>
          </div>
          <ProgressBar value={data.caloriesConsumed} max={calTarget} color={data.caloriesConsumed <= calTarget ? 'green' : 'yellow'} />
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
              <Beef className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Proteína</p>
              <p className="font-bold text-sm">{formatNumber(data.proteinConsumed)}<span className="text-slate-400 font-normal"> / {protTarget}g</span></p>
            </div>
          </div>
          <ProgressBar value={data.proteinConsumed} max={protTarget} color={data.proteinConsumed >= protTarget ? 'green' : data.proteinConsumed > protTarget * 0.7 ? 'yellow' : 'red'} />
        </Card>
      </div>

      {/* Activity quick view */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <Footprints className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Pasos</p>
              <p className="font-bold text-sm">{formatNumber(data.steps)}<span className="text-slate-400 font-normal"> / {stepsTarget}</span></p>
            </div>
          </div>
          <ProgressBar value={data.steps} max={stepsTarget} color={data.steps >= stepsTarget ? 'green' : data.steps >= stepsTarget * 0.65 ? 'yellow' : 'red'} />
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-cyan-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Agua</p>
              <p className="font-bold text-sm">{formatNumber(data.waterMl / 1000, 1)}<span className="text-slate-400 font-normal"> / {formatNumber(waterTarget / 1000, 1)} L</span></p>
            </div>
          </div>
          <ProgressBar value={data.waterMl} max={waterTarget} color={data.waterMl >= waterTarget ? 'green' : data.waterMl >= waterTarget * 0.5 ? 'yellow' : 'red'} />
        </Card>
      </div>

      {/* Today's workout */}
      <Link to="/entrenamiento/hoy">
        <Card className="active:scale-[0.98] transition-transform touch-action-manipulation">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${data.workoutDoneToday ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'}`}>
                <Dumbbell className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">{data.todaysWorkout ?? 'Descanso'}</p>
                <p className="text-xs text-slate-500">
                  {data.workoutDoneToday ? 'Completado hoy ✓' : data.todaysWorkout ? 'Toca para registrar' : 'Recuperación y movilidad'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>
        </Card>
      </Link>

      {/* Adaptive recommendation */}
      {rec && (
        <Card className="space-y-2">
          <CardHeader title="Orientación adaptativa" subtitle="Basada en tus registros de los últimos 30 días" />
          <div className={`border rounded-xl p-3 ${recColor}`}>
            <p className="font-semibold flex items-center gap-1.5">{rec.title}</p>
            <p className="text-sm mt-1">{rec.message}</p>
          </div>
          {adaptive && (
            <p className="text-[10px] text-slate-400">{adaptive.disclaimer}</p>
          )}
        </Card>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 bg-gradient-to-br from-blue-300 to-blue-400 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        ))}
      </div>
      <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
    </div>
  );
}
