import { Router } from 'express';
import { prisma } from '../index.js';
import { weightSchema, idParamSchema, dateQuerySchema } from '../lib/validations.js';
import { startOfDay, toISODate } from '../lib/calculations.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { days } = dateQuerySchema.parse(req.query);
    const where = days ? { date: { gte: startOfDay(new Date(Date.now() - days * 86400000)) } } : {};
    const entries = await prisma.weightEntry.findMany({ where, orderBy: { date: 'asc' } });
    res.json(entries);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = weightSchema.parse(req.body);
    const date = startOfDay(new Date(data.date));
    const existing = await prisma.weightEntry.findUnique({ where: { date } });
    const entry = existing
      ? await prisma.weightEntry.update({ where: { date }, data: { weightKg: data.weightKg } })
      : await prisma.weightEntry.create({ data: { ...data, date } });
    res.json(entry);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await prisma.weightEntry.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// Weekly averages
router.get('/weekly', async (_req, res) => {
  try {
    const entries = await prisma.weightEntry.findMany({ orderBy: { date: 'asc' } });
    const groups = new Map<string, { date: string; values: number[] }>();
    for (const e of entries) {
      const d = new Date(e.date);
      const ws = new Date(d);
      ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7));
      const key = toISODate(ws);
      if (!groups.has(key)) groups.set(key, { date: key, values: [] });
      groups.get(key)!.values.push(e.weightKg);
    }
    const result = Array.from(groups.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((g) => ({
        date: g.date,
        avg: Math.round((g.values.reduce((s, v) => s + v, 0) / g.values.length) * 100) / 100,
      }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;