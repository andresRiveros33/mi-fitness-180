import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api, formatDate } from '../lib/api';
import type { NutritionEntry, DailyActivity, Workout } from '../types';
import { Card, CardHeader } from '../components/Card';
import { PageHeader } from '../components/AppLayout';
import { useToast } from '../components/Toast';

type Range = 7 | 30 | 90 | 180;

export default function ChartsPage() {
  const { show } = useToast();
  const [range, setRange] = useState<Range>(30);
  const [nutrition, setNutrition] = useState<NutritionEntry[]>([]);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date();
      from.setDate(from.getDate() - (range === 180 ? 200 : range));
      const fromStr = from.toISOString().slice(0, 10);
      const [n, a, w] = await Promise.all([
        api.get<NutritionEntry[]>('/nutrition/entry', { from: fromStr }),
        api.get<DailyActivity[]>('/activity', { days: range === 180 ? 200 : range }),
        api.get<Workout[]>('/workouts'),
      ]);
      const cutoff = new Date(fromStr).getTime();
      setNutrition(n.filter((e) => new Date(e.date).getTime() >= cutoff));
      setActivity(a);
      setWorkouts(w.filter((wk) => new Date(wk.date).getTime() >= cutoff));
    } catch (e) {
      show((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [range, show]);

  useEffect(() => {
    load();
  }, [load]);

  const calData = useMemo(
    () => nutrition.map((e) => ({ date: formatDate(e.date), calorias: Math.round(e.calories), proteina: Math.round(e.proteinG) })),
    [nutrition]
  );

  const stepsData = useMemo(
    () => activity.map((a) => ({ date: formatDate(a.date), pasos: a.steps })),
    [activity]
  );

  const volumeData = useMemo(
    () =>
      workouts.map((w) => {
        const vol = w.exercises.reduce(
          (s, ex) => s + ex.sets.reduce((s2, st) => s2 + (st.weightKg || 0) * st.reps, 0),
          0
        );
        return { date: formatDate(w.date), name: w.name, volumen: Math.round(vol) };
      }),
    [workouts]
  );

  const adherence = useMemo(() => {
    const calTarget = 1850;
    if (nutrition.length === 0) return null;
    const onTarget = nutrition.filter((e) => Math.abs(e.calories - calTarget) <= calTarget * 0.15).length;
    return Math.round((onTarget / nutrition.length) * 100);
  }, [nutrition]);

  return (
    <div className="space-y-4">
      <PageHeader title="Gráficas de análisis" />
      <RangeButtons range={range} setRange={(r) => setRange(r as Range)} />

      {loading ? (
        <div className="text-center py-10 text-slate-500">Cargando…</div>
      ) : (
        <>
          {adherence !== null && (
            <Card>
              <CardHeader title="Adherencia calórica" subtitle={`% de días dentro de ±15% del objetivo en el periodo`} />
              <p className="text-3xl font-black text-blue-600">{adherence}%</p>
            </Card>
          )}

          <Card>
            <CardHeader title="Calorías" subtitle={`Objetivo ≈ 1850 kcal/día`} />
            {calData.length > 0 ? (
              <div className="h-52">
                <ResponsiveContainer>
                  <BarChart data={calData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 9 }} width={40} />
                    <Tooltip />
                    <Bar dataKey="calorias" fill="#2563eb" radius={[3, 3, 0, 0]} name="kcal" />
                    <Bar dataKey="proteina" fill="#10b981" radius={[3, 3, 0, 0]} name="g proteína" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-6 text-center">Sin registros en este periodo</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Pasos diarios" />
            {stepsData.length > 0 ? (
              <div className="h-52">
                <ResponsiveContainer>
                  <LineChart data={stepsData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 9 }} width={40} />
                    <Tooltip />
                    <Line type="monotone" dataKey="pasos" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-6 text-center">Sin registros de actividad</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Volumen de entrenamiento" subtitle="Peso × repeticiones por sesión" />
            {volumeData.length > 0 ? (
              <div className="h-52">
                <ResponsiveContainer>
                  <BarChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 9 }} width={44} />
                    <Tooltip />
                    <Bar dataKey="volumen" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="kg totales" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-6 text-center">Sin entrenamientos registrados</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function RangeButtons({ range, setRange }: { range: Range; setRange: (r: number) => void }) {
  const opts: { value: Range; label: string }[] = [
    { value: 7, label: '7 días' },
    { value: 30, label: '30 días' },
    { value: 90, label: '90 días' },
    { value: 180, label: '180 días' },
  ];
  return (
    <div className="flex gap-1">
      {opts.map((o) => (
        <button
          key={o.value}
          onClick={() => setRange(o.value)}
          className={`flex-1 py-2 rounded-xl text-sm font-medium ${
            range === o.value ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}