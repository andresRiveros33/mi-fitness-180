import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell, ChevronRight, Calendar, Trash2, TrendingUp } from 'lucide-react';
import { api, formatDate, formatNumber } from '../lib/api';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader } from '../components/AppLayout';
import { useToast } from '../components/Toast';

interface WorkoutListItem {
  id: number;
  date: string;
  name: string;
  durationMin: number;
  notes?: string | null;
  exercises: Array<{
    exercise: { name: string };
    sets: Array<{ weightKg: number; reps: number }>;
  }>;
}

interface ExerciseHistory {
  exercise: { id: number; name: string; category: string };
  sessions: Array<{
    date: string;
    workoutName: string;
    sets: Array<{ weightKg: number; reps: number }>;
  }>;
}

const PROGRAM_PREVIEW = [
  { name: 'Tren superior A', schedule: 'Lunes', count: 7, dow: 1 },
  { name: 'Piernas A', schedule: 'Martes', count: 6, dow: 2 },
  { name: 'Tren superior B', schedule: 'Jueves', count: 7, dow: 4 },
  { name: 'Piernas B', schedule: 'Viernes', count: 6, dow: 5 },
];

export default function WorkoutPage() {
  const { show } = useToast();
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([]);
  const [history, setHistory] = useState<ExerciseHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'programa' | 'historial' | 'progresion'>('programa');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, h] = await Promise.all([
        api.get<WorkoutListItem[]>('/workouts'),
        api.get<ExerciseHistory[]>('/workouts/history/exercises'),
      ]);
      setWorkouts(w);
      setHistory(h);
    } catch (e) {
      show((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    load();
  }, [load]);

  const deleteWorkout = async (id: number) => {
    if (!confirm('¿Eliminar este entrenamiento?')) return;
    try {
      await api.delete(`/workouts/${id}`);
      show('Entrenamiento eliminado');
      load();
    } catch (e) {
      show((e as Error).message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up pb-24">
      <PageHeader
        title="Entrenamiento"
        action={
          <Link to="/entrenamiento/hoy">
            <Button className="px-3 py-2 text-xs">
              <Dumbbell className="w-4 h-4" /> Hoy
            </Button>
          </Link>
        }
      />

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
        {[
          { key: 'programa' as const, label: 'Programa' },
          { key: 'historial' as const, label: 'Historial' },
          { key: 'progresion' as const, label: 'Progresión' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Program */}
      {activeTab === 'programa' && (
        <Card>
          <CardHeader title="Programa semanal" subtitle="4 días a la semana" />
          <div className="space-y-2">
            {PROGRAM_PREVIEW.map((p) => (
              <Link
                key={p.name}
                to={`/entrenamiento/hoy?day=${p.dow}`}
                className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-3 active:bg-slate-100 dark:active:bg-slate-700 touch-action-manipulation"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-[11px] text-slate-500">{p.schedule} · {p.count} ejercicios</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* History */}
      {activeTab === 'historial' && (
        <Card>
          <CardHeader title="Historial" subtitle={workouts.length === 0 ? 'Aún no hay registros' : `${workouts.length} registrados`} />
          {workouts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              Inicia tu primer entrenamiento desde el botón "Hoy".
            </div>
          ) : (
            <div className="space-y-2">
              {[...workouts].reverse().map((w) => {
                const totalVolume = w.exercises.reduce(
                  (s, ex) => s + ex.sets.reduce((s2, st) => s2 + st.weightKg * st.reps, 0),
                  0
                );
                return (
                  <div key={w.id} className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{w.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {formatDate(w.date)} · {w.durationMin} min · vol. {formatNumber(totalVolume)} kg
                      </p>
                    </div>
                    <button
                      onClick={() => deleteWorkout(w.id!)}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-500 active:text-rose-600 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Exercise progression */}
      {activeTab === 'progresion' && (
        <Card>
          <CardHeader title="Progresión por ejercicio" subtitle="Evolución de tu mejor serie" />
          {history.filter((h) => h.sessions.length >= 2).length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">Necesitas al menos 2 sesiones para ver progresión</p>
          ) : (
            <div className="space-y-3">
              {history
                .filter((h) => h.sessions.length >= 2)
                .map((h) => {
                  const last = h.sessions[h.sessions.length - 1];
                  const first = h.sessions[0];
                  const lastBest = Math.max(...last.sets.map((s) => s.weightKg * s.reps));
                  const firstBest = Math.max(...first.sets.map((s) => s.weightKg * s.reps));
                  const diff = lastBest - firstBest;
                  const bestWeight = Math.max(...h.sessions.map((s) => s.sets.reduce((m, st) => Math.max(m, st.weightKg), 0)));
                  return (
                    <div key={h.exercise.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        diff > 0 ? 'bg-emerald-100 dark:bg-emerald-900/50' : diff < 0 ? 'bg-rose-100 dark:bg-rose-900/50' : 'bg-slate-100 dark:bg-slate-800'
                      }`}>
                        <TrendingUp className={`w-5 h-5 ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-500' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{h.exercise.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {h.sessions.length} sesiones · mejor peso {formatNumber(bestWeight, 1)} kg
                        </p>
                      </div>
                      <span className={`text-xs font-bold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                        {diff > 0 ? '+' : ''}{formatNumber(diff, 0)} vol
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
