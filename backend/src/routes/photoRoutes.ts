import { Router } from 'express';
import { prisma } from '../index.js';
import { photoSchema, idParamSchema } from '../lib/validations.js';
import { startOfDay } from '../lib/calculations.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const photos = await prisma.progressPhoto.findMany({
      orderBy: { date: 'desc' },
      take: 60,
    });
    const all = await prisma.progressPhoto.findMany({ orderBy: { date: 'asc' } });
    res.json({ photos, count: all.length });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = photoSchema.parse(req.body);
    const saved = await prisma.progressPhoto.create({
      data: { ...data, date: startOfDay(new Date(data.date)) },
    });
    res.json(saved);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await prisma.progressPhoto.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

export default router;