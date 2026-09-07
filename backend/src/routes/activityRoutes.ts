import { Router } from 'express';
import { prisma } from '../index.js';
import { activitySchema } from '../lib/validations.js';
import { startOfDay } from '../lib/calculations.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const where = req.query.days
      ? { date: { gte: startOfDay(new Date(Date.now() - Number(req.query.days) * 86400000)) } }
      : {};
    const entries = await prisma.dailyActivity.findMany({ where, orderBy: { date: 'asc' } });
    res.json(entries);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = activitySchema.parse(req.body);
    const date = startOfDay(new Date(data.date));
    const existing = await prisma.dailyActivity.findUnique({ where: { date } });
    const entry = existing
      ? await prisma.dailyActivity.update({ where: { date }, data })
      : await prisma.dailyActivity.create({ data: { ...data, date } });
    res.json(entry);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

export default router;