import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

const environmentFile = resolve(__dirname, '.env');
if (existsSync(environmentFile)) {
  process.loadEnvFile(environmentFile);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'ts-node --compiler-options \'{"module":"CommonJS"}\' prisma/seed.ts',
  },
});
