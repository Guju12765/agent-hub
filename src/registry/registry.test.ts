import { describe, it, expect } from "vitest";
import { readIndex } from "./cache.js";
import { resolveAssetPath, getRegistryPath } from "./fetch.js";
import { existsSync } from "node:fs";
import type { RegistryEntry } from "../agent/types.js";

describe("readIndex", () => {
  it("reads the bundled registry index", () => {
    const entries = readIndex();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]).toHaveProperty("name");
    expect(entries[0]).toHaveProperty("type");
    expect(entries[0]).toHaveProperty("description");
  });
});

describe("getRegistryPath", () => {
  it("points to an existing directory", () => {
    const path = getRegistryPath();
    expect(existsSync(path)).toBe(true);
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
