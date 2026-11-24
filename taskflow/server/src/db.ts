import 'dotenv/config'
import { Pool } from 'pg'

const password = process.env.DB_PASSWORD

if (!password) {
  throw new Error('Falta DB_PASSWORD en server/.env')
}

export const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'taskflow',
  user: process.env.DB_USER ?? 'taskflow_app',
  password,
  connectionTimeoutMillis: 3000,
})
