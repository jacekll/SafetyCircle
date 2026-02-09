import { config } from "dotenv";
import path from 'path';
config({ path: path.resolve(process.cwd(), ".env.test") });

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { migrate as migrateNeon } from 'drizzle-orm/neon-serverless/migrator';
import { sql } from 'drizzle-orm';

// Check if we're using local PostgreSQL or Neon
const isLocalPostgres = process.env.DATABASE_URL?.includes('localhost') ||
                       process.env.DATABASE_URL?.includes('127.0.0.1') ||
                       process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL;

/**
 * Creates all database tables for testing using Drizzle migrations
 */
export async function createTestSchema() {
  const { db } = await import('../server/db.js');
  console.log('Creating test database schema...');

  try {
    // First, ensure we start fresh by dropping any existing migration tracking
    await db.execute(sql`DROP TABLE IF EXISTS drizzle.__drizzle_migrations CASCADE`);

    const migrationsFolder = path.join(process.cwd(), 'migrations');

    if (isLocalPostgres) {
      await migrate(db, { migrationsFolder });
    } else {
      await migrateNeon(db, { migrationsFolder });
    }

    console.log('Test schema created successfully');
  } catch (error) {
    console.error('Failed to create schema:', error);
    throw error;
  }
}

/**
 * Drops all database tables and cleans up test data
 */
export async function dropTestSchema() {
  const { db } = await import('../server/db.js');
  console.log('Dropping test database schema...');
  try {
    // Drop tables in reverse order of dependencies
    await db.execute(sql`DROP TABLE IF EXISTS public.emergency_contacts CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS public.archived_alerts CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS public.alerts CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS public.group_members CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS public.groups CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS public.users CASCADE`);

    // Also drop the migration tracking table (in drizzle schema)
    await db.execute(sql`DROP TABLE IF EXISTS drizzle.__drizzle_migrations CASCADE`);

    console.log('Test schema dropped successfully');
  } catch (error) {
    console.error('Failed to drop schema:', error);
    throw error;
  }
}

/**
 * Cleans up test data without dropping schema
 */
export async function cleanTestData() {
  const { db } = await import('../server/db.js');
  console.log('Cleaning test data...');

  try {
    // Delete data in reverse order of dependencies
    await db.execute(sql`DELETE FROM emergency_contacts`);
    await db.execute(sql`DELETE FROM archived_alerts`);
    await db.execute(sql`DELETE FROM alerts`);
    await db.execute(sql`DELETE FROM group_members`);
    await db.execute(sql`DELETE FROM groups`);
    await db.execute(sql`DELETE FROM users`);

    console.log('Test data cleaned successfully');
  } catch (error) {
    console.error('Failed to clean data:', error);
    throw error;
  }
}

/**
 * Sets up the test environment (creates schema)
 */
export async function setupTestEnvironment() {
  await createTestSchema();
}

/**
 * Tears down the test environment (drops schema)
 */
export async function teardownTestEnvironment() {
  await dropTestSchema();

  // Close database connections to ensure all operations complete
  try {
    const { db } = await import('../server/db.js');
    if ((db as any).$client) {
      // Local postgres-js connection
      await (db as any).$client.end();
      console.log('Database client closed');
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}
