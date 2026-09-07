import { z } from 'zod';

export const profileSchema = z.object({
  sex: z.enum(['masculino', 'femenino']),
  age: z.number().int().min(10).max(100),
  heightCm: z.number().min(50).max(250),
  initialWeightKg: z.number().min(20).max(300),
  activityLevel: z.enum(['sedentaria', 'ligera', 'moderada', 'activa']),
  trainingLevel: z.enum(['bajo', 'moderado', 'alto']),
  primaryGoal: z.string().min(3).max(200),
  calorieTarget: z.number().min(800).max(5000),
  proteinTarget: z.number().min(30).max(400),
  fatMinTarget: z.number().min(10).max(200),
  fatMaxTarget: z.number().min(10).max(200),
  waterTargetMl: z.number().min(500).max(10000),
  stepsTarget: z.number().min(500).max(50000),
  fiberTarget: z.number().min(5).max(100),
  creatineTargetG: z.number().min(0).max(30),
});

export const weightSchema = z.object({
  date: z.string(),
  weightKg: z.number().min(20).max(300),
});

export const measurementSchema = z.object({
  date: z.string(),
  waistCm: z.number().min(20).max(300).optional().nullable(),
  chestCm: z.number().min(20).max(300).optional().nullable(),
  armCm: z.number().min(10).max(150).optional().nullable(),
  thighCm: z.number().min(10).max(200).optional().nullable(),
  neckCm: z.number().min(10).max(100).optional().nullable(),
  bodyFatPct: z.number().min(1).max(60).optional().nullable(),
  weightKg: z.number().min(20).max(300).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const workoutSetSchema = z.object({
  setNumber: z.number().int().min(1),
  weightKg: z.number().min(0),
  reps: z.number().int().min(0),
  rir: z.number().int().min(0).max(10),
  restSec: z.number().int().min(0),
  notes: z.string().max(500).optional().nullable(),
});

export const workoutExerciseSchema = z.object({
  exerciseId: z.number().int().positive(),
  order: z.number().int().min(1),
  sets: z.array(workoutSetSchema).min(1),
});

export const workoutSchema = z.object({
  date: z.string(),
  name: z.string().min(1).max(200),
  durationMin: z.number().int().min(1).max(600),
  notes: z.string().max(1000).optional().nullable(),
  exercises: z.array(workoutExerciseSchema).min(1),
});

export const nutritionEntrySchema = z.object({
  date: z.string(),
  waterMl: z.number().min(0).optional().default(0),
});

export const mealSchema = z.object({
  date: z.string(),
  name: z.string().min(1),
  foods: z.array(
    z.object({
      foodId: z.number().int().positive(),
      grams: z.number().positive(),
    })
  ),
});

export const foodSchema = z.object({
  name: z.string().min(1),
  kcalPer100: z.number().min(0),
  proteinPer100: z.number().min(0),
  carbsPer100: z.number().min(0),
  fatsPer100: z.number().min(0),
  fiberPer100: z.number().min(0).default(0),
  servingUnit: z.string().default('g'),
});

export const supplementSchema = z.object({
  date: z.string(),
  wheyProteinG: z.number().min(0).default(0),
  caloriesFromWhey: z.number().min(0).default(0),
  creatineG: z.number().min(0).default(0),
});

export const activitySchema = z.object({
  date: z.string(),
  steps: z.number().int().min(0).default(0),
  activeCalories: z.number().min(0).default(0),
  walkingMinutes: z.number().int().min(0).default(0),
  cardioType: z.string().min(1).optional().nullable(),
  cardioMinutes: z.number().int().min(0).default(0),
});

export const photoSchema = z.object({
  date: z.string(),
  photoType: z.enum(['Frente', 'Perfil', 'Espalda']),
  dataUrl: z.string().min(20),
  notes: z.string().max(1000).optional().nullable(),
});

export const monthlyGoalUpdateSchema = z.object({
  month: z.number().int().min(1).max(6),
  goals: z.array(z.string().min(1)),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const dateQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
});