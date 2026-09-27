// Programa de entrenamiento: 4 días Torso / Pierna con descanso activo.
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
// Ejercicios reutilizables (el nombre debe ser idéntico en todos los
// días que lo usan para que el historial se unifique).
// ---------------------------------------------------------------

const sentadillaLibre: ExercisePlan = {
  name: 'Sentadilla libre (peso corporal)',
  category: 'piernas',
  sets: 3,
  min: 10,
  max: 20,
  unit: 'reps',
  bodyweight: true,
  notes: 'Desciende profundo con el pecho arriba y las rodillas alineadas con los pies. Empuja el suelo al subir.',
};

const sentadillaGoblet: ExercisePlan = {
  name: 'Sentadilla Goblet con mancuerna',
  category: 'piernas',
  sets: 3,
  min: 8,
  max: 12,
  unit: 'reps',
  notes: 'Mancuerna al pecho, desciende profundo sin despegar los talones. Pecho arriba y rodillas abiertas hacia fuera.',
};

const pesoMuertoRumano: ExercisePlan = {
  name: 'Peso muerto rumano con mancuernas o barra',
  category: 'piernas',
  sets: 3,
  min: 8,
  max: 12,
  unit: 'reps',
  aliases: ['Peso muerto rumano con barra'],
  notes: 'Piernas ligeramente flexionadas, empuja las caderas atrás y baja hasta sentir tensión en los isquios. Espalda recta.',
};

const elevacionTalones: ExercisePlan = {
  name: 'Elevación de talones de pie',
  category: 'piernas',
  sets: 3,
  min: 12,
  max: 25,
  unit: 'reps',
  bodyweight: true,
  notes: 'De pie en el borde de un escalón, sube completo sobre las puntas y baja estirando. Controla el movimiento.',
};

const plancha: ExercisePlan = {
  name: 'Plancha abdominal',
  category: 'core',
  sets: 3,
  min: 30,
  max: 60,
  unit: 'seg',
  bodyweight: true,
  notes: 'Cuerpo en línea recta, contrae abdomen y glúteos. No hundes la cadera ni elevas la cadera.',
};

const pressBanca: ExercisePlan = {
  name: 'Press de banca plano con barra o mancuernas',
  category: 'empuje',
  sets: 3,
  min: 8,
  max: 12,
  unit: 'reps',
  aliases: ['Press de banca plano con mancuernas'],
  notes: 'Aprieta las escápulas contra el banco, baja controlado hasta el pecho y empuja sin bloquear los codos.',
};

const remoHorizontal: ExercisePlan = {
  name: 'Remo horizontal con barra o mancuernas',
  category: 'tirón',
  sets: 3,
  min: 8,
  max: 12,
  unit: 'reps',
  notes: 'Espalda recta, jala hacia el abdomen y aprieta la espalda un segundo en la contracción. Baja controlado.',
};

const pressMilitar: ExercisePlan = {
  name: 'Press militar de pie con mancuernas',
  category: 'empuje',
  sets: 3,
  min: 8,
  max: 12,
  unit: 'reps',
  notes: 'De pie con abdomen firme, presiona en arco evitando arquear la zona baja. Baja las mancuernas hasta la altura de la barbilla.',
};

const laterales: ExercisePlan = {
  name: 'Elevaciones laterales con mancuernas o banda',
  category: 'hombro',
  sets: 3,
  min: 12,
  max: 20,
  unit: 'reps',
  aliases: ['Elevaciones laterales con banda elástica'],
  notes: 'Sube los brazos hasta el paralelogramo del suelo y baja controlado. Sin impulso ni rebote.',
};

const curlBarra: ExercisePlan = {
  name: 'Curl de bíceps con barra romana',
  category: 'tirón',
  sets: 3,
  min: 10,
  max: 15,
  unit: 'reps',
  notes: 'Codos pegados al torso, sube la barra sin balanceo y baja controlado hasta extensión completa.',
};

const pressFrances: ExercisePlan = {
  name: 'Extensión de tríceps en banco (Press francés)',
  category: 'empuje',
  sets: 3,
  min: 10,
  max: 15,
  unit: 'reps',
  aliases: ['Extensión de tríceps con barra romana o banda'],
  notes: 'Banco a la altura de la cabeza, codos fijos y apuntando al frente. Baja hasta 90° y extiende completo.',
};

const zancadasCaminando: ExercisePlan = {
  name: 'Zancadas / Lunges caminando',
  category: 'piernas',
  sets: 3,
  min: 10,
  max: 20,
  unit: 'reps',
  bodyweight: true,
  aliases: ['Zancadas / Lunges alternadas'],
  notes: 'Paso largo caminando, rodilla trasera cerca del suelo y torso erguido. Alterna el ritmo de piernas.',
};

const pressInclinado: ExercisePlan = {
  name: 'Press inclinado con mancuernas en banco',
  category: 'empuje',
  sets: 3,
  min: 8,
  max: 12,
  unit: 'reps',
  notes: 'Banco a 30-45°, escápulas atrás, baja las mancuernas a la altura del pecho y empuja sin bloquear codos.',
};

const remoUnaMano: ExercisePlan = {
  name: 'Remo a una mano en banco con mancuerna',
  category: 'tirón',
  sets: 3,
  min: 8,
  max: 12,
  unit: 'reps',
  notes: 'Apoya una mano y una rodilla en el banco, espalda en línea recta. Jala hacia la cadera y no gires el tronco.',
};

const flexionesPecho: ExercisePlan = {
  name: 'Flexiones de pecho (Push-ups)',
  category: 'empuje',
  sets: 3,
  min: 8,
  max: 15,
  unit: 'reps',
  bodyweight: true,
  notes: 'Cuerpo en línea recta, baja hasta que el pecho toque el suelo y empuja explosivo. Aprieta glúteos y abdomen.',
};

const pullover: ExercisePlan = {
  name: 'Pullover con mancuerna en banco',
  category: 'tirón',
  sets: 3,
  min: 10,
  max: 15,
  unit: 'reps',
  notes: 'Acostado sobre el banco, baja la mancuerna detrás de la cabeza con los brazos casi rectos y vuelve sobre el pecho.',
};

const curlMartillo: ExercisePlan = {
  name: 'Curl martillo con mancuernas',
  category: 'tirón',
  sets: 3,
  min: 10,
  max: 15,
  unit: 'reps',
  notes: 'Palmas enfrentadas, sube controlado y baja lento. Codos fijos junto al cuerpo.',
};

const fondosBanco: ExercisePlan = {
  name: 'Fondos en banco (Bench dips)',
  category: 'empuje',
  sets: 3,
  min: 8,
  max: 15,
  unit: 'reps',
  bodyweight: true,
  notes: 'Manos en el borde del banco, baja hasta 90° en los codos y sube empujando. Piernas extendidas para más dificultad.',
};

const zancadasEstaticas: ExercisePlan = {
  name: 'Zancadas estáticas en sitio',
  category: 'piernas',
  sets: 3,
  min: 20,
  max: 30,
  unit: 'reps',
  bodyweight: true,
  notes: 'En una pierna, la rodilla trasera casi toca el suelo y la delantera queda sobre el tobillo. Sin rebote, mantiene la posición.',
};

const elevacionPiernas: ExercisePlan = {
  name: 'Elevación de piernas en banco (abdomen)',
  category: 'core',
  sets: 3,
  min: 12,
  max: 20,
  unit: 'reps',
  bodyweight: true,
  notes: 'Acostado en el banco, sube las piernas rectas hasta la vertical y baja lento sin tocar el suelo.',
};

const bicicleta: ExercisePlan = {
  name: 'Bicicleta estática (cardio suave)',
  category: 'cardio',
  sets: 3,
  min: 10,
  max: 20,
  unit: 'min',
  bodyweight: true,
  notes: 'Ritmo cómodo que permita conversar, cadencia constante y resistencia baja. Registra los minutos por serie.',
};

const caminata: ExercisePlan = {
  name: 'Caminata rápida',
  category: 'cardio',
  sets: 3,
  min: 15,
  max: 30,
  unit: 'min',
  bodyweight: true,
  notes: 'A paso rápido, con los brazos activos y el tronco erguido. Registra los minutos por serie.',
};

// ---------------------------------------------------------------
// Semana de 4 días: Torso / Pierna
// ---------------------------------------------------------------

export const PROGRAM: ProgramDay[] = [
  {
    name: 'Torso A',
    schedule: 'Lunes',
    dow: 1,
    focus: 'Empuje / Fuerza',
    exercises: [
      pressBanca,
      remoHorizontal,
      pressMilitar,
      laterales,
      curlBarra,
      pressFrances,
    ],
  },
  {
    name: 'Pierna A',
    schedule: 'Martes',
    dow: 2,
    focus: 'Cuádriceps y Pantorrilla',
    exercises: [
      sentadillaLibre,
      sentadillaGoblet,
      zancadasCaminando,
      pesoMuertoRumano,
      elevacionTalones,
      plancha,
    ],
  },
  {
    name: 'Cardio',
    schedule: 'Miércoles',
    dow: 3,
    focus: 'Descanso activo',
    cardio: true,
    exercises: [bicicleta, caminata],
  },
  {
    name: 'Torso B',
    schedule: 'Jueves',
    dow: 4,
    focus: 'Tracción / Hipertrofia',
    exercises: [
      pressInclinado,
      remoUnaMano,
      flexionesPecho,
      pullover,
      curlMartillo,
      fondosBanco,
    ],
  },
  {
    name: 'Pierna B',
    schedule: 'Viernes',
    dow: 5,
    focus: 'Posterior y Core',
    exercises: [pesoMuertoRumano, sentadillaGoblet, zancadasEstaticas, elevacionTalones, elevacionPiernas],
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
