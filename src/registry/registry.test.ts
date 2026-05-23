import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readCachedIndex, writeCachedIndex } from "./cache.js";
import { resolveAssetPath } from "./fetch.js";
import type { RegistryEntry } from "../agent/types.js";

const TEST_DIR = join(tmpdir(), "agent-hub-test-registry");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("cache", () => {
  it("reads and writes index", () => {
    const entries: RegistryEntry[] = [
      { name: "debugging", type: "skill", description: "Debug workflows" },
    ];
    const indexPath = join(TEST_DIR, "index.json");
    writeCachedIndex(indexPath, entries);
    const result = readCachedIndex(indexPath);
    expect(result).toEqual(entries);
  });

  it("returns empty array for missing index", () => {
    const result = readCachedIndex(join(TEST_DIR, "missing.json"));
    expect(result).toEqual([]);
  });
});

describe("resolveAssetPath", () => {
  it("resolves skill path in registry", () => {
    const entry: RegistryEntry = { name: "debugging", type: "skill", description: "test" };
    expect(resolveAssetPath(entry)).toBe("skills/debugging");
  });

  it("resolves rule path", () => {
    const entry: RegistryEntry = { name: "coding-style", type: "rule", description: "test" };
    expect(resolveAssetPath(entry)).toBe("rules/coding-style");
  });

  it("resolves claude-md path", () => {
    const entry: RegistryEntry = { name: "senior-engineer", type: "claude-md", description: "test" };
    expect(resolveAssetPath(entry)).toBe("claude-md/senior-engineer");
  });

  it("resolves dependency path", () => {
    const entry: RegistryEntry = { name: "qmd", type: "dependency", description: "test" };
    expect(resolveAssetPath(entry)).toBe("dependencies/qmd");
  });

  it("resolves agent path", () => {
    const entry: RegistryEntry = { name: "fullstack", type: "agent", description: "test" };
    expect(resolveAssetPath(entry)).toBe("agents/fullstack");
  });
});
