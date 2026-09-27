// Demostraciones visuales de cada ejercicio del programa.
//
// Las imágenes viven fuera de la app (repositorio público free-exercise-db servido
// por jsDelivr): el bundle no crece y la carga inicial no se ve afectada porque
// solo se piden cuando el usuario abre la guía técnica de un ejercicio.
//
// Cada ejercicio trae dos fotogramas (inicio y fin del movimiento) que el visor
// alterna para animar la ejecución. El modal pide primero el de inicio (~60 KB)
// y solo después el de fin, así que la ventana se abre de inmediato. Muy por
// debajo del peso de un GIF real, y además queda cacheado por el service worker
// para las siguientes visitas. Los nombres de los ejercicios son los mismos que
// en el programa del backend, así que la búsqueda es por nombre exacto.
const CDN = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises';

const MEDIA: Record<string, string> = {
  'Sentadilla libre (peso corporal)': 'Bodyweight_Squat',
  'Sentadilla Goblet con mancuerna': 'Goblet_Squat',
  'Peso muerto rumano con mancuernas o barra': 'Barbell_Deadlift',
  'Elevación de talones de pie': 'Calf_Raise_On_A_Dumbbell',
  'Press de banca plano con barra o mancuernas': 'Dumbbell_Bench_Press',
  'Remo horizontal con barra o mancuernas': 'Bent_Over_Two-Dumbbell_Row',
  'Press militar de pie con mancuernas': 'Alternating_Cable_Shoulder_Press',
  'Elevaciones laterales con mancuernas o banda': 'Cable_Seated_Lateral_Raise',
  'Curl de bíceps con barra romana': 'EZ-Bar_Curl',
  'Extensión de tríceps en banco (Press francés)': 'Lying_Close-Grip_Barbell_Triceps_Extension_Behind_The_Head',
  'Zancadas / Lunges caminando': 'Bodyweight_Walking_Lunge',
  'Press inclinado con mancuernas en banco': 'Incline_Dumbbell_Press',
  'Remo a una mano en banco con mancuerna': 'One-Arm_Dumbbell_Row',
  'Flexiones de pecho (Push-ups)': 'Incline_Push-Up',
  'Pullover con mancuerna en banco': 'Bent-Arm_Dumbbell_Pullover',
  'Curl martillo con mancuernas': 'Hammer_Curls',
  'Fondos en banco (Bench dips)': 'Bench_Dips',
  'Zancadas estáticas en sitio': 'Dumbbell_Rear_Lunge',
  'Elevación de piernas en banco (abdomen)': 'Flat_Bench_Lying_Leg_Raise',
  'Plancha abdominal': 'Plank',
  'Bicicleta estática (cardio suave)': 'Air_Bike',
  'Caminata rápida': 'Jogging_Treadmill',
};

/** Fotogramas de la demostración de un ejercicio, en orden de ejecución. */
export interface ExerciseMedia {
  start: string;
  end: string;
}

/**
 * Fotogramas de la demostración de un ejercicio, o `null` si el ejercicio no
 * tiene imagen mapeada. La guía técnica muestra en ese caso una imagen estática
 * genérica con la indicación de técnica, así que nunca queda un hueco vacío.
 */
export function getExerciseMedia(name: string): ExerciseMedia | null {
  const slug = MEDIA[name];
  if (!slug) return null;
  return { start: `${CDN}/${slug}/0.jpg`, end: `${CDN}/${slug}/1.jpg` };
}
