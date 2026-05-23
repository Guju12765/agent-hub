/**
 * Atomic Reindex Operations
 * Adapted from OpenClaw's manager.ts runSafeReindex pattern
 * Provides safe database swap with rollback capability
 */

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Swap index files atomically with backup for rollback
 * Works by: target -> backup, temp -> target, remove backup
 * On failure: backup -> target (restore)
 */
export async function swapIndexFiles(
  targetPath: string,
  tempPath: string
): Promise<void> {
  const backupPath = `${targetPath}.backup-${randomUUID()}`;
  await moveIndexFiles(targetPath, backupPath);
  try {
    await moveIndexFiles(tempPath, targetPath);
  } catch (err) {
    // Restore from backup on failure
    await moveIndexFiles(backupPath, targetPath);
    throw err;
  }
  await removeIndexFiles(backupPath);
}

/**
 * Move SQLite database files (main + WAL + SHM)
 * Handles ENOENT gracefully for optional files
 */
export async function moveIndexFiles(
  sourceBase: string,
  targetBase: string
): Promise<void> {
  const suffixes = ["", "-wal", "-shm"];
  for (const suffix of suffixes) {
    const source = `${sourceBase}${suffix}`;
    const target = `${targetBase}${suffix}`;
    try {
      await fs.rename(source, target);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
  }
}

/**
 * Remove SQLite database files (main + WAL + SHM)
 */
export async function removeIndexFiles(basePath: string): Promise<void> {
  const suffixes = ["", "-wal", "-shm"];
  await Promise.all(
    suffixes.map((suffix) => fs.rm(`${basePath}${suffix}`, { force: true }))
  );
}

/**
 * Generate a temp database path for atomic reindex
 */
export function getTempIndexPath(originalPath: string): string {
  return `${originalPath}.tmp-${randomUUID()}`;
}

/**
 * Ensure parent directory exists for a database path
 */
export async function ensureIndexDir(dbPath: string): Promise<void> {
  const dir = path.dirname(dbPath);
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Check if an index file exists
 */
export async function indexExists(dbPath: string): Promise<boolean> {
  try {
    await fs.access(dbPath);
    return true;
  } catch {
    return false;
  }
}

export interface AtomicReindexOptions {
  /**
   * Path to the target database
   */
  targetPath: string;

  /**
   * Function to build the new index in a temp database
   * Should return the temp database path after building
   */
  buildIndex: (tempPath: string) => Promise<void>;

  /**
   * Optional: Called before swap to seed cache from old db
   */
  onBeforeSwap?: (targetPath: string, tempPath: string) => Promise<void>;

  /**
   * Optional: Called after successful swap
   */
  onAfterSwap?: (targetPath: string) => Promise<void>;

  /**
   * Optional: Called on rollback
   */
  onRollback?: (error: Error, targetPath: string) => Promise<void>;
}

/**
 * Perform atomic reindex with rollback capability
 *
 * Process:
 * 1. Create temp database path
 * 2. Build new index in temp database
 * 3. Swap files atomically (with backup)
 * 4. On failure, rollback to original
 */
export async function atomicReindex(
  options: AtomicReindexOptions
): Promise<void> {
  const { targetPath, buildIndex, onBeforeSwap, onAfterSwap, onRollback } = options;
  const tempPath = getTempIndexPath(targetPath);

  try {
    // Ensure directory exists
    await ensureIndexDir(tempPath);

    // Build the new index in temp location
    await buildIndex(tempPath);

    // Optional: seed cache or perform pre-swap operations
    if (onBeforeSwap) {
      await onBeforeSwap(targetPath, tempPath);
    }

    // Atomic swap with rollback capability
    await swapIndexFiles(targetPath, tempPath);

    // Optional: post-swap cleanup
    if (onAfterSwap) {
      await onAfterSwap(targetPath);
    }
  } catch (err) {
    // Clean up temp files
    await removeIndexFiles(tempPath);

    // Notify rollback handler
    if (onRollback) {
      await onRollback(
        err instanceof Error ? err : new Error(String(err)),
        targetPath
      );
    }

    throw err;
  }
}
