import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import userRoutes from './routes/userRoutes.js';
import weightRoutes from './routes/weightRoutes.js';
import measurementRoutes from './routes/measurementRoutes.js';
import workoutRoutes from './routes/workoutRoutes.js';
import nutritionRoutes from './routes/nutritionRoutes.js';
import supplementRoutes from './routes/supplementRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import photoRoutes from './routes/photoRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import backupRoutes from './routes/backupRoutes.js';

export const prisma = new PrismaClient();

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Simple request logging
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    setTimeout(next, 0);
  } else {
    next();
  }
});

app.use('/api/users', userRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/supplements', supplementRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/backup', backupRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Ha ocurrido un error interno' });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Mi Fitness 180 API escuchando en http://localhost:${PORT}`);
});