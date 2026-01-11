/**
 * Database migrations for SQLite
 * Run these on app startup to ensure tables exist
 */

import type { SQLiteDatabase } from "expo-sqlite";

export async function runMigrations(db: SQLiteDatabase) {
  try {
    // Create projects table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        selected_size TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER,
        is_archived INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        total_time_seconds INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Create patterns table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create pattern_blocks table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pattern_blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_id INTEGER NOT NULL,
        block_order INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
      );
    `);

    // Create pattern_rows table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pattern_rows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        block_id INTEGER NOT NULL,
        row_number INTEGER NOT NULL,
        side TEXT NOT NULL,
        instruction TEXT NOT NULL,
        stitch_change_type TEXT NOT NULL DEFAULT 'none',
        has_special_action INTEGER NOT NULL DEFAULT 0,
        special_action_note TEXT,
        stitch_change_amount INTEGER DEFAULT 0,
        FOREIGN KEY (block_id) REFERENCES pattern_blocks(id) ON DELETE CASCADE
      );
    `);

    // Create pattern_repeats table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pattern_repeats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        block_id INTEGER NOT NULL,
        repeat_type TEXT NOT NULL,
        start_row_number INTEGER,
        end_row_number INTEGER,
        times_to_repeat INTEGER NOT NULL,
        size_variations TEXT,
        FOREIGN KEY (block_id) REFERENCES pattern_blocks(id) ON DELETE CASCADE
      );
    `);

    // Create project_progress table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS project_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        pattern_id INTEGER NOT NULL,
        current_block_id INTEGER,
        current_row_number INTEGER NOT NULL,
        current_side TEXT NOT NULL,
        current_repeat_iteration INTEGER,
        total_rows_completed INTEGER NOT NULL DEFAULT 0,
        current_stitch_count INTEGER,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (pattern_id) REFERENCES patterns(id),
        FOREIGN KEY (current_block_id) REFERENCES pattern_blocks(id)
      );
    `);

    // Create progress_history table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS progress_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        block_id INTEGER,
        row_number INTEGER NOT NULL,
        side TEXT NOT NULL,
        action TEXT NOT NULL,
        stitch_count_at_time INTEGER,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (block_id) REFERENCES pattern_blocks(id)
      );
    `);

    // Create knitting_sessions table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS knitting_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        duration_seconds INTEGER,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);

    // Create user table (Better Auth)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        email_verified INTEGER NOT NULL DEFAULT 0,
        image TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create session table (Better Auth)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        expires_at INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        user_id TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
      );
    `);

    // Create account table (Better Auth - OAuth providers)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS account (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        id_token TEXT,
        access_token_expires_at INTEGER,
        refresh_token_expires_at INTEGER,
        scope TEXT,
        password TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
      );
    `);

    // Create verification table (Better Auth)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    console.log("✅ Database migrations completed successfully");
  } catch (error) {
    console.error("❌ Error running migrations:", error);
    throw error;
  }
}
