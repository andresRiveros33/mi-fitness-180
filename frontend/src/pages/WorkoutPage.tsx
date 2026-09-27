import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell, ChevronRight, Calendar, Trash2, TrendingUp, Clock, Layers, Weight, Gauge, Timer, StickyNote, Bike, ChevronDown } from 'lucide-react';
import { api, formatDate, formatNumber } from '../lib/api';
import {
  getWorkoutHistory,
  removeWorkoutFromHistory,
  saveWorkoutHistory,
} from '../lib/offlineStore';
import type { Workout } from '../types';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/AppLayout';
import { useToast } from '../components/Toast';

interface ExerciseHistory {
  exercise: { id: number; name: string; category: string };
  sessions: Array<{
    date: string;
    workoutName: string;
    sets: Array<{ weightKg: number; reps: number }>;
  }>;
}

interface PlanExercise {
  name: string;
  targetSets: number;
  min: number;
  max: number;
  unit: string;
  bodyweight: boolean;
  exerciseId: number | null;
}

interface ProgramDay {
  name: string;
  schedule: string;
  dow: number;
  focus: string;
  cardio: boolean;
  exercises: PlanExercise[];
}

interface WeekProgram {
  trainingDays: number;
  days: ProgramDay[];
}

function totalVolume(workout: Workout): number {
  return workout.exercises.reduce(
    (acc, ex) => acc + ex.sets.reduce((a, set) => a + (set.weightKg ?? 0) * (set.reps ?? 0), 0),
    0
  );
}

function unitSuffix(unit: string | undefined): string {
  if (unit === 'min') return 'min';
  if (unit === 'seg') return 's';
  return '';
}

/** Pesos decimales con decimales, enteros sin ellos. */
function formatKg(kg: number): string {
  return Number.isInteger(kg) ? formatNumber(kg) : formatNumber(kg, 1);
}

export default function WorkoutPage() {
  const { show } = useToast();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [history, setHistory] = useState<ExerciseHistory[]>([]);
  const [week, setWeek] = useState<WeekProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'programa' | 'historial' | 'progresion'>('programa');
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Workout | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, h, p] = await Promise.all([
        api.get<Workout[]>('/workouts'),
        api.get<ExerciseHistory[]>('/workouts/history/exercises'),
        api.get<WeekProgram>('/workouts/plan/week'),
      ]);
      setWorkouts(w);
      setHistory(h);
      setWeek(p);
      setOffline(false);
      // Copia local para poder abrir el detalle sin conexión.
      saveWorkoutHistory(w);
    } catch (e) {
      // Sin conexión: se lee el historial guardado en este dispositivo.
      const cached = getWorkoutHistory();
      if (cached) {
        setWorkouts(cached);
        setOffline(true);
        show('Sin conexión: mostrando el historial guardado en este dispositivo', 'error');
      } else {
        show((e as Error).message, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    load();
  }, [load]);

  // Al abrir una sesión se relee su detalle desde la base de datos. Si la red
  // falla se conserva el de la lista (copia local) para no dejar el modal vacío.
  useEffect(() => {
    if (detailId === null) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    api
      .get<Workout>(`/workouts/${detailId}`)
      .then((w) => {
        if (!cancelled) setDetail(w);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  const selectedWorkout =
    detailId === null ? null : (detail ?? workouts.find((w) => w.id === detailId) ?? null);

  const deleteWorkout = async (id: number) => {
    if (!confirm('¿Eliminar este entrenamiento?')) return;
    try {
      await api.delete(`/workouts/${id}`);
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
      removeWorkoutFromHistory(id);
      if (detailId === id) setDetailId(null);
      show('Entrenamiento eliminado');
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
          <CardHeader
            title="Programa semanal"
            subtitle={`${week?.trainingDays ?? 4} días · Torso / Pierna`}
          />
          {!week ? (
            <p className="text-center text-sm text-slate-400 py-6">No se pudo cargar el programa</p>
          ) : (
            <div className="space-y-2">
              {week.days.map((d) => {
                const isOpen = openDay === d.dow;
                const Icon = d.cardio ? Bike : Dumbbell;
                return (
                  <div
                    key={d.name}
                    className={`rounded-xl transition-colors ${
                      isOpen
                        ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800'
                        : 'bg-slate-50 dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-1 p-1">
                      <Link
                        to={`/entrenamiento/hoy?day=${d.dow}`}
                        className="flex-1 min-w-0 flex items-center gap-3 p-2 rounded-lg touch-action-manipulation active:bg-slate-100 dark:active:bg-slate-700"
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            d.cardio
                              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                              : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {d.name} <span className="text-slate-400 font-normal">· {d.focus}</span>
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {d.schedule} · {d.exercises.length} ejercicios
                          </p>
                        </div>
                      </Link>
                      <button
                        onClick={() => setOpenDay(isOpen ? null : d.dow)}
                        aria-label={`${isOpen ? 'Ocultar' : 'Ver'} ejercicios de ${d.name}`}
                        aria-expanded={isOpen}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 shrink-0 rounded-lg active:bg-slate-200 dark:active:bg-slate-600"
                      >
                        <ChevronDown
                          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>

                    {isOpen && (
                      <ul className="px-3 pb-3 space-y-1.5 animate-slide-up">
                        {d.exercises.map((ex, i) => (
                          <li
                            key={ex.name}
                            className="flex items-center gap-2.5 text-[13px] text-slate-600 dark:text-slate-300"
                          >
                            <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-500 flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <span className="flex-1 min-w-0">{ex.name}</span>
                            <span className="text-[11px] text-slate-400 shrink-0">
                              {ex.targetSets} × {ex.min}-{ex.max}
                              {unitSuffix(ex.unit)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
              <p className="text-[11px] text-slate-400 text-center pt-1">
                Sábado y domingo: descanso. Miércoles: descanso activo (cardio).
              </p>
            </div>
          )}
        </Card>
      )}

      {/* History */}
      {activeTab === 'historial' && (
        <Card>
          <CardHeader
            title="Historial"
            subtitle={
              workouts.length === 0 ? 'Aún no hay registros' : `${workouts.length} registrados`
            }
          />
          {offline && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2">
              Mostrando la copia local del historial.
            </p>
          )}
          {workouts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              Inicia tu primer entrenamiento desde el botón &quot;Hoy&quot;.
            </div>
          ) : (
            <div className="space-y-2">
              {[...workouts].reverse().map((w) => {
                const volume = totalVolume(w);
                return (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800"
                  >
                    <button
                      onClick={() => setDetailId(w.id ?? null)}
                      className="flex-1 min-w-0 flex items-center gap-3 p-3 text-left touch-action-manipulation rounded-xl active:bg-slate-100 dark:active:bg-slate-700"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Dumbbell className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{w.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {formatDate(w.date)} · {w.durationMin} min · {w.exercises.length} ejercicios ·
                          vol. {formatNumber(volume)} kg
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                    </button>
                    <button
                      onClick={() => deleteWorkout(w.id!)}
                      aria-label="Eliminar entrenamiento"
                      className="w-9 h-9 mr-2 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-500 active:text-rose-600 shrink-0"
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

      {/* Detalle de la sesión seleccionada */}
      {detailId !== null && (
        <WorkoutDetailModal
          workout={selectedWorkout}
          loading={detailLoading}
          onClose={() => setDetailId(null)}
          onDelete={() => deleteWorkout(detailId)}
        />
      )}
    </div>
  );
}

function StatPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 min-w-0">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="text-[11px] text-slate-500 truncate">{label}</span>
    </div>
  );
}

function WorkoutDetailModal({
  workout,
  loading,
  onClose,
  onDelete,
}: {
  workout: Workout | null;
  loading: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  if (!workout) {
    return (
      <Modal onClose={onClose} wide labelledBy="workout-detail-title">
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          {loading ? (
            <>
              <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Cargando detalle…</p>
            </>
          ) : (
            <>
              <Calendar className="w-10 h-10 text-slate-300" />
              <p className="text-sm text-slate-500">
                No hay información de esta sesión en este dispositivo.
              </p>
            </>
          )}
        </div>
      </Modal>
    );
  }

  const volume = totalVolume(workout);
  const setsCount = workout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const bestSet = workout.exercises.reduce(
    (best, ex) => ex.sets.reduce((b, set) => (set.weightKg > b ? set.weightKg : b), best),
    0
  );

  return (
    <Modal onClose={onClose} wide labelledBy="workout-detail-title">
      <div className="pr-10">
        <h2 id="workout-detail-title" className="text-lg font-bold text-slate-900 dark:text-white">
          {workout.name}
        </h2>
        <p className="text-xs text-slate-500">
          {formatDate(workout.date)}
          {loading && <span className="ml-2 text-blue-500">actualizando…</span>}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        <StatPill icon={<Clock className="w-4 h-4" />} label={`${workout.durationMin} min`} />
        <StatPill icon={<Layers className="w-4 h-4" />} label={`${setsCount} series`} />
        <StatPill icon={<Weight className="w-4 h-4" />} label={`${formatNumber(volume)} kg vol.`} />
        <StatPill
          icon={<TrendingUp className="w-4 h-4" />}
          label={bestSet > 0 ? `Máx. ${formatKg(bestSet)} kg` : 'Peso corporal'}
        />
      </div>

      {workout.notes && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
          <StickyNote className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            {workout.notes}
          </p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {workout.exercises.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">
            Esta sesión no tiene ejercicios registrados.
          </p>
        )}
        {workout.exercises.map((ex, idx) => {
          const exVolume = ex.sets.reduce(
            (acc, set) => acc + (set.weightKg ?? 0) * (set.reps ?? 0),
            0
          );
          return (
            <div
              key={ex.id ?? `${ex.exerciseId}-${idx}`}
              className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
                <span className="w-6 h-6 rounded-md bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-500 flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <p className="text-[13px] font-semibold flex-1 min-w-0">
                  {ex.exercise?.name ?? 'Ejercicio'}
                </p>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {ex.sets.length} ser · {formatNumber(exVolume)} kg
                </span>
              </div>

              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="font-medium text-left py-1.5 pl-3">Serie</th>
                    <th className="font-medium text-right py-1.5">Peso</th>
                    <th className="font-medium text-right py-1.5 pr-3">Reps</th>
                    <th className="font-medium text-right py-1.5">RIR</th>
                    <th className="font-medium text-right py-1.5 pr-3">Descanso</th>
                  </tr>
                </thead>
                <tbody>
                  {ex.sets.map((set) => (
                    <tr
                      key={set.id ?? set.setNumber}
                      className="border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                    >
                      <td className="py-1.5 pl-3 text-slate-400">{set.setNumber}</td>
                      <td className="py-1.5 text-right font-semibold text-slate-700 dark:text-slate-200">
                        {set.weightKg > 0 ? `${formatKg(set.weightKg)} kg` : '—'}
                      </td>
                      <td className="py-1.5 text-right font-semibold text-slate-700 dark:text-slate-200">
                        {formatNumber(set.reps)}
                      </td>
                      <td className="py-1.5 text-right text-slate-500">{set.rir}</td>
                      <td className="py-1.5 pr-3 text-right text-slate-500">
                        <span className="inline-flex items-center gap-0.5">
                          <Timer className="w-3 h-3" />
                          {set.restSec}s
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-4 text-[11px] text-slate-400">
        <Gauge className="w-3.5 h-3.5" />
        <span>RIR = repeticiones en reserva · &quot;—&quot; en peso = peso corporal</span>
      </div>

      <div className="flex gap-2 mt-5">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Cerrar
        </Button>
        <Button
          variant="secondary"
          onClick={onDelete}
          aria-label="Eliminar entrenamiento"
          className="!text-rose-500 flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Modal>
  );
}
