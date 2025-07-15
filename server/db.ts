import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Check if we're using local PostgreSQL or Neon
const isLocalPostgres = process.env.DATABASE_URL?.includes('localhost') || 
                       process.env.DATABASE_URL?.includes('127.0.0.1') ||
                       process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL;

let pool: Pool | undefined;
let db: any;

if (isLocalPostgres) {
  // Use local PostgreSQL
  const client = postgres(process.env.DATABASE_URL);
  db = drizzlePg(client, { schema });
} else {
  // Use Neon Database
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { pool, db };