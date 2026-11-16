// Programa de acondicionamiento base: 3 días por semana (Lunes, Miércoles y Viernes).
// Fuente única de verdad para las rutas de workout, el dashboard y el seed.

export interface ExercisePlan {
  name: string;
  sets: number;
  min: number;
  max: number;
  unit: string;
  notes?: string;
  mediaUrl?: string;
  bodyweight?: boolean;
  /** Grupo muscular con el que se guarda el ejercicio en la base de datos. */
  category?: string;
  /**
   * Nombres anteriores del mismo ejercicio. Se usan para enlazar con el
   * registro de `Exercise` que ya existe en la base de datos, de modo que
   * renombrar un ejercicio no parte su historial en dos.
   */
  aliases?: string[];
}

export interface ProgramDay {
  name: string;
  schedule: string;
  dow: number;
  focus: string;
  /** El día de cardio cuenta como sesión, pero no como día de fuerza. */
  cardio?: boolean;
  exercises: ExercisePlan[];
}

// ---------------------------------------------------------------
// Ejercicios del bloque de acondicionamiento base.
// ---------------------------------------------------------------

const dominadasAustralianas: ExercisePlan = {
  name: 'Dominadas australianas (remo invertido)',
  category: 'tirón',
  sets: 3,
  min: 8,
  max: 10,
  unit: 'reps',
  bodyweight: true,
  notes:
    'Barra a la altura de la cadera. Cuerpo en línea recta, jala el pecho hacia la barra apretando la espalda y baja controlado sin perder la posición.',
};

const pressBancaMancuernas: ExercisePlan = {
  name: 'Press de banca con mancuernas',
  category: 'empuje',
  sets: 3,
  min: 8,
  max: 10,
  unit: 'reps',
  aliases: ['Press de banca plano con barra o mancuernas', 'Press de banca plano con mancuernas'],
  notes:
    'Aprieta las escápulas contra el banco, baja las mancuernas a la altura del pecho y empuja sin bloquear los codos. Muñecas firmes.',
};

const remoUnaMano: ExercisePlan = {
  name: 'Remo con mancuerna a una mano',
  category: 'tirón',
  sets: 3,
  min: 10,
  max: 10,
  unit: 'reps',
  aliases: ['Remo a una mano en banco con mancuerna'],
  notes:
    'Apoya una mano y una rodilla en el banco, espalda en línea recta. Jala la mancuerna hacia la cadera y aprieta el dorsal sin girar el tronco.',
};

const fondosBanco: ExercisePlan = {
  name: 'Fondos en banco (Bench dips)',
  category: 'empuje',
  sets: 3,
  min: 8,
  max: 12,
  unit: 'reps',
  bodyweight: true,
  notes:
    'Manos en el borde del banco, baja hasta 90° en los codos y sube empujando. Mantén los hombros abajo y el pecho alto.',
};

const sentadillaMancuernaBarra: ExercisePlan = {
  name: 'Sentadilla con mancuerna o barra',
  category: 'piernas',
  sets: 3,
  min: 10,
  max: 10,
  unit: 'reps',
  aliases: ['Sentadilla Goblet con mancuerna'],
  notes:
    'Pecho arriba, rodillas alineadas con los pies y descenso profundo sin despegar los talones. Empuja el suelo al subir.',
};

const pesoMuertoRumano: ExercisePlan = {
  name: 'Peso muerto rumano con mancuernas o barra',
  category: 'piernas',
  sets: 3,
  min: 10,
  max: 10,
  unit: 'reps',
  aliases: ['Peso muerto rumano con barra'],
  notes:
    'Piernas ligeramente flexionadas, empuja las caderas atrás y baja hasta sentir tensión en los isquios. Espalda recta y barra cerca del cuerpo.',
};

const sentadillaBulgaria: ExercisePlan = {
  name: 'Sentadilla búlgara (por pierna)',
  category: 'piernas',
  sets: 2,
  min: 8,
  max: 8,
  unit: 'reps',
  notes:
    'Pie trasero sobre un banco, pie delantero firme. Baja la rodilla trasera cerca del suelo y sube sin perder el equilibrio. Completa las 8 repeticiones por pierna.',
};

const elevacionTalones: ExercisePlan = {
  name: 'Elevación de talones de pie',
  category: 'piernas',
  sets: 3,
  min: 15,
  max: 15,
  unit: 'reps',
  bodyweight: true,
  notes:
    'De pie en el borde de un escalón, sube completo sobre las puntas y baja estirando los gemelos. Pausa arriba y controla el descenso.',
};

const dominadasNegativas: ExercisePlan = {
  name: 'Dominadas negativas (excéntricas)',
  category: 'tirón',
  sets: 3,
  min: 3,
  max: 5,
  unit: 'reps',
  bodyweight: true,
  notes:
    'Sube con ayuda o salta hasta la barra y baja lo más lento posible (4-5 segundos) hasta extensión completa. Cada bajada controlada cuenta como una repetición.',
};

const pressMilitar: ExercisePlan = {
  name: 'Press militar de pie con mancuernas',
  category: 'empuje',
  sets: 3,
  min: 8,
  max: 10,
  unit: 'reps',
  notes:
    'De pie con abdomen firme, presiona en arco evitando arquear la zona baja. Baja las mancuernas hasta la altura de la barbilla.',
};

const curlBiceps: ExercisePlan = {
  name: 'Curl de bíceps con mancuernas o barra',
  category: 'tirón',
  sets: 3,
  min: 10,
  max: 10,
  unit: 'reps',
  aliases: ['Curl de bíceps con barra romana'],
  notes:
    'Codos pegados al torso, sube sin balanceo y baja controlado hasta extensión completa. Aprieta el bíceps arriba.',
};

const planchaORueda: ExercisePlan = {
  name: 'Plancha o rueda abdominal',
  category: 'core',
  sets: 3,
  min: 20,
  max: 90,
  unit: 'seg',
  bodyweight: true,
  aliases: ['Plancha abdominal'],
  notes:
    'Plancha: cuerpo en línea recta, abdomen y glúteos firmes, hasta el fallo técnico. Rueda abdominal: rueda hacia adelante sin arquear la zona baja y registra el tiempo o las repeticiones completas.',
};

// ---------------------------------------------------------------
// Semana de 3 días: A (Lunes), B (Miércoles), C (Viernes)
// ---------------------------------------------------------------

export const PROGRAM: ProgramDay[] = [
  {
    name: 'Día A · Tracción + Pecho',
    schedule: 'Lunes',
    dow: 1,
    focus: 'Tracción y pecho',
    exercises: [dominadasAustralianas, pressBancaMancuernas, remoUnaMano, fondosBanco],
  },
  {
    name: 'Día B · Pierna Fuerte',
    schedule: 'Miércoles',
    dow: 3,
    focus: 'Pierna y glúteo',
    exercises: [sentadillaMancuernaBarra, pesoMuertoRumano, sentadillaBulgaria, elevacionTalones],
  },
  {
    name: 'Día C · Hombros, Brazos y Barra',
    schedule: 'Viernes',
    dow: 5,
    focus: 'Hombros, brazos y reto de barra',
    exercises: [dominadasNegativas, pressMilitar, curlBiceps, planchaORueda],
  },
];

export const PROGRAM_BY_DOW: Record<number, ProgramDay> = PROGRAM.reduce(
  (acc, day) => {
    acc[day.dow] = day;
    return acc;
  },
  {} as Record<number, ProgramDay>
);

export function getProgramDay(dow: number): ProgramDay | null {
  return PROGRAM_BY_DOW[dow] ?? null;
}

export const TRAINING_DAYS_PER_WEEK = PROGRAM.filter((d) => !d.cardio).length;

export const CARDIO_DAY_NAMES: string[] = PROGRAM.filter((d) => d.cardio).map((d) => d.name);

export const PROGRAM_EXERCISE_NAMES: string[] = Array.from(
  new Set(PROGRAM.flatMap((d) => d.exercises.map((e) => e.name)))
);

/** Nombres con los que se puede consultar un día del programa. */
export const PROGRAM_EXERCISE_ALIASES: string[] = Array.from(
  new Set(PROGRAM.flatMap((d) => d.exercises.flatMap((e) => e.aliases ?? [])))
);
