import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { monthlyGoalUpdateSchema } from '../lib/validations.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const goals = await prisma.monthlyGoal.findMany({ orderBy: { month: 'asc' } });
    res.json(
      goals.map((g) => {
        let parsed: string[];
        try {
          parsed = JSON.parse(g.goals);
        } catch {
          parsed = g.goals.split('\n').filter(Boolean);
        }
        return { id: g.id, month: g.month, goals: parsed };
      })
    );
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.put('/:month', async (req, res) => {
  try {
    const month = z.coerce.number().int().min(1).max(6).parse(req.params.month);
    const { goals } = monthlyGoalUpdateSchema.parse({ ...req.body, month });
    const existing = await prisma.monthlyGoal.findUnique({ where: { month } });
    const saved = existing
      ? await prisma.monthlyGoal.update({
          where: { month },
          data: { goals: JSON.stringify(goals) },
        })
      : await prisma.monthlyGoal.create({ data: { month, goals: JSON.stringify(goals) } });
    res.json(saved);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

export default router;