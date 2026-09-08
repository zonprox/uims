import { defineConfig } from '@prisma/config';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required in prisma.config.ts');
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    directory: './prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
