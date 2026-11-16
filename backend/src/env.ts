import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

for (const path of [
  resolve(rootDir, '.env.local'),
  resolve(rootDir, '.env'),
  resolve(rootDir, 'backend', '.env'),
]) {
  if (existsSync(path)) {
    config({ path });
  }
}
