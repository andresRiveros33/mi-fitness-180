// Progresión doble: sugiere (no aplica) subir carga cuando se completa el rango superior.

export interface ProgressionCheck {
  readyToProgress: boolean;
  message: string | null;
  completedUpperRange: boolean;
  bestReps: number;
  maxRange: number;
}

export function checkDoubleProgression(
  performedReps: number[],
  targetMin: number,
  targetMax: number
): ProgressionCheck {
  const validReps = performedReps.filter((r) => r > 0);
  if (validReps.length === 0) {
    return {
      readyToProgress: false,
      message: null,
      completedUpperRange: false,
      bestReps: 0,
      maxRange: targetMax,
    };
  }
  const bestReps = Math.min(...validReps); // peor serie = mínimo
  const allAtUpper = validReps.every((r) => r >= targetMax);
  let message: string | null = null;
  if (allAtUpper) {
    message = `Objetivo de repeticiones alcanzado (${validReps.join(', ')}). Considera aumentar ligeramente la carga en la próxima sesión.`;
  } else if (bestReps < targetMin) {
    message = `Aún con margen de técnica/capacidad (mejor serie: ${bestReps} reps). Sigue consolidando técnica antes de subir carga.`;
  } else {
    message = 'Buen trabajo. Mantén la carga y busca completar el rango superior.';
  }
  return {
    readyToProgress: allAtUpper,
    message,
    completedUpperRange: allAtUpper,
    bestReps,
    maxRange: targetMax,
  };
}