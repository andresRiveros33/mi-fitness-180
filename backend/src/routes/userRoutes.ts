import { Router } from 'express';
import { prisma } from '../index.js';
import { profileSchema } from '../lib/validations.js';

const router = Router();

// Get current profile
router.get('/profile', async (_req, res) => {
  try {
    let profile = await prisma.userProfile.findFirst();
    if (!profile) {
      profile = await prisma.userProfile.create({
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
        },
      });
    }
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Update profile
router.put('/profile', async (req, res) => {
  try {
    const data = profileSchema.parse(req.body);
    let profile = await prisma.userProfile.findFirst();
    if (!profile) {
      profile = await prisma.userProfile.create({ data: {} as never });
    }
    const updated = await prisma.userProfile.update({
      where: { id: profile!.id },
      data,
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

export default router;