/**
 * File watcher for memory files
 * Following OpenClaw's chokidar-based approach
 */

import chokidar, { type FSWatcher } from "chokidar";
import { existsSync } from "node:fs";
import type Database from "better-sqlite3";

import type { MemoryConfig } from "../core/config/types.js";
import type { EmbeddingProviderInterface } from "./embeddings/provider.js";
import { getMemoryDir, getConsolidatedPath, getDailyLogsDir, getSessionsDir } from "../agent/paths.js";
import { syncMemory } from "./sync.js";
import { WATCH_DEBOUNCE_MS, WATCH_POLL_INTERVAL_MS } from "./manager.js";

export interface WatcherOptions {
  debounceMs?: number;
  onSync?: (result: { indexed: number; skipped: number; deleted: number }) => void;
  onError?: (error: Error) => void;
}

export class AgentMemoryWatcher {
  private workspaceDir: string | undefined;
  private db: Database.Database;
  private config: MemoryConfig;
  private embeddingProvider: EmbeddingProviderInterface;
  private watcher: FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private dirty = false;
  private syncing = false;
  private closed = false;
  private options: WatcherOptions;

  constructor(
    db: Database.Database,
    config: MemoryConfig,
    embeddingProvider: EmbeddingProviderInterface,
    options: WatcherOptions & { workspaceDir?: string } = {}
  ) {
    this.workspaceDir = options.workspaceDir;
    this.db = db;
    this.config = config;
    this.embeddingProvider = embeddingProvider;
    this.options = options;
  }

  /**
   * Start watching memory files
   */
  start(): void {
    if (this.watcher || this.closed) return;

    const watchPaths: string[] = [];

    // Watch MEMORY.md
    const memoryPath = getConsolidatedPath(this.workspaceDir);
    watchPaths.push(memoryPath);

    // Watch logs/ directory
    const logsDir = getDailyLogsDir(this.workspaceDir);
    if (existsSync(logsDir)) {
      watchPaths.push(logsDir);
    }

    // Watch sessions/ directory
    const sessionsDir = getSessionsDir(this.workspaceDir);
    if (existsSync(sessionsDir)) {
      watchPaths.push(sessionsDir);
    }

    const debounceMs = this.options.debounceMs ?? WATCH_DEBOUNCE_MS;

    this.watcher = chokidar.watch(watchPaths, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: debounceMs,
        pollInterval: WATCH_POLL_INTERVAL_MS,
      },
      // Only watch .md files
      ignored: (path) => {
        if (path.endsWith(".md")) return false;
        // Allow directories
        try {
          const { statSync } = require("fs");
          return !statSync(path).isDirectory();
        } catch {
          return true;
        }
      },
    });

    const markDirty = (path: string) => {
      if (!path.endsWith(".md")) return;
      this.dirty = true;
      this.scheduleSync();
    };

    this.watcher.on("add", markDirty);
    this.watcher.on("change", markDirty);
    this.watcher.on("unlink", markDirty);
  }

  /**
   * Schedule a sync after debounce period
   */
  private scheduleSync(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const debounceMs = this.options.debounceMs ?? WATCH_DEBOUNCE_MS;

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.runSync();
    }, debounceMs);
  }

  /**
   * Run sync if dirty
   */
  private async runSync(): Promise<void> {
    if (!this.dirty || this.syncing || this.closed) return;

    this.dirty = false;
    this.syncing = true;

    try {
      const result = await syncMemory(
        this.db,
        this.config,
        this.embeddingProvider,
        { workspaceDir: this.workspaceDir }
      );

      if (this.options.onSync) {
        this.options.onSync(result);
      }
    } catch (err) {
      if (this.options.onError) {
        this.options.onError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      this.syncing = false;

      // If dirty again during sync, schedule another
      if (this.dirty && !this.closed) {
        this.scheduleSync();
      }
    }
  }

  /**
   * Force an immediate sync
   */
  async sync(): Promise<void> {
    this.dirty = true;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    await this.runSync();
  }

  /**
   * Stop watching and clean up
   */
  close(): void {
    this.closed = true;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      void this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Check if watcher is active
   */
  isWatching(): boolean {
    return this.watcher !== null && !this.closed;
  }
}

/**
 * Create and start a memory watcher
 */
export function createMemoryWatcher(
  db: Database.Database,
  config: MemoryConfig,
  embeddingProvider: EmbeddingProviderInterface,
  options: WatcherOptions & { workspaceDir?: string } = {}
): AgentMemoryWatcher {
  const watcher = new AgentMemoryWatcher(
    db,
    config,
    embeddingProvider,
    options
  );
  watcher.start();
  return watcher;
}

/**
 * Legacy alias for createMemoryWatcher
 * @deprecated Use createMemoryWatcher instead
 */
export function createAgentWatcher(
  agentName: string,
  db: Database.Database,
  config: MemoryConfig,
  embeddingProvider: EmbeddingProviderInterface,
  options: WatcherOptions = {}
): AgentMemoryWatcher {
  // agentName is ignored in the simplified version
  return createMemoryWatcher(db, config, embeddingProvider, options);
}
