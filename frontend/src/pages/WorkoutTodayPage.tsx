import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Save, ArrowLeft, Dumbbell, CheckCircle2, Minus, Timer, Info, ExternalLink, AlertCircle, RefreshCw, Flame, Activity } from 'lucide-react';
import { api, todayISO } from '../lib/api';
import { WARMUP_EXERCISES, STRETCH_EXERCISES } from '../data/workoutGuide';
import {
  addPendingOp,
  clearWorkoutDraft,
  flushPendingOps,
  getWorkoutDraft,
  makeId,
  removePendingOp,
  removePendingOps,
  saveWorkoutDraft,
} from '../lib/offlineStore';
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
  bodyweight?: boolean;
}

interface LocalSet {
  weight: string;
  reps: string;
  rir: string;
  restSec: string;
  bodyweight: boolean;
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
  const [warmup, setWarmup] = useState<Record<string, boolean>>({});
  const [stretches, setStretches] = useState<Record<string, boolean>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(0);

  const selectedDay = searchParams.get('day');

  // Offline first: se persiste un borrador local de las series capturadas
  // mientras el usuario entrena, antes de intentar guardar en la API.
  useEffect(() => {
    if (!workoutName) return;
    const hasContent =
      notes !== '' ||
      duration !== '45' ||
      Object.values(warmup).some(Boolean) ||
      Object.values(stretches).some(Boolean) ||
      exercises.some((ex) => ex.sets.some((s) => s.weight !== '' || s.reps !== '' || s.rir !== '2' || s.restSec !== '60'));
    if (!hasContent) return;
    saveWorkoutDraft(todayISO(), {
      date: todayISO(),
      workoutName,
      existing,
      duration,
      notes,
      exercises,
      warmup,
      stretches,
      savedAt: new Date().toISOString(),
    });
  }, [exercises, duration, notes, workoutName, existing, warmup, stretches]);

  const load = useCallback(async () => {
    setLoading(true);
    const today = todayISO();
    try {
      // Reenvía un guardado que haya quedado pendiente sin conexión.
      await flushPendingOps(today);
      const planUrl = selectedDay ? `/workouts/plan/today?day=${selectedDay}` : '/workouts/plan/today';
      const res = await api.get<{ workout: string | null; exercises: PlanExercise[]; dayOfWeek?: number }>(planUrl);
      setWorkoutName(res.workout);
      setPlan(res.exercises);

      const workouts = await api.get<any[]>('/workouts');
      const found = workouts.find((w) => w.date.slice(0, 10) === today);
      const draft = getWorkoutDraft(today);

      if (draft) {
        // Prioridad al borrador local: el usuario editó series aún sin guardar.
        setExisting(draft.existing);
        setDuration(draft.duration);
        setNotes(draft.notes);
        setWarmup((draft.warmup as Record<string, boolean>) ?? {});
        setStretches((draft.stretches as Record<string, boolean>) ?? {});
        const loaded: LocalExercise[] = (draft.exercises as LocalExercise[]).map((ex) => ({
          plan: ex.plan,
          sets: ex.sets.map((s) => ({ ...s, bodyweight: s.bodyweight ?? false })),
        }));
        setExercises(loaded);
      } else if (found && !selectedDay) {
        // Los ejercicios ya registrados conservan su marca de peso corporal según el plan.
        const bodyweightByName = new Map(res.exercises.map((p) => [p.name, p.bodyweight ?? false]));
        setExisting(true);
        setDuration(String(found.durationMin ?? 45));
        setNotes(found.notes ?? '');
        setWarmup({});
        setStretches({});
        const loaded: LocalExercise[] = found.exercises.map((we: any) => ({
          plan: {
            name: we.exercise.name,
            targetSets: we.sets.length,
            min: 6,
            max: 12,
            unit: 'reps',
            exerciseId: we.exerciseId,
            bodyweight: bodyweightByName.get(we.exercise.name) ?? false,
          },
          sets: we.sets.map((s: any) => ({
            weight: String(s.weightKg ?? ''),
            reps: String(s.reps ?? ''),
            rir: String(s.rir ?? ''),
            restSec: String(s.restSec ?? '60'),
            bodyweight: bodyweightByName.get(we.exercise.name) ?? false,
          })),
        }));
        setExercises(loaded);
      } else {
        setExisting(false);
        setWarmup({});
        setStretches({});
        setExercises(
          res.exercises.map((ex) => ({
            plan: ex,
            sets: Array.from({ length: ex.targetSets }, () => ({
              weight: '',
              reps: '',
              rir: '2',
              restSec: '60',
              bodyweight: ex.bodyweight ?? false,
            })),
          }))
        );
      }
      setSaveError(null);
    } catch (e) {
      // Sin conexión: se recuperan las series desde el dispositivo.
      const draft = getWorkoutDraft(today);
      if (draft && draft.exercises.length > 0) {
        setWorkoutName(draft.workoutName);
        setPlan(draft.exercises.map((ex: any) => ex.plan));
        setExisting(draft.existing);
        setDuration(draft.duration);
        setNotes(draft.notes);
        setWarmup((draft.warmup as Record<string, boolean>) ?? {});
        setStretches((draft.stretches as Record<string, boolean>) ?? {});
        setExercises(draft.exercises as LocalExercise[]);
        show('Sin conexión: recuperaste tus series desde este dispositivo', 'error');
      } else {
        show((e as Error).message, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [show, selectedDay]);

  useEffect(() => {
    load();
  }, [load]);

  type SetNumberField = 'weight' | 'reps' | 'rir' | 'restSec';

  const updateSet = (exIdx: number, setIdx: number, field: SetNumberField, value: string) => {
    setExercises((prev) => {
      const next = prev.map((ex, i) =>
        i === exIdx
          ? { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, [field]: value } : s)) }
          : ex
      );
      return next;
    });
  };

  const incrementField = (exIdx: number, setIdx: number, field: SetNumberField, step: number) => {
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
        i === exIdx
          ? { ...ex, sets: [...ex.sets, { weight: '', reps: '', rir: '2', restSec: '60', bodyweight: ex.plan.bodyweight ?? false }] }
          : ex
      )
    );
  };

  const toggleBodyweight = (exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j === setIdx ? { ...s, bodyweight: !s.bodyweight, weight: s.bodyweight ? s.weight : '' } : s
              ),
            }
          : ex
      )
    );
  };

  const toggleGuideItem = (key: 'warmup' | 'stretches', name: string) => {
    const setter = key === 'warmup' ? setWarmup : setStretches;
    setter((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const removeSet = (exIdx: number) => {
    setExercises((prev) => prev.map((ex, i) => (i === exIdx ? { ...ex, sets: ex.sets.slice(0, -1) } : ex)));
  };

  const handleSave = async () => {
    if (!workoutName) return;
    setSaveLoading(true);
    setSaveError(null);
    const payload = {
      date: todayISO(),
      name: workoutName,
      durationMin: Number(duration) || 45,
      notes: notes || null,
      exercises: exercises
        .filter((ex) => ex.sets.some((s) => s.reps !== '' && s.reps !== '0'))
        .map((ex, idx) => ({
          exerciseId: ex.plan.exerciseId ?? 0,
          name: ex.plan.name,
          order: idx + 1,
          sets: ex.sets
            .map((s, i) => ({
              setNumber: i + 1,
              weightKg: s.bodyweight ? 0 : Number(s.weight) || 0,
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
    // Offline first: una sola operación pendiente por día (la API hace upsert por fecha).
    removePendingOps('workoutSave', todayISO());
    const opId = addPendingOp({
      id: makeId(),
      kind: 'workoutSave',
      date: todayISO(),
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
    try {
      await api.post('/workouts', payload);
      removePendingOp(opId);
      clearWorkoutDraft(todayISO());
      show(existing ? 'Entrenamiento actualizado ✓' : 'Entrenamiento guardado ✓');
      setSaveError(null);
      navigate('/entrenamiento');
    } catch (e) {
      // No se cierra la pantalla ni se limpian las series: quedan en pantalla
      // y en el almacenamiento local para reintentar o sincronizar después.
      setSaveError((e as Error).message);
      show('No se pudo guardar. Tus series siguen en pantalla y en este dispositivo.', 'error');
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
          <p className="text-sm text-slate-500 mt-1">El programa entrena lunes, miércoles y viernes.</p>
        </Card>
      </div>
    );
  }

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.reps !== '').length, 0);
  const warmupCount = WARMUP_EXERCISES.filter((w) => warmup[w.name]).length;
  const stretchCount = STRETCH_EXERCISES.filter((s) => stretches[s.name]).length;

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

      {/* Calentamiento dinámico previo */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Calentamiento</h3>
              <p className="text-[11px] text-slate-500">Dinámico · antes de entrenar · ~5 min</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
            {warmupCount}/{WARMUP_EXERCISES.length}
          </span>
        </div>
        <div className="space-y-1.5 mt-3">
          {WARMUP_EXERCISES.map((w) => {
            const done = !!warmup[w.name];
            return (
              <button
                key={w.name}
                onClick={() => toggleGuideItem('warmup', w.name)}
                className="w-full flex items-start gap-2.5 rounded-xl p-2.5 text-left transition-all active:scale-[0.99] touch-action-manipulation bg-slate-50 dark:bg-slate-800/60"
              >
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {done && <CheckCircle2 className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium ${done ? 'text-slate-400 dark:text-slate-500 line-through' : ''}`}>
                    {w.name}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {w.duration} · {w.hint}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {warmupCount === WARMUP_EXERCISES.length && warmupCount > 0 && (
          <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="inline w-3.5 h-3.5 mr-1" />
            Calentamiento completo. ¡A entrenar!
          </p>
        )}
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
                          {s.bodyweight ? (
                            <div className="w-full rounded-lg bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-between px-2 min-h-[42px]">
                              <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                                <CheckCircle2 className="w-4 h-4" /> Peso corporal
                              </span>
                              <button
                                onClick={() => toggleBodyweight(exIdx, sIdx)}
                                className="text-[10px] underline underline-offset-2"
                                title="Registrar con carga en kg"
                              >
                                kg
                              </button>
                            </div>
                          ) : (
                            <>
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
                              {ex.plan.bodyweight && (
                                <button
                                  onClick={() => toggleBodyweight(exIdx, sIdx)}
                                  className="mt-1 w-full text-[10px] font-medium text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 active:text-emerald-700 py-1 rounded-lg"
                                >
                                  Marcar como peso corporal
                                </button>
                              )}
                            </>
                          )}
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

      {/* Estiramiento post-entreno */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Estiramiento post-entreno</h3>
              <p className="text-[11px] text-slate-500">Estáticos · al terminar tu rutina</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            {stretchCount}/{STRETCH_EXERCISES.length}
          </span>
        </div>
        <div className="space-y-1.5 mt-3">
          {STRETCH_EXERCISES.map((sItem) => {
            const done = !!stretches[sItem.name];
            return (
              <button
                key={sItem.name}
                onClick={() => toggleGuideItem('stretches', sItem.name)}
                className="w-full flex items-start gap-2.5 rounded-xl p-2.5 text-left transition-all active:scale-[0.99] touch-action-manipulation bg-slate-50 dark:bg-slate-800/60"
              >
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {done && <CheckCircle2 className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium ${done ? 'text-slate-400 dark:text-slate-500 line-through' : ''}`}>
                    {sItem.name}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {sItem.duration} · {sItem.hint}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {stretchCount === STRETCH_EXERCISES.length && stretchCount > 0 && (
          <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="inline w-3.5 h-3.5 mr-1" />
            Estiramiento completo. ¡Excelente sesión!
          </p>
        )}
      </Card>

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
              <Save className="w-5 h-5" /> {saveError ? 'Reintentar guardar' : 'Guardar entrenamiento'}
            </>
          )}
        </Button>
      </div>

      {/* Error al guardar: se mantienen las series en pantalla */}
      {saveError && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                No se pudo guardar el entrenamiento
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 leading-relaxed">
                Hubo un error de conexión o del servidor. Tus series siguen en pantalla y quedaron
                guardadas en este dispositivo. Puedes reintentar o salir y volver más tarde.
              </p>
              <p className="text-[10px] text-rose-500/70 mt-1">{saveError}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saveLoading} className="w-full">
            {saveLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-4 h-4" /> Reintentar guardar
              </>
            )}
          </Button>
        </div>
      )}

      {existing && (
        <p className="text-center text-xs text-emerald-600 flex items-center justify-center gap-1 pb-4">
          <CheckCircle2 className="w-3.5 h-3.5" /> Ya tenías un entrenamiento hoy; actualizarlo lo reemplazará.
        </p>
      )}
    </div>
  );
}
