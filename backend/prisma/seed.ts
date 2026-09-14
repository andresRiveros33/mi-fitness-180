import { PrismaClient } from '@prisma/client';
import basicIngredients from '../../frontend/src/data/basicIngredients.json';

const prisma = new PrismaClient();

type BasicIngredient = {
  name: string;
  kcal: number;
  prot: number;
  carbs: number;
  fat: number;
  fiber: number;
};

const programExercises = {
  'Tren superior A': [
    ['Press de banca con mancuernas', 'superior', 3, 6, 10],
    ['Remo con mancuerna', 'superior', 3, 8, 12],
    ['Dominadas / jalón asistido', 'superior', 3, 1, 20],
    ['Press militar sentado', 'superior', 3, 8, 12],
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
    ['Fondos en paralelas o banco', 'superior', 3, 8, 12],
    ['Remo a una mano', 'superior', 3, 8, 12],
    ['Elevaciones laterales', 'superior', 3, 12, 20],
    ['Pájaros / rear delt fly', 'superior', 2, 12, 20],
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

// Valores por 100 g (fuente: frontend/src/data/basicIngredients.json, editables en la app)
const basicFoods = basicIngredients as BasicIngredient[];

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

  // 5. Basic foods (upsert: crea faltantes sin borrar datos del usuario)
  const legacyAvena = await prisma.food.findFirst({ where: { name: 'Avena', isBasic: true } });
  if (legacyAvena) {
    await prisma.food.update({ where: { id: legacyAvena.id }, data: { name: 'Avena en hojuelas' } });
  }
  let createdFoods = 0;
  for (const f of basicFoods) {
    const existingFood = await prisma.food.findFirst({ where: { name: f.name } });
    if (!existingFood) {
      await prisma.food.create({
        data: {
          name: f.name,
          kcalPer100: f.kcal,
          proteinPer100: f.prot,
          carbsPer100: f.carbs,
          fatsPer100: f.fat,
          fiberPer100: f.fiber,
          isBasic: true,
        },
      });
      createdFoods++;
    }
  }
  console.log(`✅ ${createdFoods} alimentos básicos creados (${basicFoods.length} en catálogo)`);

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