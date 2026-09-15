// Persistencia local "Offline First".
// Antes de cada petición a la API se guarda una copia en localStorage,
// de modo que si la red o el servidor fallan jamás se pierde la información.

import { api } from './api';
import type { Meal, NutritionEntry } from '../types';

const PENDING_KEY = 'mf180:pending';
const nutritionSnapshotKey = (date: string) => `mf180:nutrition:snapshot:${date}`;
const workoutDraftKey = (date: string) => `mf180:workout:draft:${date}`;

export type PendingKind = 'mealAdd' | 'waterUpdate' | 'workoutSave';

export interface PendingOp {
  id: string;
  kind: PendingKind;
  date: string;
  payload: unknown;
  createdAt: string;
  attempts: number;
}

export interface NutritionSnapshot {
  meals: Meal[];
  entry: NutritionEntry | null;
  savedAt: string;
}

export interface DraftPlanExercise {
  name: string;
  targetSets: number;
  min: number;
  max: number;
  unit: string;
  exerciseId: number | null;
  notes?: string | null;
  mediaUrl?: string | null;
}

export interface DraftSet {
  weight: string;
  reps: string;
  rir: string;
  restSec: string;
}

export interface DraftExercise {
  plan: DraftPlanExercise;
  sets: DraftSet[];
}

export interface WorkoutDraft {
  date: string;
  workoutName: string;
  existing: boolean;
  duration: string;
  notes: string;
  exercises: DraftExercise[];
  savedAt: string;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Almacenamiento local no disponible; se ignora sin romper la app.
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---------------------------------------------------------------
// Operaciones pendientes (cola de sincronización)
// ---------------------------------------------------------------

export function getPendingOps(): PendingOp[] {
  return read<PendingOp[]>(PENDING_KEY) ?? [];
}

function savePendingOps(ops: PendingOp[]) {
  write(PENDING_KEY, ops);
}

export function addPendingOp(op: PendingOp): string {
  const ops = getPendingOps();
  ops.push(op);
  savePendingOps(ops);
  return op.id;
}

export function removePendingOp(id: string) {
  savePendingOps(getPendingOps().filter((op) => op.id !== id));
}

export function removePendingOps(kind: PendingKind, date: string) {
  savePendingOps(getPendingOps().filter((op) => !(op.kind === kind && op.date === date)));
}

// ---------------------------------------------------------------
// Instantáneas de nutrición (lo último confirmado en el día)
// ---------------------------------------------------------------

export function getNutritionSnapshot(date: string): NutritionSnapshot | null {
  return read<NutritionSnapshot>(nutritionSnapshotKey(date));
}

export function saveNutritionSnapshot(date: string, snapshot: NutritionSnapshot) {
  write(nutritionSnapshotKey(date), snapshot);
}

export function clearNutritionSnapshot(date: string) {
  remove(nutritionSnapshotKey(date));
}

// ---------------------------------------------------------------
// Borrador de entrenamiento (series capturadas en pantalla)
// ---------------------------------------------------------------

export function getWorkoutDraft(date: string): WorkoutDraft | null {
  return read<WorkoutDraft>(workoutDraftKey(date));
}

export function saveWorkoutDraft(date: string, draft: WorkoutDraft) {
  write(workoutDraftKey(date), draft);
}

export function clearWorkoutDraft(date: string) {
  remove(workoutDraftKey(date));
}

// ---------------------------------------------------------------
// Sincronización: reenvía las operaciones pendientes a la API
// ---------------------------------------------------------------

export async function flushPendingOps(date?: string): Promise<number> {
  // Sin conexión de red no hay nada que sincronizar: evita esperar timeouts.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0;
  const ops = getPendingOps().filter((op) => !date || op.date === date);
  let synced = 0;
  for (const op of ops) {
    try {
      if (op.kind === 'mealAdd') {
        await api.post('/nutrition/meals', op.payload);
      } else if (op.kind === 'waterUpdate') {
        await api.post('/nutrition/entry', op.payload);
      } else if (op.kind === 'workoutSave') {
        await api.post('/workouts', op.payload);
      }
      removePendingOp(op.id);
      synced++;
    } catch {
      // Sin conexión o error del servidor: se queda en la cola local.
    }
  }
  return synced;
}