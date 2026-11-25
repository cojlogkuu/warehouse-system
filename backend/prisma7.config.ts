import 'dotenv/config'
import { defineConfig } from 'prisma/config'

/**
 * Configuration of the Prisma CLI. The URL is read without the `env()` helper so that
 * `prisma generate` also works before a `.env` file exists.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
