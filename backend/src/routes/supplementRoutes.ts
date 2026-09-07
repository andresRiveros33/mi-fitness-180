import { Router } from 'express';
import { prisma } from '../index.js';
import { supplementSchema } from '../lib/validations.js';
import { startOfDay } from '../lib/calculations.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const supplements = await prisma.supplement.findMany({
      where: req.query.days
        ? { date: { gte: startOfDay(new Date(Date.now() - Number(req.query.days) * 86400000)) } }
        : {},
      orderBy: { date: 'desc' },
      take: 90,
    });
    res.json(supplements);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = supplementSchema.parse(req.body);
    const date = startOfDay(new Date(data.date));
    const existing = await prisma.supplement.findUnique({ where: { date } });
    const entry = existing
      ? await prisma.supplement.update({ where: { date }, data })
      : await prisma.supplement.create({ data: { ...data, date } });
    res.json(entry);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

export default router;