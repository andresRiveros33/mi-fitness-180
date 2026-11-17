import './env.js';
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
import { exec } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const prisma = new PrismaClient();

const app = express();

// CORS: por defecto se permite cualquier origen (incluido Vercel). Si se define
// CORS_ORIGIN (lista separada por comas) solo se aceptan esos orígenes, el
// dominio de producción y los previews de Vercel.
const configuredOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAllOrigins = configuredOrigins.length === 0 || configuredOrigins.includes('*');
const vercelPreview = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowAllOrigins) return callback(null, true);
    if (configuredOrigins.includes(origin) || vercelPreview.test(origin)) {
      return callback(null, true);
    }
    console.warn(`CORS bloqueó el origen: ${origin}`);
    return callback(null, false);
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));
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
  // La sincronización corre después de abrir el puerto para que Render no
  // marque el servicio como caído mientras Prisma aplica el esquema.
  syncDatabase();
});

function syncDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL no está configurada: se omite prisma db push.');
    return;
  }

  // Neon entrega DATABASE_URL_UNPOOLED para migraciones. Si no está definida,
  // se usa DATABASE_URL para que el esquema no deje de sincronizarse.
  const env = {
    ...process.env,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  };
  const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

  exec(
    'npx --yes prisma db push --skip-generate',
    { cwd: backendDir, env, timeout: 120_000 },
    (error, stdout, stderr) => {
      if (error) {
        console.error('Error al sincronizar la base de datos:', (stderr || error.message).trim());
        return;
      }
      console.log('Base de datos sincronizada correctamente');
      if (stdout.trim()) console.log(stdout.trim());
    }
  );
}
