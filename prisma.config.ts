import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

config()

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/touchcontents_crm?schema=public'

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: databaseUrl,
  },
  migrate: {
    adapter: async () => {
      const { PrismaPg } = await import('@prisma/adapter-pg')
      const { Pool } = await import('pg')
      const pool = new Pool({ connectionString: databaseUrl })
      return new PrismaPg(pool)
    },
  },
})
