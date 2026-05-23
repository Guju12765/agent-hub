/**
 * Sync memory markdown files to SQLite index
 * Simplified to use project-level memory only
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type Database from "better-sqlite3";

import type { MemoryConfig } from "../core/config/types.js";
import type { EmbeddingProviderInterface } from "./embeddings/provider.js";
import { hashText } from "./chunking.js";
import { insertChunkFts } from "./schema.js";
import {
  getMemoryDir,
  getConsolidatedPath,
  getDailyLogsDir,
  getSessionsDir,
} from "../agent/paths.js";

// Concurrency limit for parallel file indexing (matches OpenClaw)
const INDEX_CONCURRENCY = 4;

/**
 * Process items concurrently with a limit
 * Simple promise-based concurrency limiter
 */
async function processConcurrently<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      const item = items[index];
      results[index] = await fn(item, index);
    }
  }

  // Start workers up to the limit
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(limit, items.length); i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}

export interface FileEntry {
  path: string;        // Relative path
  absPath: string;     // Absolute path
  mtimeMs: number;
  size: number;
  hash: string;
  content: string;
}

export interface SyncResult {
  indexed: number;
  skipped: number;
  deleted: number;
}

/**
 * List all markdown files in memory directory
 */
export function listMemoryFiles(workspaceDir?: string): string[] {
  const memoryDir = getMemoryDir(workspaceDir);
  const files: string[] = [];

  // Check MEMORY.md
  const memoryPath = getConsolidatedPath(workspaceDir);
  if (existsSync(memoryPath)) {
    files.push(memoryPath);
  }

  // Check logs/ directory
  const logsDir = getDailyLogsDir(workspaceDir);
  if (existsSync(logsDir)) {
    const entries = readdirSync(logsDir);
    for (const entry of entries) {
      if (entry.endsWith(".md")) {
        files.push(join(logsDir, entry));
      }
    }
  }

  // Check sessions/ directory
  const sessionsDir = getSessionsDir(workspaceDir);
  if (existsSync(sessionsDir)) {
    const entries = readdirSync(sessionsDir);
    for (const entry of entries) {
      if (entry.endsWith(".md")) {
        files.push(join(sessionsDir, entry));
      }
    }
  }

  return files;
}

/**
 * Build file entry with hash
 */
export function buildFileEntry(absPath: string, baseDir: string): FileEntry {
  const stat = statSync(absPath);
  const content = readFileSync(absPath, "utf-8");
  const hash = hashText(content);

  return {
    path: relative(baseDir, absPath).replace(/\\/g, "/"),
    absPath,
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    hash,
    content,
  };
}

/**
 * Chunk markdown content
 */
export function chunkMarkdown(
  content: string,
  options: { tokens: number; overlap: number }
): Array<{ startLine: number; endLine: number; text: string; hash: string }> {
  const lines = content.split("\n");
  if (lines.length === 0) return [];

  const maxChars = Math.max(32, options.tokens * 4);
  const overlapChars = Math.max(0, options.overlap * 4);
  const chunks: Array<{ startLine: number; endLine: number; text: string; hash: string }> = [];

  let current: Array<{ line: string; lineNo: number }> = [];
  let currentChars = 0;

  function flush(): void {
    if (current.length === 0) return;
    const firstEntry = current[0];
    const lastEntry = current[current.length - 1];
    if (!firstEntry || !lastEntry) return;

    const text = current.map((entry) => entry.line).join("\n");
    chunks.push({
      startLine: firstEntry.lineNo,
      endLine: lastEntry.lineNo,
      text,
      hash: hashText(text),
    });
  }

  function carryOverlap(): void {
    if (overlapChars <= 0 || current.length === 0) {
      current = [];
      currentChars = 0;
      return;
    }

    let acc = 0;
    const kept: Array<{ line: string; lineNo: number }> = [];
    for (let i = current.length - 1; i >= 0; i -= 1) {
      const entry = current[i];
      if (!entry) continue;
      acc += entry.line.length + 1;
      kept.unshift(entry);
      if (acc >= overlapChars) break;
    }
    current = kept;
    currentChars = kept.reduce((sum, entry) => sum + entry.line.length + 1, 0);
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const lineNo = i + 1;
    const segments: string[] = [];

    if (line.length === 0) {
      segments.push("");
    } else {
      for (let start = 0; start < line.length; start += maxChars) {
        segments.push(line.slice(start, start + maxChars));
      }
    }

    for (const segment of segments) {
      const lineSize = segment.length + 1;
      if (currentChars + lineSize > maxChars && current.length > 0) {
        flush();
        carryOverlap();
      }
      current.push({ line: segment, lineNo });
      currentChars += lineSize;
    }
  }

  flush();
  return chunks;
}

/**
 * Index a single file - chunk it and store embeddings
 */
async function indexFile(
  db: Database.Database,
  entry: FileEntry,
  config: MemoryConfig,
  embeddingProvider: EmbeddingProviderInterface,
  model: string
): Promise<number> {
  const chunks = chunkMarkdown(entry.content, config.chunking);

  // Delete old chunks for this file
  db.prepare("DELETE FROM chunks WHERE path LIKE ?").run(`${entry.path}:%`);

  // Also clean up from vector table if it exists
  try {
    db.prepare("DELETE FROM chunks_vec WHERE id LIKE ?").run(`${entry.path}:%`);
  } catch {
    // Vector table may not exist
  }

  let indexed = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkId = `${entry.path}:${i}`;

    // Check embedding cache
    const cached = db.prepare(
      "SELECT embedding FROM embedding_cache WHERE hash = ? AND model = ?"
    ).get(chunk.hash, model) as { embedding: string } | undefined;

    let embedding: number[];
    if (cached) {
      embedding = JSON.parse(cached.embedding);
    } else {
      // Generate embedding
      embedding = await embeddingProvider.embed(chunk.text);

      // Cache it
      db.prepare(`
        INSERT OR REPLACE INTO embedding_cache (hash, embedding, model, dims, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        chunk.hash,
        JSON.stringify(embedding),
        model,
        embedding.length,
        Date.now()
      );
    }

    // Insert into chunks table (path-centric design, no separate memories table)
    db.prepare(`
      INSERT OR REPLACE INTO chunks (id, path, source, start_line, end_line, hash, model, text, embedding, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      chunkId,
      entry.path,
      entry.path,
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
      insertChunkFts(db, {
        id: chunkId,
        path: entry.path,
        source: entry.path,
        model,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        text: chunk.text,
      });
    } catch {
      // FTS table may not be available
    }

    // Insert into vector table
    try {
      const vecBuffer = Buffer.from(new Float32Array(embedding).buffer);
      db.prepare(`
        INSERT OR REPLACE INTO chunks_vec (id, embedding)
        VALUES (?, ?)
      `).run(chunkId, vecBuffer);
    } catch {
      // Vector table may not be available
    }

    indexed++;
  }

  // Update files table
  db.prepare(`
    INSERT OR REPLACE INTO files (path, source, hash, mtime, size)
    VALUES (?, ?, ?, ?, ?)
  `).run(entry.path, "memory", entry.hash, Math.floor(entry.mtimeMs), entry.size);

  return indexed;
}

/**
 * Sync memory files to SQLite database
 */
export async function syncMemory(
  db: Database.Database,
  config: MemoryConfig,
  embeddingProvider: EmbeddingProviderInterface,
  options: {
    workspaceDir?: string;
    forceReindex?: boolean;
    onProgress?: (current: number, total: number) => void;
  } = {}
): Promise<SyncResult> {
  const memoryDir = getMemoryDir(options.workspaceDir);
  const files = listMemoryFiles(options.workspaceDir);
  const model = embeddingProvider.model;

  const result: SyncResult = {
    indexed: 0,
    skipped: 0,
    deleted: 0,
  };

  // Build file entries (use memory dir as base)
  const fileEntries = files.map((absPath) => buildFileEntry(absPath, memoryDir));
  const activePaths = new Set(fileEntries.map((e) => e.path));

  // Filter entries that need indexing
  const entriesToIndex: FileEntry[] = [];
  for (const entry of fileEntries) {
    const existing = db.prepare(
      "SELECT hash FROM files WHERE path = ? AND source = ?"
    ).get(entry.path, "memory") as { hash: string } | undefined;

    if (!options.forceReindex && existing?.hash === entry.hash) {
      result.skipped++;
    } else {
      entriesToIndex.push(entry);
    }
  }

  // Track progress
  let completed = 0;
  const total = fileEntries.length;

  // Report initial progress (skipped files already counted)
  if (options.onProgress) {
    options.onProgress(result.skipped, total);
  }

  // Process files concurrently with INDEX_CONCURRENCY limit
  await processConcurrently(
    entriesToIndex,
    INDEX_CONCURRENCY,
    async (entry) => {
      await indexFile(db, entry, config, embeddingProvider, model);
      result.indexed++;
      completed++;

      if (options.onProgress) {
        options.onProgress(result.skipped + completed, total);
      }
    }
  );

  // Delete stale entries
  const staleRows = db.prepare(
    "SELECT path FROM files WHERE source = ?"
  ).all("memory") as Array<{ path: string }>;

  for (const stale of staleRows) {
    if (activePaths.has(stale.path)) continue;

    // Delete from all tables (no memories table anymore)
    db.prepare("DELETE FROM files WHERE path = ? AND source = ?").run(stale.path, "memory");
    db.prepare("DELETE FROM chunks WHERE path LIKE ?").run(`${stale.path}:%`);

    try {
      db.prepare("DELETE FROM chunks_vec WHERE id LIKE ?").run(`${stale.path}:%`);
    } catch {
      // Vector table may not exist
    }

    result.deleted++;
  }

  if (options.onProgress) {
    options.onProgress(fileEntries.length, fileEntries.length);
  }

  return result;
}
