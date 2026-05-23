/**
 * Registry index reader
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RegistryEntry } from "../agent/types.js";
import { getRegistryPath } from "./fetch.js";

/** Read the registry index */
export function readIndex(): RegistryEntry[] {
  const indexPath = join(getRegistryPath(), "index.json");
  if (!existsSync(indexPath)) return [];
  try {
    return JSON.parse(readFileSync(indexPath, "utf-8"));
  } catch {
    return [];
  }
}
