/**
 * Memory search implementation
 * Supports vector search, keyword search, and hybrid search
 * Adapted from OpenClaw's search implementation
 */

import type Database from "better-sqlite3";
import type { MemoryChunk, SearchResult, Memory } from "../core/config/types.js";
import type { EmbeddingProviderInterface } from "./embeddings/provider.js";
import { EmbeddingCache, embedWithCache } from "./cache.js";
import {
  buildFtsQuery,
  bm25RankToScore,
  mergeHybridResults,
  cosineSimilarity,
  type HybridVectorResult,
  type HybridKeywordResult,
} from "./hybrid.js";
import { createSnippet } from "./chunking.js";

export interface SearchOptions {
  limit?: number;
  minScore?: number;
  useVector?: boolean;
  useKeyword?: boolean;
  vectorWeight?: number;
  textWeight?: number;
}

const DEFAULT_OPTIONS: Required<SearchOptions> = {
  limit: 6,
  minScore: 0.35,
  useVector: true,
  useKeyword: true,
  vectorWeight: 0.7,
  textWeight: 0.3,
};

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
  updated_at: number;
}

/**
 * Convert number array to Float32Array buffer for sqlite-vec
 */
function toVecBuffer(embedding: number[]): Buffer {
  const float32 = new Float32Array(embedding);
  return Buffer.from(float32.buffer);
}

export class MemorySearcher {
  private db: Database.Database;
  private embeddingProvider: EmbeddingProviderInterface;
  private cache: EmbeddingCache;
  private vectorTableReady: boolean = false;

  constructor(
    db: Database.Database,
    embeddingProvider: EmbeddingProviderInterface,
    vectorAvailable: boolean = false
  ) {
    this.db = db;
    this.embeddingProvider = embeddingProvider;
    this.cache = new EmbeddingCache(db, embeddingProvider.model);
    this.vectorTableReady = vectorAvailable;
  }

  /**
   * Search memories using hybrid search (vector + keyword)
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    console.error(`[Search] Query: "${query}", vectorReady: ${this.vectorTableReady}`);

    const vectorResults: HybridVectorResult[] = [];
    const keywordResults: HybridKeywordResult[] = [];

    // Run vector search
    if (opts.useVector && this.vectorTableReady) {
      try {
        const results = await this.vectorSearch(query, opts.limit * 4);
        console.error(`[Search] Vector results: ${results.length}`);
        vectorResults.push(...results);
      } catch (err) {
        console.error("Vector search failed:", err);
      }
    }

    // Run keyword search
    if (opts.useKeyword) {
      try {
        const results = this.keywordSearch(query, opts.limit * 4);
        console.error(`[Search] Keyword results: ${results.length}`);
        keywordResults.push(...results);
      } catch (err) {
        console.error("Keyword search failed:", err);
      }
    }

    // Fallback: if both failed, do a simple LIKE search
    if (vectorResults.length === 0 && keywordResults.length === 0) {
      console.error(`[Search] Both empty, trying fallback`);
      const fallback = this.fallbackSearch(query, opts);
      console.error(`[Search] Fallback results: ${fallback.length}`);
      return fallback;
    }

    // Merge results using weighted combination (OpenClaw style)
    const merged = mergeHybridResults({
      vector: vectorResults,
      keyword: keywordResults,
      vectorWeight: opts.vectorWeight,
      textWeight: opts.textWeight,
    });
    console.error(`[Search] Merged results: ${merged.length}`);

    // Get memory details and format results
    const results = await this.formatResults(merged.slice(0, opts.limit), opts);
    console.error(`[Search] Final results: ${results.length}`);

    return results;
  }

  /**
   * Vector similarity search using embeddings
   */
  private async vectorSearch(
    query: string,
    limit: number
  ): Promise<HybridVectorResult[]> {
    // Get query embedding
    const queryEmbedding = await embedWithCache(
      [query],
      this.cache,
      (texts) => this.embeddingProvider.embedBatch(texts)
    );

    if (queryEmbedding.length === 0 || queryEmbedding[0].length === 0) {
      return [];
    }

    // Use sqlite-vec if available (native vector search)
    if (this.vectorTableReady) {
      try {
        // Use cosine distance for proper similarity scoring
        const stmt = this.db.prepare(`
          SELECT
            c.id, c.path, c.text, c.start_line, c.end_line, c.hash, c.embedding, c.source,
            vec_distance_cosine(v.embedding, ?) AS dist
          FROM chunks_vec v
          JOIN chunks c ON c.id = v.id
          ORDER BY dist ASC
          LIMIT ?
        `);

        const queryBuffer = toVecBuffer(queryEmbedding[0]);
        const rows = stmt.all(queryBuffer, limit) as Array<ChunkRow & { dist: number }>;

        // Convert cosine distance (0-2) to similarity score (1 to -1)
        return rows.map((row) => ({
          id: row.id,
          path: row.path,
          startLine: row.start_line,
          endLine: row.end_line,
          source: row.source,
          snippet: createSnippet(row.text, 700),
          vectorScore: 1 - row.dist,
        }));
      } catch (err) {
        console.error("sqlite-vec search failed, falling back to in-memory:", err);
        // Fall through to in-memory search
      }
    }

    // Fallback: in-memory cosine similarity
    const stmt = this.db.prepare(`
      SELECT id, path, text, start_line, end_line, hash, embedding, source, model
      FROM chunks
    `);

    const chunks = stmt.all() as ChunkRow[];
    const results: Array<HybridVectorResult & { score: number }> = [];

    for (const chunk of chunks) {
      try {
        const embedding = JSON.parse(chunk.embedding) as number[];
        const similarity = cosineSimilarity(queryEmbedding[0], embedding);

        results.push({
          id: chunk.id,
          path: chunk.path,
          startLine: chunk.start_line,
          endLine: chunk.end_line,
          source: chunk.source,
          snippet: createSnippet(chunk.text, 700),
          vectorScore: similarity,
          score: similarity,
        });
      } catch {
        // Skip invalid embeddings
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Full-text keyword search using FTS5
   * Uses OpenClaw's buildFtsQuery and bm25RankToScore
   */
  private keywordSearch(
    query: string,
    limit: number
  ): HybridKeywordResult[] {
    // Use OpenClaw's buildFtsQuery (AND-based)
    const ftsQuery = buildFtsQuery(query);

    if (!ftsQuery) {
      return [];
    }

    try {
      console.error(`[Keyword] FTS query: "${ftsQuery}"`);
      // FTS5 table now stores path, source, model directly
      const stmt = this.db.prepare(`
        SELECT
          f.id, f.path, f.source, f.model, f.start_line, f.end_line, f.text,
          bm25(chunks_fts) as rank
        FROM chunks_fts f
        WHERE chunks_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);

      const rows = stmt.all(ftsQuery, limit) as Array<{
        id: string;
        path: string;
        source: string;
        model: string;
        start_line: number;
        end_line: number;
        text: string;
        rank: number;
      }>;
      console.error(`[Keyword] FTS rows returned: ${rows.length}`);

      // Use OpenClaw's bm25RankToScore for proper score conversion
      return rows.map((row) => ({
        id: row.id,
        path: row.path,
        startLine: row.start_line,
        endLine: row.end_line,
        source: row.source,
        snippet: createSnippet(row.text, 700),
        textScore: bm25RankToScore(row.rank),
      }));
    } catch (err) {
      console.error("FTS search failed:", err);
      return [];
    }
  }

  /**
   * Fallback LIKE search when both vector and FTS are unavailable
   */
  private fallbackSearch(
    query: string,
    opts: Required<SearchOptions>
  ): SearchResult[] {
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    console.error(`[Fallback] Query: "${query}", words: ${JSON.stringify(words)}`);

    if (words.length === 0) {
      console.error(`[Fallback] No words after filter, returning empty`);
      return [];
    }

    // Build LIKE conditions
    const conditions = words.map(() => "LOWER(c.text) LIKE ?").join(" OR ");
    const params = words.map((w) => `%${w}%`);

    console.error(`[Fallback] SQL conditions: ${conditions}, params: ${JSON.stringify(params)}`);

    // Query chunks directly (path-centric design)
    const stmt = this.db.prepare(`
      SELECT
        c.id, c.path, c.text, c.source, c.updated_at
      FROM chunks c
      WHERE ${conditions}
      LIMIT ?
    `);

    const rows = stmt.all(...params, opts.limit) as Array<{
      id: string;
      path: string;
      text: string;
      source: string;
      updated_at: number;
    }>;

    console.error(`[Fallback] Rows returned: ${rows.length}`);
    if (rows.length > 0) {
      console.error(`[Fallback] First row text: "${rows[0].text.substring(0, 50)}..."`);
    }

    // Build memory from chunk data (path-centric)
    const memoryScores = new Map<string, { memory: Memory; maxScore: number }>();

    for (const row of rows) {
      const matchCount = words.filter((w) =>
        row.text.toLowerCase().includes(w)
      ).length;
      const score = matchCount / words.length;

      const existing = memoryScores.get(row.path);
      if (!existing || score > existing.maxScore) {
        // Use chunk as memory (path-centric design)
        memoryScores.set(row.path, {
          memory: {
            id: row.path,
            text: row.text,
            source: row.source,
            createdAt: row.updated_at,
            updatedAt: row.updated_at,
          },
          maxScore: score,
        });
      }
    }

    return Array.from(memoryScores.values())
      .filter((m) => m.maxScore >= opts.minScore)
      .sort((a, b) => b.maxScore - a.maxScore)
      .slice(0, opts.limit)
      .map((m) => ({
        memory: m.memory,
        score: m.maxScore,
        snippet: createSnippet(m.memory.text, 700),
      }));
  }

  /**
   * Format merged results into SearchResult objects
   * Works directly with chunks (path-centric design)
   */
  private async formatResults(
    merged: Array<{ path: string; score: number; snippet: string }>,
    opts: Required<SearchOptions>
  ): Promise<SearchResult[]> {
    if (merged.length === 0) {
      return [];
    }

    // Get chunk details for each unique path
    const paths = [...new Set(merged.map((m) => m.path))];

    // Build a map of path -> chunk data
    const chunkMap = new Map<string, { text: string; source: string; updated_at: number }>();

    for (const path of paths) {
      // Get chunks for this path
      const chunks = this.db.prepare(`
        SELECT text, source, updated_at
        FROM chunks
        WHERE path = ?
        ORDER BY start_line ASC
      `).all(path) as Array<{ text: string; source: string; updated_at: number }>;

      if (chunks.length > 0) {
        // Combine all chunks for this path
        const text = chunks.map(c => c.text).join("\n");
        const source = chunks[0]?.source ?? "manual";
        const updated_at = Math.max(...chunks.map(c => c.updated_at));
        chunkMap.set(path, { text, source, updated_at });
      }
    }

    // Build results
    const results: SearchResult[] = [];
    const seenMemories = new Set<string>();

    for (const item of merged) {
      if (item.score < opts.minScore) continue;
      if (seenMemories.has(item.path)) continue;

      const chunkData = chunkMap.get(item.path);
      if (!chunkData) continue;

      seenMemories.add(item.path);

      results.push({
        memory: {
          id: item.path,
          text: chunkData.text,
          source: chunkData.source,
          createdAt: chunkData.updated_at,
          updatedAt: chunkData.updated_at,
        },
        score: item.score,
        snippet: item.snippet,
      });
    }

    return results;
  }

  /**
   * Get cache instance for external use
   */
  getCache(): EmbeddingCache {
    return this.cache;
  }
}
