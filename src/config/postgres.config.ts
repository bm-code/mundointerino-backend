import { registerAs } from '@nestjs/config'

export default registerAs('postgres', () => ({
  url: process.env.DATABASE_URL || '',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB || 'mundointerino',
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '',
  ssl: process.env.PGSSL === 'true',
  enabled: !!process.env.DATABASE_URL,
}))
