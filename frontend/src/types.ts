export interface UserProfile {
  id: number;
  sex: string;
  age: number;
  heightCm: number;
  initialWeightKg: number;
  activityLevel: string;
  trainingLevel: string;
  primaryGoal: string;
  startDate: string;
  daysProgram: number;
  calorieTarget: number;
  proteinTarget: number;
  fatMinTarget: number;
  fatMaxTarget: number;
  carbAuto: boolean;
  waterTargetMl: number;
  stepsTarget: number;
  fiberTarget: number;
  creatineTargetG: number;
}

export interface WeightEntry {
  id: number;
  date: string;
  weightKg: number;
}

export interface BodyMeasurement {
  id: number;
  date: string;
  waistCm?: number | null;
  chestCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  neckCm?: number | null;
  bodyFatPct?: number | null;
  weightKg?: number | null;
  notes?: string | null;
}

export interface WorkoutSet {
  id?: number;
  setNumber: number;
  weightKg: number;
  reps: number;
  rir: number;
  restSec: number;
  notes?: string | null;
}

export interface WorkoutExercise {
  id?: number;
  exerciseId: number;
  order: number;
  exercise?: Exercise;
  sets: WorkoutSet[];
}

export interface Workout {
  id?: number;
  date: string;
  name: string;
  durationMin: number;
  notes?: string | null;
  exercises: WorkoutExercise[];
}

export interface Exercise {
  id: number;
  name: string;
  category: string;
  isProgram: boolean;
}

export interface Food {
  id: number;
  name: string;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatsPer100: number;
  fiberPer100: number;
  servingUnit: string;
  isBasic: boolean;
}

export interface NutritionEntry {
  id: number;
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  fiberG: number;
  waterMl: number;
}

export interface MealFoodEntry {
  id: number;
  food: Food;
  grams: number;
  calories?: number;
  protein?: number;
}

export interface Meal {
  id: number;
  name: string;
  date: string;
  entries: MealFoodEntry[];
}

export interface Supplement {
  id: number;
  date: string;
  wheyProteinG: number;
  caloriesFromWhey: number;
  creatineG: number;
}

export interface DailyActivity {
  id: number;
  date: string;
  steps: number;
  activeCalories: number;
  walkingMinutes: number;
  cardioType?: string | null;
  cardioMinutes: number;
}

export interface ProgressPhoto {
  id: number;
  date: string;
  photoType: string;
  dataUrl: string;
  notes?: string | null;
}

export interface MonthlyGoal {
  id: number;
  month: number;
  goals: string[];
}

export interface DashboardData {
  day: number;
  total: number;
  pct: number;
  currentMonth: number;
  startDate: string;
  daysRemaining: number;
  programDay: number;
  programTotal: number;
  programPct: number;
  currentWeight: number | null;
  weeklyAvgWeight: number | null;
  weightChange: number | null;
  waist: number | null;
  waistChange30d: number | null;
  caloriesConsumed: number;
  caloriesRemaining: number;
  proteinConsumed: number;
  proteinRemaining: number;
  todaysWorkout: string | null;
  nextWorkout: string | null;
  steps: number;
  waterMl: number;
  workoutDoneToday: boolean;
  nutritionLoggedToday: boolean;
}

export interface Recommendation {
  type: string;
  title: string;
  message: string;
  color: 'green' | 'yellow' | 'red';
}

export interface AdaptiveResponse {
  recommendation: Recommendation;
  disclaimer: string;
}

export interface PersonalRecord {
  exercise: string;
  category: string;
  maxWeight: number;
  maxReps: number;
  maxVolume: number;
}

export interface SuggestionResponse {
  suggestion: {
    lines: { foodId: number; name: string; grams: number; calories: number; protein: number }[];
    totals: { calories: number; protein: number; targetCalories: number; targetProtein: number };
  } | null;
  disclaimer: string;
}