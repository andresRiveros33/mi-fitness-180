import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const programExercises = {
  'Tren superior A': [
    ['Press de banca con mancuernas', 'superior', 3, 6, 10],
    ['Remo con mancuerna', 'superior', 3, 8, 12],
    ['Press militar sentado', 'superior', 3, 8, 12],
    ['Remo inclinado con mancuernas', 'superior', 2, 10, 15],
    ['Curl de bíceps', 'superior', 2, 10, 15],
    ['Extensión de tríceps', 'superior', 2, 10, 15],
    ['Plancha', 'core', 3, 30, 60],
  ],
  'Piernas A': [
    ['Sentadilla goblet', 'piernas', 3, 8, 12],
    ['Peso muerto rumano con mancuernas', 'piernas', 3, 8, 12],
    ['Zancadas', 'piernas', 3, 8, 12],
    ['Hip thrust con mancuerna', 'piernas', 3, 10, 15],
    ['Elevación de pantorrillas', 'piernas', 3, 12, 20],
    ['Dead bug', 'core', 3, 8, 12],
  ],
  'Tren superior B': [
    ['Press inclinado con mancuernas', 'superior', 3, 8, 12],
    ['Remo a una mano', 'superior', 3, 8, 12],
    ['Flexiones', 'superior', 3, 8, 15],
    ['Elevaciones laterales', 'superior', 3, 12, 20],
    ['Pájaros (rear delt fly)', 'superior', 2, 12, 20],
    ['Curl martillo', 'superior', 2, 10, 15],
    ['Tríceps por encima de la cabeza', 'superior', 2, 10, 15],
  ],
  'Piernas B': [
    ['Sentadilla búlgara', 'piernas', 3, 8, 12],
    ['Peso muerto rumano', 'piernas', 3, 8, 12],
    ['Step-up al banco', 'piernas', 3, 8, 12],
    ['Hip thrust', 'piernas', 3, 10, 15],
    ['Pantorrillas', 'piernas', 3, 12, 20],
    ['Plancha lateral', 'core', 3, 30, 45],
  ],
};

const monthlyGoals = [
  {
    month: 1,
    goals: [
      'Establecer rutina diaria',
      'Registrar alimentación todos los días',
      'Proteína ≥ 145 g/día',
      'Entrenamiento 4 días/semana',
      'Aumentar actividad diaria',
    ],
  },
  {
    month: 2,
    goals: ['Progresión de cargas', 'Mantener adherencia', 'Continuar pérdida gradual'],
  },
  {
    month: 3,
    goals: ['Consolidar fuerza', 'Evaluar cintura', 'Revisar tendencia de peso'],
  },
  {
    month: 4,
    goals: ['Detectar estancamientos', 'Ajustar calorías o actividad si es necesario'],
  },
  {
    month: 5,
    goals: ['Preservar músculo', 'Mantener rendimiento'],
  },
  {
    month: 6,
    goals: ['Consolidar resultados', 'Comparar día 1 contra día 180'],
  },
];

async function main() {
  console.log('🌱 Iniciando seed...');

  // 1. Default user profile
  const existing = await prisma.userProfile.findFirst();
  if (!existing) {
    await prisma.userProfile.create({
      data: {
        sex: 'masculino',
        age: 40,
        heightCm: 170,
        initialWeightKg: 73,
        activityLevel: 'sedentaria',
        trainingLevel: 'moderado',
        primaryGoal: 'perder grasa y ganar/mantener músculo',
        calorieTarget: 1850,
        proteinTarget: 145,
        fatMinTarget: 55,
        fatMaxTarget: 65,
        carbAuto: true,
        waterTargetMl: 2000,
        stepsTarget: 7000,
        fiberTarget: 25,
        creatineTargetG: 5,
      },
    });
    console.log('✅ Perfil creado');
  }

  // 2. Initial weight entry
  const weightExisting = await prisma.weightEntry.findFirst();
  if (!weightExisting) {
    await prisma.weightEntry.create({
      data: {
        date: new Date(),
        weightKg: 73,
      },
    });
    console.log('✅ Peso inicial registrado');
  }

  // 3. Exercise program
  const count = await prisma.exercise.count();
  if (count === 0) {
    for (const [workoutName, exercises] of Object.entries(programExercises)) {
      for (const [name, category] of exercises) {
        await prisma.exercise.create({
          data: { name, category, isProgram: true },
        });
      }
    }
    console.log(`✅ ${Object.values(programExercises).flat().length} ejercicios creados`);
  }

  // 4. Monthly goals
  const goalCount = await prisma.monthlyGoal.count();
  if (goalCount === 0) {
    for (const { month, goals } of monthlyGoals) {
      await prisma.monthlyGoal.create({
        data: { month, goals: JSON.stringify(goals) },
      });
    }
    console.log('✅ 6 objetivos mensuales creados');
  }

  console.log('🎉 Seed completado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });