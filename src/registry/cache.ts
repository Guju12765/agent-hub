/**
 * Local cache for registry index
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { RegistryEntry } from "../agent/types.js";

/** Read cached registry index */
export function readCachedIndex(path: string): RegistryEntry[] {
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return [];
  }
}

/** Write registry index to cache */
export function writeCachedIndex(path: string, entries: RegistryEntry[]): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(entries, null, 2));
}
