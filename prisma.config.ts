import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

config()

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/touchcontents_crm?schema=public'

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
})
