/**
 * SQLite database schema for memory storage
 * Adapted from OpenClaw's src/memory/memory-schema.ts
 */

import type Database from "better-sqlite3";

const SCHEMA_VERSION = 8;

const CHUNKS_TABLE = `
  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'memory',
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    hash TEXT NOT NULL,
    model TEXT NOT NULL,
    text TEXT NOT NULL,
    embedding TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )
`;

const EMBEDDING_CACHE_TABLE = `
  CREATE TABLE IF NOT EXISTS embedding_cache (
    provider TEXT NOT NULL DEFAULT 'openai',
    model TEXT NOT NULL,
    provider_key TEXT NOT NULL DEFAULT '',
    hash TEXT NOT NULL,
    embedding TEXT NOT NULL,
    dims INTEGER,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (provider, model, provider_key, hash)
  )
`;

const META_TABLE = `
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`;

// Track file hashes for sync (OpenClaw-style)
const FILES_TABLE = `
  CREATE TABLE IF NOT EXISTS files (
    path TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'memory',
    hash TEXT NOT NULL,
    mtime INTEGER NOT NULL,
    size INTEGER NOT NULL
  )
`;

const INDEXES = [
  "CREATE INDEX IF NOT EXISTS idx_chunks_path ON chunks(path)",
  "CREATE INDEX IF NOT EXISTS idx_chunks_hash ON chunks(hash)",
];

export interface SchemaResult {
  ftsAvailable: boolean;
  ftsError?: string;
  vectorAvailable: boolean;
  vectorError?: string;
}

/**
 * Migrate schema from older versions
 * Version 2: Renamed start_pos/end_pos to start_line/end_line in chunks table
 * Version 3: Added source column to chunks table
 * Version 4: Added updated_at column to chunks table
 * Version 5: Renamed embedding_cache created_at to updated_at
 * Version 6: Renamed embedding_cache dimensions to dims
 * Version 7: Renamed chunks.memory_id to chunks.path, updated FTS5 schema
 */
function migrateSchema(db: Database.Database): void {
  try {
    const versionRow = db
      .prepare("SELECT value FROM meta WHERE key = 'schema_version'")
      .get() as { value: string } | undefined;
    const currentVersion = versionRow ? parseInt(versionRow.value) : 1;

    if (currentVersion < 2) {
      // Migration: rename columns (only if they exist with old names)
      try {
        db.exec(`ALTER TABLE chunks RENAME COLUMN start_pos TO start_line`);
        db.exec(`ALTER TABLE chunks RENAME COLUMN end_pos TO end_line`);
      } catch {
        // Columns may already have new names
      }
    }

    if (currentVersion < 3) {
      // Migration: add source column to chunks table
      try {
        db.exec(`ALTER TABLE chunks ADD COLUMN source TEXT NOT NULL DEFAULT 'memory'`);
      } catch {
        // Column may already exist
      }
    }

    if (currentVersion < 4) {
      // Migration: add updated_at column to chunks table
      try {
        db.exec(`ALTER TABLE chunks ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`);
      } catch {
        // Column may already exist
      }
    }

    if (currentVersion < 5) {
      // Migration: rename embedding_cache created_at to updated_at
      try {
        db.exec(`ALTER TABLE embedding_cache RENAME COLUMN created_at TO updated_at`);
      } catch {
        // Column may already have new name
      }
    }

    if (currentVersion < 6) {
      try {
        db.exec(`ALTER TABLE embedding_cache RENAME COLUMN dimensions TO dims`);
      } catch {
        // Column may already have new name
      }
    }

    if (currentVersion < 7) {
      try {
        db.exec(`ALTER TABLE chunks RENAME COLUMN memory_id TO path`);
      } catch {
        // Column may already have new name
      }
      // Drop and recreate FTS table for new schema
      try {
        db.exec(`DROP TABLE IF EXISTS chunks_fts`);
      } catch {
        // Ignore
      }
      // Drop old triggers (they won't work with new schema anyway)
      try {
        db.exec(`DROP TRIGGER IF EXISTS chunks_ai`);
        db.exec(`DROP TRIGGER IF EXISTS chunks_ad`);
        db.exec(`DROP TRIGGER IF EXISTS chunks_au`);
      } catch {
        // Ignore
      }
      // Drop old index
      try {
        db.exec(`DROP INDEX IF EXISTS idx_chunks_memory_id`);
      } catch {
        // Ignore
      }
    }

    if (currentVersion < 8) {
      // Migration: drop memories table (OpenClaw parity - work directly with chunks)
      try {
        db.exec(`DROP TABLE IF EXISTS memories`);
      } catch {
        // Ignore
      }
      // Drop old indexes that referenced memories table
      try {
        db.exec(`DROP INDEX IF EXISTS idx_memories_category`);
        db.exec(`DROP INDEX IF EXISTS idx_memories_created_at`);
      } catch {
        // Ignore
      }
    }

    // Update version after all migrations
    if (currentVersion < SCHEMA_VERSION) {
      db.prepare(
        "INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)"
      ).run(String(SCHEMA_VERSION));
    }
  } catch {
    // meta table might not exist yet (fresh database)
  }
}

export function ensureSchema(db: Database.Database): SchemaResult {
  const result: SchemaResult = {
    ftsAvailable: false,
    vectorAvailable: false,
  };

  // Run migrations for existing databases (before CREATE IF NOT EXISTS)
  migrateSchema(db);

  // Create core tables
  db.exec(CHUNKS_TABLE);
  db.exec(EMBEDDING_CACHE_TABLE);
  db.exec(META_TABLE);
  db.exec(FILES_TABLE);

  // Set schema version for fresh databases
  db.prepare(
    "INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)"
  ).run(String(SCHEMA_VERSION));

  // Create indexes
  for (const index of INDEXES) {
    db.exec(index);
  }

  // Try to create FTS5 table (manual sync, no triggers)
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
        text,
        id UNINDEXED,
        path UNINDEXED,
        source UNINDEXED,
        model UNINDEXED,
        start_line UNINDEXED,
        end_line UNINDEXED
      )
    `);

    result.ftsAvailable = true;
  } catch (err) {
    result.ftsError = err instanceof Error ? err.message : String(err);
  }

  return result;
}

export function ensureVectorTable(
  db: Database.Database,
  dimensions: number
): boolean {
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_vec USING vec0(
        id TEXT PRIMARY KEY,
        embedding FLOAT[${dimensions}]
      )
    `);
    return true;
  } catch (err) {
    console.warn(
      "sqlite-vec not available:",
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}

export function dropVectorTable(db: Database.Database): void {
  try {
    db.exec("DROP TABLE IF EXISTS chunks_vec");
  } catch {
    // Ignore errors
  }
}

// Memory index metadata tracking
export const META_KEY = "memory_index_meta_v1";

export interface MemoryIndexMeta {
  model: string;
  provider: string;
  providerKey?: string;
  chunkTokens: number;
  chunkOverlap: number;
  vectorDims?: number;
}

export function saveIndexMeta(db: Database.Database, meta: MemoryIndexMeta): void {
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)")
    .run(META_KEY, JSON.stringify(meta));
}

export function loadIndexMeta(db: Database.Database): MemoryIndexMeta | null {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(META_KEY) as { value: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

/**
 * Insert a chunk into the FTS5 index (manual sync)
 */
export function insertChunkFts(
  db: Database.Database,
  chunk: { id: string; path: string; source: string; model: string; startLine: number; endLine: number; text: string }
): void {
  db.prepare(`
    INSERT INTO chunks_fts (text, id, path, source, model, start_line, end_line)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(chunk.text, chunk.id, chunk.path, chunk.source, chunk.model, chunk.startLine, chunk.endLine);
}

/**
 * Delete a chunk from the FTS5 index (manual sync)
 */
export function deleteChunkFts(
  db: Database.Database,
  id: string,
  path: string,
  source: string,
  model: string,
  startLine: number,
  endLine: number,
  text: string
): void {
  db.prepare(`
    INSERT INTO chunks_fts (chunks_fts, text, id, path, source, model, start_line, end_line)
    VALUES ('delete', ?, ?, ?, ?, ?, ?, ?)
  `).run(text, id, path, source, model, startLine, endLine);
}
