import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

export type DatabaseInstance = ReturnType<typeof drizzlePglite<typeof schema>> | ReturnType<typeof drizzlePg<typeof schema>>;

let dbInstance: DatabaseInstance | null = null;
let pgliteClient: PGlite | null = null;
let pgPool: pg.Pool | null = null;

export async function getDb(): Promise<DatabaseInstance> {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl && databaseUrl.length > 0) {
    console.log('[Database] Connecting to PostgreSQL via DATABASE_URL...');
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
    });
    dbInstance = drizzlePg(pgPool, { schema });
  } else {
    const isTest = process.env.NODE_ENV === 'test';
    const dataDir = process.env.PGLITE_DATA_DIR || (isTest ? undefined : path.resolve(process.cwd(), '.data/pglite'));

    if (dataDir) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`[Database] No DATABASE_URL specified. Initializing embedded persistent PostgreSQL (PGlite at ${dataDir})...`);
      pgliteClient = new PGlite(dataDir);
    } else {
      console.log('[Database] No DATABASE_URL specified. Initializing embedded in-memory PostgreSQL (PGlite)...');
      pgliteClient = new PGlite();
    }
    dbInstance = drizzlePglite(pgliteClient, { schema });
  }

  await ensureTablesCreated();
  await ensureActiveSeasonExists();

  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  if (pgliteClient) {
    await pgliteClient.close();
    pgliteClient = null;
  }
  dbInstance = null;
}

async function ensureTablesCreated(): Promise<void> {
  if (!dbInstance) return;

  const ddlStatements = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE,
      username VARCHAR(32) UNIQUE NOT NULL,
      display_name VARCHAR(64),
      password_hash VARCHAR(255) NOT NULL,
      email_verified BOOLEAN DEFAULT TRUE NOT NULL,
      verification_token VARCHAR(128),
      reset_password_token VARCHAR(128),
      reset_password_expires TIMESTAMPTZ,
      role VARCHAR(16) DEFAULT 'USER' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_profiles (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      avatar_id VARCHAR(64) DEFAULT 'avatar_default_01' NOT NULL,
      account_level INTEGER DEFAULT 1 NOT NULL,
      lifetime_xp INTEGER DEFAULT 0 NOT NULL,
      total_matches INTEGER DEFAULT 0 NOT NULL,
      total_wins INTEGER DEFAULT 0 NOT NULL,
      total_words_played INTEGER DEFAULT 0 NOT NULL,
      longest_word VARCHAR(32) DEFAULT '' NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seasons (
      id SERIAL PRIMARY KEY,
      season_number INTEGER UNIQUE NOT NULL,
      name VARCHAR(64) NOT NULL,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      is_active BOOLEAN DEFAULT FALSE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_rank_profiles (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      season_id INTEGER NOT NULL REFERENCES seasons(id),
      tier VARCHAR(32) DEFAULT 'NURSERY' NOT NULL,
      division INTEGER DEFAULT 3 NOT NULL,
      rank_exp INTEGER DEFAULT 0 NOT NULL,
      scientist_points INTEGER DEFAULT 0 NOT NULL,
      highest_tier VARCHAR(32) DEFAULT 'NURSERY' NOT NULL,
      highest_scientist_points INTEGER DEFAULT 0 NOT NULL,
      hidden_mmr INTEGER DEFAULT 1000 NOT NULL,
      season_matches INTEGER DEFAULT 0 NOT NULL,
      season_wins INTEGER DEFAULT 0 NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      PRIMARY KEY (user_id, season_id)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      room_code VARCHAR(8) NOT NULL,
      game_mode VARCHAR(16) NOT NULL,
      season_id INTEGER REFERENCES seasons(id),
      status VARCHAR(16) NOT NULL,
      winner_user_id UUID REFERENCES users(id),
      total_rounds INTEGER DEFAULT 0 NOT NULL,
      duration_seconds INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      completed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS match_players (
      id SERIAL PRIMARY KEY,
      match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id),
      placement INTEGER,
      words_submitted INTEGER DEFAULT 0 NOT NULL,
      rank_exp_change INTEGER DEFAULT 0 NOT NULL,
      scientist_points_change INTEGER DEFAULT 0 NOT NULL,
      account_xp_earned INTEGER DEFAULT 0 NOT NULL,
      eliminated_reason VARCHAR(32)
    );

    CREATE TABLE IF NOT EXISTS match_words (
      id SERIAL PRIMARY KEY,
      match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id),
      word VARCHAR(32) NOT NULL,
      round_number INTEGER NOT NULL,
      turn_duration_ms INTEGER NOT NULL,
      submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id SERIAL PRIMARY KEY,
      admin_user_id UUID NOT NULL REFERENCES users(id),
      action VARCHAR(64) NOT NULL,
      target_id VARCHAR(64),
      metadata TEXT,
      ip_address VARCHAR(45),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;

  if (pgPool) {
    await pgPool.query(ddlStatements);
    await pgPool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(64);
      ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
    `);
  } else if (pgliteClient) {
    await pgliteClient.exec(ddlStatements);
    await pgliteClient.exec(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(64);
      ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
    `);
  }
}

async function ensureActiveSeasonExists(): Promise<void> {
  if (!dbInstance) return;

  const currentYear = new Date().getFullYear();
  const startsAt = new Date(`${currentYear}-01-01T00:00:00Z`);
  const endsAt = new Date(`${currentYear}-12-31T23:59:59Z`);

  const query = `
    INSERT INTO seasons (season_number, name, starts_at, ends_at, is_active)
    VALUES (1, 'Season 1: Academic Genesis', $1, $2, TRUE)
    ON CONFLICT (season_number) DO NOTHING;
  `;

  if (pgPool) {
    await pgPool.query(query, [startsAt, endsAt]);
  } else if (pgliteClient) {
    await pgliteClient.query(query, [startsAt, endsAt]);
  }
}
