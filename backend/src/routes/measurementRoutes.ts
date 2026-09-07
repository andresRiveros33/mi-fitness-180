import { Router } from 'express';
import { prisma } from '../index.js';
import { measurementSchema, idParamSchema, dateQuerySchema } from '../lib/validations.js';
import { startOfDay } from '../lib/calculations.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { days } = dateQuerySchema.parse(req.query);
    const where = days ? { date: { gte: startOfDay(new Date(Date.now() - days * 86400000)) } } : {};
    const entries = await prisma.bodyMeasurement.findMany({ where, orderBy: { date: 'asc' } });
    res.json(entries);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = measurementSchema.parse(req.body);
    const date = startOfDay(new Date(data.date));
    const existing = await prisma.bodyMeasurement.findUnique({ where: { date } });
    const entry = existing
      ? await prisma.bodyMeasurement.update({ where: { date }, data })
      : await prisma.bodyMeasurement.create({ data: { ...data, date } });
    res.json(entry);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await prisma.bodyMeasurement.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

export default router;