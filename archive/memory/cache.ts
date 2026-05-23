/**
 * Embedding cache to avoid re-embedding unchanged text
 * Adapted from OpenClaw's embedding cache logic
 */

import type Database from "better-sqlite3";
import { hashText } from "./chunking.js";
import { computeProviderKey, type ProviderKeyParams } from "./embeddings/provider-key.js";

/**
 * Batch size for cache lookups to avoid very large SQL IN clauses
 * Matches OpenClaw's CACHE_LOOKUP_BATCH_SIZE
 */
const CACHE_LOOKUP_BATCH_SIZE = 400;

export interface CachedEmbedding {
  hash: string;
  embedding: number[];
  model: string;
  dimensions: number;
  updatedAt: number;
}

export interface EmbeddingCacheOptions {
  provider: string;
  model: string;
  providerKey?: string;
  baseUrl?: string;
  headers?: Record<string, string>;
}

export class EmbeddingCache {
  private db: Database.Database;
  private provider: string;
  private model: string;
  private providerKey: string;

  constructor(db: Database.Database, options: EmbeddingCacheOptions | string) {
    this.db = db;

    // Support legacy string-only model parameter
    if (typeof options === "string") {
      this.provider = "openai";
      this.model = options;
      this.providerKey = "";
    } else {
      this.provider = options.provider;
      this.model = options.model;
      this.providerKey = options.providerKey ?? computeProviderKey({
        provider: options.provider,
        model: options.model,
        baseUrl: options.baseUrl,
        headers: options.headers,
      });
    }
  }

  /**
   * Get the provider key for this cache
   */
  getProviderKey(): string {
    return this.providerKey;
  }

  /**
   * Get cached embedding for text
   */
  get(text: string): number[] | null {
    const hash = hashText(text);

    const stmt = this.db.prepare(`
      SELECT embedding FROM embedding_cache
      WHERE provider = ? AND model = ? AND provider_key = ? AND hash = ?
    `);

    const row = stmt.get(this.provider, this.model, this.providerKey, hash) as { embedding: string } | undefined;

    if (!row) {
      return null;
    }

    try {
      return JSON.parse(row.embedding);
    } catch {
      return null;
    }
  }

  /**
   * Get cached embeddings for multiple texts
   * Returns a map of hash -> embedding for found entries
   */
  getBatch(texts: string[]): Map<string, number[]> {
    const result = new Map<string, number[]>();

    if (texts.length === 0) {
      return result;
    }

    const hashes = texts.map(hashText);
    const placeholders = hashes.map(() => "?").join(",");

    const stmt = this.db.prepare(`
      SELECT hash, embedding FROM embedding_cache
      WHERE provider = ? AND model = ? AND provider_key = ? AND hash IN (${placeholders})
    `);

    const rows = stmt.all(this.provider, this.model, this.providerKey, ...hashes) as Array<{
      hash: string;
      embedding: string;
    }>;

    for (const row of rows) {
      try {
        result.set(row.hash, JSON.parse(row.embedding));
      } catch {
        // Skip invalid entries
      }
    }

    return result;
  }

  /**
   * Cache an embedding
   */
  set(text: string, embedding: number[]): void {
    const hash = hashText(text);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO embedding_cache (provider, model, provider_key, hash, embedding, dims, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      this.provider,
      this.model,
      this.providerKey,
      hash,
      JSON.stringify(embedding),
      embedding.length,
      Date.now()
    );
  }

  /**
   * Cache multiple embeddings
   */
  setBatch(texts: string[], embeddings: number[][]): void {
    if (texts.length !== embeddings.length) {
      throw new Error("Texts and embeddings arrays must have the same length");
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO embedding_cache (provider, model, provider_key, hash, embedding, dims, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    const insert = this.db.transaction(() => {
      for (let i = 0; i < texts.length; i++) {
        const hash = hashText(texts[i]);
        stmt.run(
          this.provider,
          this.model,
          this.providerKey,
          hash,
          JSON.stringify(embeddings[i]),
          embeddings[i].length,
          now
        );
      }
    });

    insert();
  }

  /**
   * Remove old cache entries by age
   */
  pruneByAge(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;

    const stmt = this.db.prepare(`
      DELETE FROM embedding_cache WHERE updated_at < ?
    `);

    const result = stmt.run(cutoff);
    return result.changes;
  }

  /**
   * Prune cache to stay within maxEntries limit using LRU eviction
   * Adapted from OpenClaw's pruneEmbeddingCacheIfNeeded
   *
   * @param maxEntries Maximum number of entries to keep
   * @returns Number of entries deleted
   */
  pruneBySize(maxEntries: number): number {
    if (maxEntries <= 0) return 0;

    const countRow = this.db.prepare(
      "SELECT COUNT(*) as c FROM embedding_cache"
    ).get() as { c: number } | undefined;

    const count = countRow?.c ?? 0;
    if (count <= maxEntries) return 0;

    const excess = count - maxEntries;

    // Delete oldest entries (by updated_at ASC = LRU eviction)
    const result = this.db.prepare(`
      DELETE FROM embedding_cache
      WHERE rowid IN (
        SELECT rowid FROM embedding_cache
        ORDER BY updated_at ASC
        LIMIT ?
      )
    `).run(excess);

    return result.changes;
  }

  /**
   * Prune cache based on config
   * Supports both age-based and size-based pruning
   */
  pruneIfNeeded(options: {
    maxEntries?: number;
    maxAgeMs?: number;
  } = {}): { byAge: number; bySize: number } {
    let byAge = 0;
    let bySize = 0;

    // Age-based pruning first
    if (options.maxAgeMs && options.maxAgeMs > 0) {
      byAge = this.pruneByAge(options.maxAgeMs);
    }

    // Size-based pruning (LRU)
    if (options.maxEntries && options.maxEntries > 0) {
      bySize = this.pruneBySize(options.maxEntries);
    }

    return { byAge, bySize };
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.db.exec("DELETE FROM embedding_cache");
  }

  /**
   * Get cache statistics
   */
  stats(): { count: number; models: string[] } {
    const countStmt = this.db.prepare("SELECT COUNT(*) as count FROM embedding_cache");
    const modelsStmt = this.db.prepare("SELECT DISTINCT model FROM embedding_cache");

    const countRow = countStmt.get() as { count: number };
    const modelRows = modelsStmt.all() as Array<{ model: string }>;

    return {
      count: countRow.count,
      models: modelRows.map((r) => r.model),
    };
  }
}

/**
 * Embed texts with caching support
 * Returns embeddings for all texts, using cache when available
 */
export async function embedWithCache(
  texts: string[],
  cache: EmbeddingCache,
  embedFn: (texts: string[]) => Promise<number[][]>
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  // Check cache for all texts
  const cached = cache.getBatch(texts);

  // Find texts that need embedding
  const uncachedTexts: string[] = [];
  const uncachedIndexes: number[] = [];

  texts.forEach((text, index) => {
    const hash = hashText(text);
    if (!cached.has(hash)) {
      uncachedTexts.push(text);
      uncachedIndexes.push(index);
    }
  });

  // If all cached, return immediately
  if (uncachedTexts.length === 0) {
    return texts.map((text) => cached.get(hashText(text))!);
  }

  // Embed uncached texts
  const newEmbeddings = await embedFn(uncachedTexts);

  // Cache new embeddings
  cache.setBatch(uncachedTexts, newEmbeddings);

  // Build result array
  const result: number[][] = new Array(texts.length);
  let newIndex = 0;

  for (let i = 0; i < texts.length; i++) {
    const hash = hashText(texts[i]);
    if (cached.has(hash)) {
      result[i] = cached.get(hash)!;
    } else {
      result[i] = newEmbeddings[newIndex++];
    }
  }

  return result;
}
