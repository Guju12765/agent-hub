/**
 * Main Memory Manager - handles all memory operations
 * Adapted from OpenClaw's src/memory/manager.ts
 */

import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { randomUUID } from "node:crypto";
import type {
  Memory,
  MemoryConfig,
  MemoryChunk,
  SearchResult,
  MemoryStatus,
} from "../core/config/types.js";
import type { EmbeddingProviderInterface } from "./embeddings/provider.js";
import { ensureSchema, ensureVectorTable, dropVectorTable, saveIndexMeta, loadIndexMeta, insertChunkFts, META_KEY, type MemoryIndexMeta } from "./schema.js";
import { chunkText, chunkMarkdown, hashText, type TextChunk } from "./chunking.js";
import { MemorySearcher, type SearchOptions } from "./search.js";
import { EmbeddingCache, embedWithCache } from "./cache.js";
import { cosineSimilarity } from "./hybrid.js";
import {
  atomicReindex,
  getTempIndexPath,
  removeIndexFiles,
} from "../storage/atomic-reindex.js";

// Embedding batch configuration (from OpenClaw)
const EMBEDDING_BATCH_MAX_TOKENS = 8000;
const EMBEDDING_APPROX_CHARS_PER_TOKEN = 1;
const INDEX_CONCURRENCY = 4;
const BATCH_CONCURRENCY = 2;
const BATCH_POLL_INTERVAL_MS = 2000;
const BATCH_TIMEOUT_MINUTES = 60;
const BATCH_FAILURE_LIMIT = 2;

// Sync configuration (from OpenClaw)
export const WATCH_DEBOUNCE_MS = 1500;
export const SESSION_DIRTY_DEBOUNCE_MS = 5000;
export const WATCH_POLL_INTERVAL_MS = 100;

interface BatchSettings {
  enabled: boolean;
  wait: boolean;
  concurrency: number;
  pollIntervalMs: number;
  timeoutMs: number;
  failureLimit: number;
}

const DEFAULT_BATCH_SETTINGS: BatchSettings = {
  enabled: true,
  wait: true,
  concurrency: BATCH_CONCURRENCY,
  pollIntervalMs: BATCH_POLL_INTERVAL_MS,
  timeoutMs: BATCH_TIMEOUT_MINUTES * 60 * 1000,
  failureLimit: BATCH_FAILURE_LIMIT,
};

/**
 * Convert number array to Float32Array buffer for sqlite-vec
 */
function toVecBuffer(embedding: number[]): Buffer {
  const float32 = new Float32Array(embedding);
  return Buffer.from(float32.buffer);
}

// Similarity threshold for duplicate detection
const DUPLICATE_THRESHOLD = 0.95;

export interface StoreOptions {
  source?: string;
  checkDuplicates?: boolean;
}

export interface RecallOptions {
  limit?: number;
}

interface ChunkRow {
  id: string;
  path: string;
  text: string;
  start_line: number;
  end_line: number;
  hash: string;
  embedding: string;
  model: string;
  source: string;
}

export class MemoryManager {
  private db: Database.Database;
  private config: MemoryConfig;
  private embeddingProvider: EmbeddingProviderInterface;
  private searcher: MemorySearcher;
  private cache: EmbeddingCache;
  private vectorAvailable: boolean = false;
  private ftsAvailable: boolean = false;

  constructor(
    dbPath: string,
    config: MemoryConfig,
    embeddingProvider: EmbeddingProviderInterface
  ) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");

    // Load sqlite-vec extension
    try {
      sqliteVec.load(this.db);
      console.error("sqlite-vec loaded successfully");
    } catch (err) {
      console.error("Failed to load sqlite-vec:", err instanceof Error ? err.message : String(err));
    }

    this.config = config;
    this.embeddingProvider = embeddingProvider;

    // Initialize schema
    const schemaResult = ensureSchema(this.db);
    this.ftsAvailable = schemaResult.ftsAvailable;

    // Try to set up vector table
    this.vectorAvailable = ensureVectorTable(
      this.db,
      embeddingProvider.dimensions
    );

    if (this.vectorAvailable) {
      console.error("Vector search enabled with sqlite-vec");
    }

    // Save index metadata for detecting configuration changes
    saveIndexMeta(this.db, {
      model: embeddingProvider.model,
      provider: embeddingProvider.id,
      chunkTokens: config.chunking?.tokens ?? 400,
      chunkOverlap: config.chunking?.overlap ?? 80,
      vectorDims: embeddingProvider.dimensions,
    });

    // Initialize searcher and cache
    this.searcher = new MemorySearcher(this.db, embeddingProvider, this.vectorAvailable);
    this.cache = new EmbeddingCache(this.db, {
      provider: embeddingProvider.id,
      model: embeddingProvider.model,
    });
  }

  /**
   * Store a new memory (now works directly with chunks, no separate memories table)
   */
  async store(text: string, options: StoreOptions = {}): Promise<Memory> {
    const {
      source = "manual",
      checkDuplicates = true,
    } = options;

    // Check for duplicates if enabled
    if (checkDuplicates) {
      const duplicate = await this.findDuplicate(text);
      if (duplicate) {
        // Update the existing memory instead
        return this.update(duplicate.id, { text });
      }
    }

    const now = Date.now();
    const id = randomUUID();

    // Chunk the text
    const chunks = this.chunkContent(text);

    // Generate embeddings for chunks
    const chunkTexts = chunks.map((c) => c.text);
    const embeddings = await embedWithCache(chunkTexts, this.cache, (texts) =>
      this.embeddingProvider.embedBatch(texts)
    );

    // Store chunks with embeddings (chunks reference the path/id)
    await this.storeChunks(id, chunks, embeddings, source);

    return {
      id,
      text,
      source,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Update an existing memory (now works directly with chunks)
   */
  async update(
    id: string,
    updates: { text?: string }
  ): Promise<Memory> {
    const existing = this.get(id);
    if (!existing) {
      throw new Error(`Memory not found: ${id}`);
    }

    const now = Date.now();
    const newText = updates.text ?? existing.text;

    // If text changed, re-chunk and re-embed
    if (updates.text && updates.text !== existing.text) {
      // Delete old chunks
      this.db.prepare("DELETE FROM chunks WHERE path = ?").run(id);

      // Also delete from vector table if available
      if (this.vectorAvailable) {
        try {
          this.db.prepare("DELETE FROM chunks_vec WHERE id IN (SELECT id FROM chunks WHERE path = ?)").run(id);
        } catch {
          // Ignore errors
        }
      }

      // Create new chunks
      const chunks = this.chunkContent(newText);
      const chunkTexts = chunks.map((c) => c.text);
      const embeddings = await embedWithCache(chunkTexts, this.cache, (texts) =>
        this.embeddingProvider.embedBatch(texts)
      );

      await this.storeChunks(id, chunks, embeddings, existing.source);
    }

    return {
      ...existing,
      text: newText,
      updatedAt: now,
    };
  }

  /**
   * Get a memory by ID (path) - reconstructs from chunks
   */
  get(id: string): Memory | null {
    // Get all chunks for this path and reconstruct the memory
    const stmt = this.db.prepare(`
      SELECT id, path, text, source, updated_at
      FROM chunks WHERE path = ?
      ORDER BY start_line ASC
    `);

    const rows = stmt.all(id) as Array<{
      id: string;
      path: string;
      text: string;
      source: string;
      updated_at: number;
    }>;

    if (rows.length === 0) return null;

    // Reconstruct the full text from chunks
    const text = rows.map(r => r.text).join("\n");
    const source = rows[0]?.source ?? "manual";
    const updatedAt = Math.max(...rows.map(r => r.updated_at));

    return {
      id,
      text,
      source,
      createdAt: updatedAt, // We don't have createdAt in chunks, use updatedAt
      updatedAt,
    };
  }

  /**
   * Delete a memory (deletes all chunks for the path)
   */
  delete(id: string): boolean {
    // Delete from vector table if available
    if (this.vectorAvailable) {
      try {
        this.db.prepare("DELETE FROM chunks_vec WHERE id IN (SELECT id FROM chunks WHERE path = ?)").run(id);
      } catch {
        // Ignore errors
      }
    }

    // Delete chunks (which will also need FTS cleanup)
    // Note: FTS entries will be orphaned but rebuilt on next sync
    const stmt = this.db.prepare("DELETE FROM chunks WHERE path = ?");
    const result = stmt.run(id);

    return result.changes > 0;
  }

  /**
   * Search memories
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    return this.searcher.search(query, options);
  }

  /**
   * Recall memories based on context
   * This is "smart recall" that tries to find the most relevant memories
   */
  async recall(context: string, options: RecallOptions = {}): Promise<SearchResult[]> {
    const { limit = 6 } = options;

    // Do a semantic search
    const searchResults = await this.search(context, {
      limit,
      useVector: true,
      useKeyword: true,
    });

    return searchResults;
  }

  /**
   * Get all memories (paginated) - returns unique paths with their chunks
   */
  list(options: { limit?: number; offset?: number; source?: string } = {}): Memory[] {
    const { limit = 100, offset = 0, source } = options;

    // Get distinct paths with their most recent update time
    let query = `
      SELECT path, source, MAX(updated_at) as updated_at
      FROM chunks
    `;

    const params: (string | number)[] = [];

    if (source) {
      query += " WHERE source = ?";
      params.push(source);
    }

    query += " GROUP BY path ORDER BY updated_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    const paths = stmt.all(...params) as Array<{
      path: string;
      source: string;
      updated_at: number;
    }>;

    // Get full memory for each path
    return paths.map((p) => {
      const memory = this.get(p.path);
      return memory ?? {
        id: p.path,
        text: "",
        source: p.source,
        createdAt: p.updated_at,
        updatedAt: p.updated_at,
      };
    }).filter((m): m is Memory => m !== null);
  }

  /**
   * Get memory statistics
   */
  getStatus(): MemoryStatus {
    const chunkStmt = this.db.prepare("SELECT COUNT(*) as count FROM chunks");
    const embeddedStmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM chunks WHERE embedding IS NOT NULL"
    );
    const filesStmt = this.db.prepare("SELECT COUNT(*) as count FROM files");

    const chunkCount = (chunkStmt.get() as { count: number }).count;
    const embeddedCount = (embeddedStmt.get() as { count: number }).count;
    const filesCount = (filesStmt.get() as { count: number }).count;

    return {
      totalChunks: chunkCount,
      embeddedChunks: embeddedCount,
      totalFiles: filesCount,
      vectorAvailable: this.vectorAvailable,
      ftsAvailable: this.ftsAvailable,
      embeddingModel: this.embeddingProvider.model,
    };
  }


  /**
   * Find duplicate memory using embedding similarity
   */
  private async findDuplicate(text: string): Promise<Memory | null> {
    // Get embedding for the text
    const embeddings = await embedWithCache([text], this.cache, (texts) =>
      this.embeddingProvider.embedBatch(texts)
    );

    if (embeddings.length === 0 || embeddings[0].length === 0) {
      return null;
    }

    const queryEmbedding = embeddings[0];

    // Get all chunks with embeddings (path-centric design)
    const stmt = this.db.prepare(`
      SELECT c.path, c.embedding, c.source
      FROM chunks c
    `);

    const chunkRows = stmt.all() as Array<{
      path: string;
      embedding: string;
      source: string;
    }>;

    let maxSimilarity = 0;
    let duplicatePath: string | null = null;

    for (const row of chunkRows) {
      try {
        const embedding = JSON.parse(row.embedding) as number[];
        const similarity = cosineSimilarity(queryEmbedding, embedding);

        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          duplicatePath = row.path;
        }
      } catch {
        // Skip invalid embeddings
      }
    }

    if (duplicatePath && maxSimilarity >= DUPLICATE_THRESHOLD) {
      // Get memory from chunks
      return this.get(duplicatePath);
    }

    return null;
  }

  /**
   * Chunk content - uses markdown-aware chunking by default
   */
  private chunkContent(text: string): TextChunk[] {
    const chunkConfig = {
      tokens: this.config.chunking?.tokens ?? 400,
      overlap: this.config.chunking?.overlap ?? 80,
    };

    // Use markdown-aware chunking (handles both markdown and plain text well)
    return chunkMarkdown(text, chunkConfig);
  }

  /**
   * Store chunks with their embeddings
   * @param path - The path identifier (was memoryId, now path-centric)
   */
  private async storeChunks(
    path: string,
    chunks: TextChunk[],
    embeddings: number[][],
    source: string = "memory"
  ): Promise<void> {
    const insertChunk = this.db.prepare(`
      INSERT INTO chunks (id, path, source, start_line, end_line, hash, model, text, embedding, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertVec = this.vectorAvailable
      ? this.db.prepare(`
          INSERT INTO chunks_vec (id, embedding)
          VALUES (?, ?)
        `)
      : null;

    const model = this.embeddingProvider.model;

    const insert = this.db.transaction(() => {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = randomUUID();
        const embedding = embeddings[i] ?? [];

        // embedding and model are now NOT NULL, so we must have valid values
        if (embedding.length === 0) {
          console.error(`Skipping chunk ${i} - no embedding available`);
          continue;
        }

        insertChunk.run(
          chunkId,
          path,
          source,
          chunk.startLine,
          chunk.endLine,
          chunk.hash,
          model,
          chunk.text,
          JSON.stringify(embedding),
          Date.now()
        );

        // Insert into FTS5 (manual sync, no triggers)
        try {
          insertChunkFts(this.db, {
            id: chunkId,
            path,
            source,
            model,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            text: chunk.text,
          });
        } catch (err) {
          console.error("FTS insert error:", err instanceof Error ? err.message : String(err));
        }

        // Insert into vector table if available
        if (insertVec) {
          try {
            // Use Float32Array buffer for sqlite-vec
            insertVec.run(chunkId, toVecBuffer(embedding));
          } catch (err) {
            // Log but don't fail on vector insert errors
            console.error("Vector insert error:", err instanceof Error ? err.message : String(err));
          }
        }
      }
    });

    insert();
  }

  /**
   * Re-embed all chunks (useful after changing embedding model)
   */
  async reembed(): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    const stmt = this.db.prepare(`
      SELECT id, text FROM chunks
    `);

    const chunks = stmt.all() as Array<{ id: string; text: string }>;

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((c) => c.text);

      try {
        const embeddings = await this.embeddingProvider.embedBatch(texts);

        const updateStmt = this.db.prepare(`
          UPDATE chunks SET embedding = ?, model = ? WHERE id = ?
        `);

        const update = this.db.transaction(() => {
          for (let j = 0; j < batch.length; j++) {
            updateStmt.run(
              JSON.stringify(embeddings[j]),
              this.embeddingProvider.model,
              batch[j].id
            );
          }
        });

        update();
        processed += batch.length;
      } catch (err) {
        console.error(`Error embedding batch: ${err}`);
        errors += batch.length;
      }
    }

    return { processed, errors };
  }

  /**
   * Perform atomic reindex of the entire database
   * Builds a new index in a temp location, then swaps atomically
   * On failure, the original index is preserved
   */
  async atomicReindex(options: {
    onProgress?: (update: { completed: number; total: number; label?: string }) => void;
  } = {}): Promise<{ success: boolean; processed: number; errors: number }> {
    const dbPath = this.db.name;
    const result = { success: false, processed: 0, errors: 0 };

    // Get all memories (unique paths) before we start
    const allMemories = this.list({ limit: 10000 });

    try {
      await atomicReindex({
        targetPath: dbPath,
        buildIndex: async (tempPath: string) => {
          // Create temp database
          const tempDb = new Database(tempPath);
          tempDb.pragma("journal_mode = WAL");
          tempDb.pragma("foreign_keys = ON");

          // Load sqlite-vec extension
          try {
            sqliteVec.load(tempDb);
          } catch {
            // Continue without vector support
          }

          // Initialize schema
          ensureSchema(tempDb);
          ensureVectorTable(tempDb, this.embeddingProvider.dimensions);

          // Copy embedding cache from old db
          this.seedEmbeddingCache(tempDb);

          const total = allMemories.length;
          let current = 0;
          const progress = options.onProgress ?? (() => {});

          // Report initial progress
          progress({ completed: 0, total, label: "Reindexing..." });

          // Re-index all memories (now just chunks)
          for (const memory of allMemories) {
            try {
              // Chunk the text
              const chunks = this.chunkContent(memory.text);
              const chunkTexts = chunks.map((c) => c.text);

              // Get embeddings (from cache or generate)
              const embeddings = await embedWithCache(
                chunkTexts,
                this.cache,
                (texts) => this.embeddingProvider.embedBatch(texts)
              );

              // Insert chunks with embeddings
              const insertChunk = tempDb.prepare(`
                INSERT INTO chunks (id, path, source, start_line, end_line, hash, model, text, embedding, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);

              const insertVec = tempDb.prepare(`
                INSERT INTO chunks_vec (id, embedding)
                VALUES (?, ?)
              `);

              for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const chunkId = randomUUID();
                const embedding = embeddings[i] ?? [];

                // Skip chunks without embeddings (embedding is NOT NULL now)
                if (embedding.length === 0) {
                  continue;
                }

                const model = this.embeddingProvider.model;

                insertChunk.run(
                  chunkId,
                  memory.id,
                  memory.source,
                  chunk.startLine,
                  chunk.endLine,
                  chunk.hash,
                  model,
                  chunk.text,
                  JSON.stringify(embedding),
                  Date.now()
                );

                // Insert into FTS5
                try {
                  insertChunkFts(tempDb, {
                    id: chunkId,
                    path: memory.id,
                    source: memory.source,
                    model,
                    startLine: chunk.startLine,
                    endLine: chunk.endLine,
                    text: chunk.text,
                  });
                } catch {
                  // Continue on FTS insert error
                }

                try {
                  insertVec.run(chunkId, toVecBuffer(embedding));
                } catch {
                  // Continue on vector insert error
                }
              }

              result.processed++;
              current++;
              progress({ completed: current, total });
            } catch (err) {
              console.error(`Error reindexing memory ${memory.id}:`, err);
              result.errors++;
              current++;
              progress({ completed: current, total });
            }
          }

          tempDb.close();
        },
        onBeforeSwap: async () => {
          // Close the current database before swap
          this.db.close();
        },
        onAfterSwap: async (targetPath: string) => {
          // Reopen the database
          this.db = new Database(targetPath);
          this.db.pragma("journal_mode = WAL");
          this.db.pragma("foreign_keys = ON");

          try {
            sqliteVec.load(this.db);
          } catch {
            // Continue without vector support
          }

          // Reinitialize searcher
          this.searcher = new MemorySearcher(
            this.db,
            this.embeddingProvider,
            this.vectorAvailable
          );
        },
        onRollback: async (error: Error) => {
          console.error(`Atomic reindex failed, rolled back: ${error.message}`);
          // Reopen the original database
          this.db = new Database(dbPath);
          this.db.pragma("journal_mode = WAL");
          this.db.pragma("foreign_keys = ON");

          try {
            sqliteVec.load(this.db);
          } catch {
            // Continue without vector support
          }

          this.searcher = new MemorySearcher(
            this.db,
            this.embeddingProvider,
            this.vectorAvailable
          );
        },
      });

      result.success = true;
    } catch (err) {
      console.error("Atomic reindex failed:", err);
      result.success = false;
    }

    return result;
  }

  /**
   * Seed embedding cache from old database to new database
   * Preserves cached embeddings during reindex
   */
  private seedEmbeddingCache(targetDb: Database.Database): void {
    try {
      const rows = this.db.prepare(`
        SELECT provider, model, provider_key, hash, embedding, dims, updated_at
        FROM embedding_cache
      `).all() as Array<{
        provider: string;
        model: string;
        provider_key: string;
        hash: string;
        embedding: string;
        dims: number | null;
        updated_at: number;
      }>;

      if (rows.length === 0) return;

      const insert = targetDb.prepare(`
        INSERT INTO embedding_cache (provider, model, provider_key, hash, embedding, dims, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(provider, model, provider_key, hash) DO UPDATE SET
          embedding=excluded.embedding,
          dims=excluded.dims,
          updated_at=excluded.updated_at
      `);

      targetDb.transaction(() => {
        for (const row of rows) {
          insert.run(
            row.provider,
            row.model,
            row.provider_key,
            row.hash,
            row.embedding,
            row.dims,
            row.updated_at
          );
        }
      })();
    } catch (err) {
      // Non-fatal: continue without seeding cache
      console.error("Failed to seed embedding cache:", err);
    }
  }

  /**
   * Compact the database
   */
  compact(): void {
    this.db.pragma("wal_checkpoint(TRUNCATE)");
    this.db.exec("VACUUM");
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get the database instance (for sync operations)
   */
  getDatabase(): Database.Database {
    return this.db;
  }

  /**
   * Get the embedding provider
   */
  getEmbeddingProvider(): EmbeddingProviderInterface {
    return this.embeddingProvider;
  }

  /**
   * Get the config
   */
  getConfig(): MemoryConfig {
    return this.config;
  }
}
