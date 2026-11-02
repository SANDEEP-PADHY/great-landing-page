import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { env } from '../env';

const g = globalThis as unknown as { __pg?: ReturnType<typeof postgres> };

const sql = g.__pg ?? postgres(env().DATABASE_URL, { max: 8, idle_timeout: 20, connect_timeout: 10 });
if (env().NODE_ENV !== 'production') g.__pg = sql;

export const db = drizzle(sql, { schema });
export { sql };
export type Db = typeof db;
