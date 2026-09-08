import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Save, ArrowLeft, Dumbbell, CheckCircle2, Minus, Timer, Info, ExternalLink } from 'lucide-react';
import { api, todayISO } from '../lib/api';
import type { Exercise } from '../types';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useToast } from '../components/Toast';

interface PlanExercise {
  name: string;
  targetSets: number;
  min: number;
  max: number;
  unit: string;
  exerciseId: number | null;
  notes?: string | null;
  mediaUrl?: string | null;
}

interface LocalSet {
  weight: string;
  reps: string;
  rir: string;
  restSec: string;
}

interface LocalExercise {
  plan: PlanExercise;
  sets: LocalSet[];
}

export default function WorkoutTodayPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { show } = useToast();
  const [plan, setPlan] = useState<PlanExercise[]>([]);
  const [workoutName, setWorkoutName] = useState<string | null>(null);
  const [existing, setExisting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState('45');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(0);

  const selectedDay = searchParams.get('day');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const planUrl = selectedDay ? `/workouts/plan/today?day=${selectedDay}` : '/workouts/plan/today';
      const res = await api.get<{ workout: string | null; exercises: PlanExercise[]; dayOfWeek?: number }>(planUrl);
      setWorkoutName(res.workout);
      setPlan(res.exercises);

      const today = todayISO();
      const workouts = await api.get<any[]>('/workouts');
      const found = workouts.find((w) => w.date.slice(0, 10) === today);
      if (found && !selectedDay) {
        setExisting(true);
        setDuration(String(found.durationMin ?? 45));
        setNotes(found.notes ?? '');
        const loaded: LocalExercise[] = found.exercises.map((we: any) => ({
          plan: {
            name: we.exercise.name,
            targetSets: we.sets.length,
            min: 6,
            max: 12,
            unit: 'reps',
            exerciseId: we.exerciseId,
          },
          sets: we.sets.map((s: any) => ({
            weight: String(s.weightKg ?? ''),
            reps: String(s.reps ?? ''),
            rir: String(s.rir ?? ''),
            restSec: String(s.restSec ?? '60'),
          })),
        }));
        setExercises(loaded);
      } else {
        setExisting(false);
        setExercises(
          res.exercises.map((ex) => ({
            plan: ex,
            sets: Array.from({ length: ex.targetSets }, () => ({
              weight: '',
              reps: '',
              rir: '2',
              restSec: '60',
            })),
          }))
        );
      }
    } catch (e) {
      show((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [show, selectedDay]);

  useEffect(() => {
    load();
  }, [load]);

  const updateSet = (exIdx: number, setIdx: number, field: keyof LocalSet, value: string) => {
    setExercises((prev) => {
      const next = prev.map((ex, i) =>
        i === exIdx
          ? { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, [field]: value } : s)) }
          : ex
      );
      return next;
    });
  };

  const incrementField = (exIdx: number, setIdx: number, field: keyof LocalSet, step: number) => {
    setExercises((prev) => {
      const next = prev.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, j) => {
                if (j !== setIdx) return s;
                const current = Number(s[field]) || 0;
                const newVal = Math.max(0, current + step);
                return { ...s, [field]: String(newVal) };
              }),
            }
          : ex
      );
      return next;
    });
  };

  const addSet = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx ? { ...ex, sets: [...ex.sets, { weight: '', reps: '', rir: '2', restSec: '60' }] } : ex
      )
    );
  };

  const removeSet = (exIdx: number) => {
    setExercises((prev) => prev.map((ex, i) => (i === exIdx ? { ...ex, sets: ex.sets.slice(0, -1) } : ex)));
  };

  const handleSave = async () => {
    if (!workoutName) return;
    setSaveLoading(true);
    try {
      const payload = {
        date: todayISO(),
        name: workoutName,
        durationMin: Number(duration) || 45,
        notes: notes || null,
        exercises: exercises
          .filter((ex) => ex.sets.some((s) => s.reps !== '' && s.reps !== '0'))
          .map((ex, idx) => ({
            exerciseId: ex.plan.exerciseId as number,
            order: idx + 1,
            sets: ex.sets
              .map((s, i) => ({
                setNumber: i + 1,
                weightKg: Number(s.weight) || 0,
                reps: Number(s.reps) || 0,
                rir: Number(s.rir) || 0,
                restSec: Number(s.restSec) || 60,
              }))
              .filter((s) => s.reps > 0),
          }))
          .filter((ex) => ex.sets.length > 0),
      };
      if (payload.exercises.length === 0) {
        show('Registra al menos una serie con repeticiones', 'error');
        return;
      }
      await api.post('/workouts', payload);
      show(existing ? 'Entrenamiento actualizado ✓' : 'Entrenamiento guardado ✓');
      navigate('/entrenamiento');
    } catch (e) {
      show((e as Error).message, 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Cargando plan…</p>
        </div>
      </div>
    );
  }

  if (!workoutName) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/entrenamiento')}>
          <ArrowLeft className="w-5 h-5" /> Volver
        </Button>
        <Card className="text-center py-10">
          <Dumbbell className="w-14 h-14 mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-lg">Hoy es día de descanso</p>
          <p className="text-sm text-slate-500 mt-1">El programa entrena lunes, martes, jueves y viernes.</p>
        </Card>
      </div>
    );
  }

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.reps !== '').length, 0);

  return (
    <div className="space-y-4 animate-slide-up pb-24">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/entrenamiento')} className="px-2">
          <ArrowLeft className="w-5 h-5" /> Volver
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
            <Timer className="w-4 h-4" />
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-12 !min-h-0 !py-0 !px-1 text-center border-0 bg-transparent font-semibold"
              inputMode="numeric"
              min={1}
            />
            <span>min</span>
          </div>
        </div>
      </div>

      {/* Workout title card */}
      <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{workoutName}</h1>
            <p className="text-blue-100 text-xs mt-0.5">{totalSets} series registradas</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Dumbbell className="w-6 h-6" />
          </div>
        </div>
      </Card>

      {/* Exercises - accordion style for mobile */}
      {exercises.map((ex, exIdx) => {
        const isExpanded = expandedExercise === exIdx;
        const completedSets = ex.sets.filter((s) => s.reps !== '').length;

        return (
          <Card key={ex.plan.name} className="overflow-hidden">
            {/* Exercise header - tap to expand */}
            <button
              onClick={() => setExpandedExercise(isExpanded ? null : exIdx)}
              className="w-full flex items-center justify-between -m-4 p-4 touch-action-manipulation"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  completedSets > 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}>
                  {completedSets > 0 ? `${completedSets}/${ex.sets.length}` : exIdx + 1}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">{ex.plan.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {completedSets > 0 ? 'En progreso' : `Objetivo: ${ex.plan.targetSets} × ${ex.plan.min}-${ex.plan.max}`}
                  </p>
                </div>
              </div>
              <div className={`w-6 h-6 flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Expanded sets */}
            {isExpanded && (
              <div className="mt-3 space-y-2 animate-slide-up">
                {/* Exercise notes */}
                {ex.plan.notes && (
                  <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{ex.plan.notes}</p>
                    </div>
                    {ex.plan.mediaUrl && (
                      <a
                        href={ex.plan.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400 underline"
                      >
                        <ExternalLink className="w-3 h-3" /> Ver video/GIF de ejecución
                      </a>
                    )}
                  </div>
                )}
                {ex.sets.map((s, sIdx) => {
                  const isCompleted = s.reps !== '';
                  return (
                    <div
                      key={sIdx}
                      className={`rounded-xl p-3 transition-colors ${
                        isCompleted
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-600' : 'text-slate-500'}`}>
                          Serie {sIdx + 1}
                        </span>
                        {ex.sets.length > 1 && (
                          <button
                            onClick={() => removeSet(exIdx)}
                            className="text-slate-300 hover:text-rose-500 active:text-rose-600 p-1"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Weight */}
                        <div>
                          <label className="text-[10px] font-medium text-slate-500 mb-1 block">Peso (kg)</label>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => incrementField(exIdx, sIdx, 'weight', -2.5)}
                              className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center active:bg-slate-300 dark:active:bg-slate-600"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <Input
                              type="number"
                              inputMode="decimal"
                              placeholder="0"
                              value={s.weight}
                              onChange={(e) => updateSet(exIdx, sIdx, 'weight', e.target.value)}
                              className="flex-1 text-center !py-2"
                            />
                            <button
                              onClick={() => incrementField(exIdx, sIdx, 'weight', 2.5)}
                              className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center active:bg-slate-300 dark:active:bg-slate-600"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {/* Reps */}
                        <div>
                          <label className="text-[10px] font-medium text-slate-500 mb-1 block">Reps</label>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => incrementField(exIdx, sIdx, 'reps', -1)}
                              className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center active:bg-slate-300 dark:active:bg-slate-600"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <Input
                              type="number"
                              inputMode="numeric"
                              placeholder="0"
                              value={s.reps}
                              onChange={(e) => updateSet(exIdx, sIdx, 'reps', e.target.value)}
                              className="flex-1 text-center !py-2"
                            />
                            <button
                              onClick={() => incrementField(exIdx, sIdx, 'reps', 1)}
                              className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center active:bg-slate-300 dark:active:bg-slate-600"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {/* RIR */}
                        <div>
                          <label className="text-[10px] font-medium text-slate-500 mb-1 block">RIR</label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="2"
                            value={s.rir}
                            onChange={(e) => updateSet(exIdx, sIdx, 'rir', e.target.value)}
                            className="!py-2"
                          />
                        </div>
                        {/* Rest */}
                        <div>
                          <label className="text-[10px] font-medium text-slate-500 mb-1 block">Descanso (s)</label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="60"
                            value={s.restSec}
                            onChange={(e) => updateSet(exIdx, sIdx, 'restSec', e.target.value)}
                            className="!py-2"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Button variant="secondary" onClick={() => addSet(exIdx)} className="w-full text-sm py-2.5">
                  <Plus className="w-4 h-4" /> Agregar serie
                </Button>
              </div>
            )}
          </Card>
        );
      })}

      {/* Notes */}
      <Card>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Notas</label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Cómo te sentiste, energía, dolor…"
        />
      </Card>

      {/* Save button - fixed at bottom on mobile */}
      <div className="pb-4">
        <Button onClick={handleSave} disabled={saveLoading} className="w-full py-4 text-base">
          {saveLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5" /> Guardar entrenamiento
            </>
          )}
        </Button>
      </div>

      {existing && (
        <p className="text-center text-xs text-emerald-600 flex items-center justify-center gap-1 pb-4">
          <CheckCircle2 className="w-3.5 h-3.5" /> Ya tenías un entrenamiento hoy; actualizarlo lo reemplazará.
        </p>
      )}
    </div>
  );
}
