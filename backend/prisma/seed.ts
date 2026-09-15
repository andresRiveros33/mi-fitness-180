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
  Push: [
    ['Flexiones de pecho (Push-ups)', 'empuje', 3, 8, 15],
    ['Fondos en banco (Bench dips)', 'empuje', 3, 8, 15],
    ['Press de banca plano con mancuernas', 'empuje', 3, 8, 12],
    ['Press militar de pie con mancuernas', 'empuje', 3, 8, 12],
    ['Elevaciones laterales con banda elástica', 'hombro', 3, 12, 20],
    ['Extensión de tríceps con barra romana o banda', 'empuje', 2, 10, 15],
  ],
  Pull: [
    ['Remo horizontal con barra o mancuernas', 'tirón', 3, 8, 12],
    ['Remo con banda elástica', 'tirón', 3, 12, 20],
    ['Pullover con mancuerna en banco', 'tirón', 3, 10, 15],
    ['Vuelos posteriores / Pájaro con mancuernas', 'tirón', 3, 12, 20],
    ['Curl de bíceps con barra romana', 'tirón', 3, 10, 15],
    ['Curl martillo con mancuernas', 'tirón', 2, 10, 15],
    ['Plancha abdominal', 'core', 3, 30, 60],
  ],
  Legs: [
    ['Sentadilla libre (peso corporal)', 'piernas', 3, 10, 20],
    ['Sentadilla Goblet con mancuerna', 'piernas', 3, 8, 12],
    ['Peso muerto rumano con barra', 'piernas', 3, 8, 12],
    ['Zancadas / Lunges alternadas', 'piernas', 3, 10, 20],
    ['Hip thrust en banco', 'piernas', 3, 10, 15],
    ['Elevación de talones de pie', 'piernas', 3, 12, 25],
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
  const legacyCafe = await prisma.food.findFirst({ where: { name: 'Café (sin azúcar)', isBasic: true } });
  if (legacyCafe) {
    await prisma.food.update({ where: { id: legacyCafe.id }, data: { name: 'Tinto / Café negro' } });
  }
  const catCafe = basicFoods.find((f) => f.name === 'Tinto / Café negro');
  const tinto = await prisma.food.findFirst({ where: { name: 'Tinto / Café negro', isBasic: true } });
  if (tinto && catCafe) {
    await prisma.food.update({
      where: { id: tinto.id },
      data: {
        kcalPer100: catCafe.kcal,
        proteinPer100: catCafe.prot,
        carbsPer100: catCafe.carbs,
        fatsPer100: catCafe.fat,
        fiberPer100: catCafe.fiber,
      },
    });
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