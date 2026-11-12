import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { openDatabase, migrate, seed } from './db.js';
import { createApp } from './app.js';
import { seedExtended } from './seed-extended.js';
import { seedOperational } from './seed-operational.js';
if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
)
  throw new Error('Configure JWT_SECRET com pelo menos 32 caracteres.');
const db = await openDatabase();
await migrate(db);
if (process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO === 'true') {
  await seed(db);
  await seedExtended(db);
  await seedOperational(db);
}
const app = createApp(db, process.env.JWT_SECRET || randomBytes(48).toString('hex'));
if (process.env.NODE_ENV !== 'production')
  console.log('Modo demo: dados fictícios. Senha de teste: Demo@2026!');
const frontend = fileURLToPath(new URL('../../frontend/dist', import.meta.url));
app.use(express.static(frontend));
app.get('/{*path}', (_req, res) => res.sendFile(frontend + '/index.html'));
const server = app.listen(Number(process.env.PORT || 3001), '0.0.0.0', () =>
  console.log('API: http://localhost:3001'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  });
