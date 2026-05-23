import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { copyAssetToProject } from "./copy.js";
import type { RegistryEntry } from "../agent/types.js";

const TEST_DIR = join(tmpdir(), "agent-hub-test-deploy");
const REGISTRY_DIR = join(TEST_DIR, "registry");
const PROJECT_DIR = join(TEST_DIR, "project");

beforeEach(() => {
  mkdirSync(join(REGISTRY_DIR, "skills", "debugging"), { recursive: true });
  mkdirSync(join(REGISTRY_DIR, "rules", "coding-style"), { recursive: true });
  mkdirSync(join(REGISTRY_DIR, "claude-md", "senior"), { recursive: true });
  mkdirSync(join(PROJECT_DIR, ".claude"), { recursive: true });

  writeFileSync(join(REGISTRY_DIR, "skills", "debugging", "SKILL.md"), "# Debugging");
  writeFileSync(join(REGISTRY_DIR, "skills", "debugging", "asset.json"), '{"name":"debugging"}');
  writeFileSync(join(REGISTRY_DIR, "rules", "coding-style", "coding-style.md"), "# Style");
  writeFileSync(join(REGISTRY_DIR, "rules", "coding-style", "asset.json"), '{"name":"coding-style"}');
  writeFileSync(join(REGISTRY_DIR, "claude-md", "senior", "CLAUDE.md"), "# Senior");
  writeFileSync(join(REGISTRY_DIR, "claude-md", "senior", "asset.json"), '{"name":"senior"}');
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("copyAssetToProject", () => {
  it("copies skill to .claude/skills/{name}/", () => {
    const entry: RegistryEntry = { name: "debugging", type: "skill", description: "test" };
    copyAssetToProject(entry, REGISTRY_DIR, PROJECT_DIR);
    expect(existsSync(join(PROJECT_DIR, ".claude", "skills", "debugging", "SKILL.md"))).toBe(true);
    // asset.json should NOT be copied
    expect(existsSync(join(PROJECT_DIR, ".claude", "skills", "debugging", "asset.json"))).toBe(false);
  });

  it("copies rule to .claude/rules/", () => {
    const entry: RegistryEntry = { name: "coding-style", type: "rule", description: "test" };
    copyAssetToProject(entry, REGISTRY_DIR, PROJECT_DIR);
    expect(existsSync(join(PROJECT_DIR, ".claude", "rules", "coding-style.md"))).toBe(true);
  });

  it("copies claude-md to .claude/CLAUDE.md", () => {
    const entry: RegistryEntry = { name: "senior", type: "claude-md", description: "test" };
    copyAssetToProject(entry, REGISTRY_DIR, PROJECT_DIR);
    expect(readFileSync(join(PROJECT_DIR, ".claude", "CLAUDE.md"), "utf-8")).toBe("# Senior");
  });

  it("does nothing for dependency type", () => {
    const entry: RegistryEntry = { name: "qmd", type: "dependency", description: "test" };
    // Should not throw even if directory doesn't exist
    copyAssetToProject(entry, REGISTRY_DIR, PROJECT_DIR);
  });
});
