import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

// Valores por 100 g (fuente: aproximaciones estándar, editables en la app)
const basicFoods: Array<{ name: string; kcal: number; prot: number; carbs: number; fat: number; fiber: number }> = [
  { name: 'Huevo', kcal: 143, prot: 12.6, carbs: 0.7, fat: 9.5, fiber: 0 },
  { name: 'Clara de huevo', kcal: 52, prot: 10.9, carbs: 0.7, fat: 0.2, fiber: 0 },
  { name: 'Pechuga de pollo', kcal: 165, prot: 31, carbs: 0, fat: 3.6, fiber: 0 },
  { name: 'Carne magra de res', kcal: 200, prot: 26, carbs: 0, fat: 10, fiber: 0 },
  { name: 'Pescado blanco', kcal: 82, prot: 18, carbs: 0, fat: 0.9, fiber: 0 },
  { name: 'Atún en lata (en agua)', kcal: 116, prot: 25.5, carbs: 0, fat: 0.8, fiber: 0 },
  { name: 'Arroz blanco cocido', kcal: 130, prot: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
  { name: 'Papa cocida', kcal: 87, prot: 1.9, carbs: 20, fat: 0.1, fiber: 1.8 },
  { name: 'Avena', kcal: 389, prot: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6 },
  { name: 'Arepa', kcal: 220, prot: 3, carbs: 43, fat: 4, fiber: 2 },
  { name: 'Fríjoles cocidos', kcal: 127, prot: 8.7, carbs: 22, fat: 0.5, fiber: 6 },
  { name: 'Lentejas cocidas', kcal: 116, prot: 9, carbs: 20, fat: 0.4, fiber: 7.9 },
  { name: 'Yogur griego natural', kcal: 59, prot: 10, carbs: 3.6, fat: 0.4, fiber: 0 },
  { name: 'Leche descremada', kcal: 34, prot: 3.4, carbs: 5, fat: 0.1, fiber: 0 },
  { name: 'Leche entera', kcal: 61, prot: 3.2, carbs: 4.8, fat: 3.3, fiber: 0 },
  { name: 'Banano', kcal: 89, prot: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 },
  { name: 'Manzana', kcal: 52, prot: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4 },
  { name: 'Aguacate', kcal: 160, prot: 2, carbs: 8.5, fat: 14.7, fiber: 6.7 },
  { name: 'Almendras', kcal: 579, prot: 21.2, carbs: 21.6, fat: 49.9, fiber: 12.5 },
  { name: 'Nueces', kcal: 654, prot: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7 },
  { name: 'Quinoa cocida', kcal: 120, prot: 4.4, carbs: 21.3, fat: 1.9, fiber: 2.8 },
  { name: 'Espinaca', kcal: 23, prot: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  { name: 'Brócoli', kcal: 34, prot: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6 },
  { name: 'Tomate', kcal: 18, prot: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
  { name: 'Zanahoria', kcal: 41, prot: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8 },
  { name: 'Camarones', kcal: 99, prot: 24, carbs: 0.2, fat: 0.3, fiber: 0 },
  { name: 'Tofu', kcal: 76, prot: 8, carbs: 1.9, fat: 4.8, fiber: 0.3 },
  { name: 'Pan integral', kcal: 247, prot: 13, carbs: 41, fat: 3.4, fiber: 7 },
  { name: 'Pasta integral cocida', kcal: 124, prot: 5.3, carbs: 24.9, fat: 0.5, fiber: 1.5 },
  { name: 'Salmón', kcal: 208, prot: 20.4, carbs: 0, fat: 13.4, fiber: 0 },
  { name: 'Requesón (cottage)', kcal: 98, prot: 11, carbs: 3.4, fat: 4.3, fiber: 0 },
  { name: 'Mantequilla de maní', kcal: 588, prot: 25, carbs: 20, fat: 50, fiber: 6 },
  { name: 'Arándanos', kcal: 57, prot: 0.7, carbs: 14.5, fat: 0.3, fiber: 2.4 },
  { name: 'Café (sin azúcar)', kcal: 1, prot: 0.1, carbs: 0.2, fat: 0, fiber: 0 },
  { name: 'Aceite de oliva', kcal: 884, prot: 0, carbs: 0, fat: 100, fiber: 0 },
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

  // 5. Basic foods
  const foodCount = await prisma.food.count();
  if (foodCount === 0) {
    for (const f of basicFoods) {
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
    }
    console.log(`✅ ${basicFoods.length} alimentos básicos creados`);
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