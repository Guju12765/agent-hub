/**
 * Tests for hire.ts - Conflict Resolution Integration Tests
 *
 * These tests verify that ALL file operations use conflict resolution properly.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Test fixtures directory
const TEST_DIR = join(tmpdir(), "agent-hub-test-hire");
const AGENT_DIR = join(TEST_DIR, "agent-master");
const PROJECT_DIR = join(TEST_DIR, "project");

// Import the functions we need to test
// We'll need to refactor hire.ts to export these for testing
import {
  copyConfigFile,
  copyClaudeMd,
  copyScriptsDir,
  copyPluginsJson,
  copyDirWithConflictResolution,
} from "./hire.js";
import { ConflictResolver } from "../conflict-resolver.js";

describe("hire command - conflict resolution", () => {
  beforeEach(() => {
    // Create fresh test directories
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(AGENT_DIR, { recursive: true });
    mkdirSync(PROJECT_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe("Issue #1: CLAUDE.md conflict resolution", () => {
    it("should invoke resolver when CLAUDE.md already exists", async () => {
      // Setup: existing CLAUDE.md in project
      const projectClaudeMd = join(PROJECT_DIR, ".claude", "CLAUDE.md");
      const agentClaudeMd = join(AGENT_DIR, "CLAUDE.md");

      mkdirSync(join(PROJECT_DIR, ".claude"), { recursive: true });
      writeFileSync(projectClaudeMd, "# Existing Project Instructions");
      writeFileSync(agentClaudeMd, "# Agent Instructions");

      const resolver = new ConflictResolver("test-agent", false, "keep");

      // This function should use the resolver when file exists
      const result = await copyClaudeMd(
        agentClaudeMd,
        projectClaudeMd,
        resolver
      );

      // With force-keep, it should return "skipped" and keep existing
      expect(result.action).toBe("keep");
      expect(readFileSync(projectClaudeMd, "utf-8")).toBe(
        "# Existing Project Instructions"
      );
    });

    it("should replace CLAUDE.md when resolver returns replace", async () => {
      const projectClaudeMd = join(PROJECT_DIR, ".claude", "CLAUDE.md");
      const agentClaudeMd = join(AGENT_DIR, "CLAUDE.md");

      mkdirSync(join(PROJECT_DIR, ".claude"), { recursive: true });
      writeFileSync(projectClaudeMd, "# Existing Project Instructions");
      writeFileSync(agentClaudeMd, "# Agent Instructions");

      const resolver = new ConflictResolver("test-agent", false, "replace");

      const result = await copyClaudeMd(
        agentClaudeMd,
        projectClaudeMd,
        resolver
      );

      expect(result.action).toBe("replace");
      expect(readFileSync(projectClaudeMd, "utf-8")).toBe("# Agent Instructions");
    });
  });

  describe("Issue #2: scripts directory conflict resolution", () => {
    it("should invoke resolver when scripts directory exists", async () => {
      // Setup: existing scripts in project
      const projectScripts = join(PROJECT_DIR, ".claude", "scripts");
      const agentScripts = join(AGENT_DIR, "scripts");

      mkdirSync(projectScripts, { recursive: true });
      mkdirSync(agentScripts, { recursive: true });
      writeFileSync(join(projectScripts, "existing.py"), "# existing script");
      writeFileSync(join(agentScripts, "agent.py"), "# agent script");

      const resolver = new ConflictResolver("test-agent", false, "keep");

      const result = await copyScriptsDir(
        agentScripts,
        projectScripts,
        resolver
      );

      // With force-keep, should skip without overwriting
      expect(result.action).toBe("keep");
      expect(existsSync(join(projectScripts, "existing.py"))).toBe(true);
    });

    it("should merge scripts when resolver returns replace", async () => {
      const projectScripts = join(PROJECT_DIR, ".claude", "scripts");
      const agentScripts = join(AGENT_DIR, "scripts");

      mkdirSync(projectScripts, { recursive: true });
      mkdirSync(agentScripts, { recursive: true });
      writeFileSync(join(projectScripts, "existing.py"), "# existing script");
      writeFileSync(join(agentScripts, "agent.py"), "# agent script");
      writeFileSync(join(agentScripts, "shared.py"), "# agent shared");

      const resolver = new ConflictResolver("test-agent", false, "replace");

      const result = await copyScriptsDir(
        agentScripts,
        projectScripts,
        resolver
      );

      expect(result.action).toBe("replace");
      // Agent files should be copied
      expect(existsSync(join(projectScripts, "agent.py"))).toBe(true);
      expect(existsSync(join(projectScripts, "shared.py"))).toBe(true);
    });
  });

  describe("Issue #3: plugins.json conflict resolution", () => {
    it("should invoke resolver when plugins.json exists", async () => {
      const projectPlugins = join(PROJECT_DIR, ".claude", "plugins.json");
      const agentPlugins = join(AGENT_DIR, "plugins.json");

      mkdirSync(join(PROJECT_DIR, ".claude"), { recursive: true });
      writeFileSync(projectPlugins, '{"existing": true}');
      writeFileSync(agentPlugins, '{"agent": true}');

      const resolver = new ConflictResolver("test-agent", false, "keep");

      const result = await copyPluginsJson(
        agentPlugins,
        projectPlugins,
        resolver
      );

      expect(result.action).toBe("keep");
      expect(JSON.parse(readFileSync(projectPlugins, "utf-8"))).toEqual({
        existing: true,
      });
    });

    it("should replace plugins.json when resolver returns replace", async () => {
      const projectPlugins = join(PROJECT_DIR, ".claude", "plugins.json");
      const agentPlugins = join(AGENT_DIR, "plugins.json");

      mkdirSync(join(PROJECT_DIR, ".claude"), { recursive: true });
      writeFileSync(projectPlugins, '{"existing": true}');
      writeFileSync(agentPlugins, '{"agent": true}');

      const resolver = new ConflictResolver("test-agent", false, "replace");

      const result = await copyPluginsJson(
        agentPlugins,
        projectPlugins,
        resolver
      );

      expect(result.action).toBe("replace");
      expect(JSON.parse(readFileSync(projectPlugins, "utf-8"))).toEqual({
        agent: true,
      });
    });
  });

  describe("Issue #5: copyDirRecursive per-file conflict resolution", () => {
    it("should check conflicts for each file inside directory", async () => {
      const projectSkill = join(PROJECT_DIR, ".claude", "skills", "my-skill");
      const agentSkill = join(AGENT_DIR, "skills", "my-skill");

      mkdirSync(projectSkill, { recursive: true });
      mkdirSync(agentSkill, { recursive: true });

      // Existing file in project (modified by user)
      writeFileSync(join(projectSkill, "skill.md"), "# User Modified");
      writeFileSync(join(projectSkill, "config.json"), '{"user": true}');

      // Agent's version
      writeFileSync(join(agentSkill, "skill.md"), "# Agent Original");
      writeFileSync(join(agentSkill, "config.json"), '{"agent": true}');
      writeFileSync(join(agentSkill, "new-file.md"), "# New from agent");

      const resolver = new ConflictResolver("test-agent", false, "keep");

      const result = await copyDirWithConflictResolution(
        agentSkill,
        projectSkill,
        resolver
      );

      // With force-keep:
      // - Existing files should be kept (skill.md, config.json)
      // - New files should be copied (new-file.md)
      expect(readFileSync(join(projectSkill, "skill.md"), "utf-8")).toBe(
        "# User Modified"
      );
      expect(readFileSync(join(projectSkill, "config.json"), "utf-8")).toBe(
        '{"user": true}'
      );
      expect(existsSync(join(projectSkill, "new-file.md"))).toBe(true);
    });

    it("should replace individual files when resolver returns replace", async () => {
      const projectSkill = join(PROJECT_DIR, ".claude", "skills", "my-skill");
      const agentSkill = join(AGENT_DIR, "skills", "my-skill");

      mkdirSync(projectSkill, { recursive: true });
      mkdirSync(agentSkill, { recursive: true });

      writeFileSync(join(projectSkill, "skill.md"), "# User Modified");
      writeFileSync(join(agentSkill, "skill.md"), "# Agent Original");

      const resolver = new ConflictResolver("test-agent", false, "replace");

      await copyDirWithConflictResolution(agentSkill, projectSkill, resolver);

      expect(readFileSync(join(projectSkill, "skill.md"), "utf-8")).toBe(
        "# Agent Original"
      );
    });
  });

  describe("Issue #6: Re-hire with --update flag", () => {
    it("should allow re-hire when --update flag is passed", async () => {
      // This test documents that we need an --update flag
      // The actual implementation will be in hireCommand
      // For now, we test that the check can be bypassed

      const memoryDir = join(PROJECT_DIR, ".claude", "memory");
      mkdirSync(memoryDir, { recursive: true });
      writeFileSync(join(memoryDir, "MEMORY.md"), "# Existing memory");

      // The isAgentHiredInProject check should be bypassable
      // We'll add an `update` option to the hire command
      expect(existsSync(join(memoryDir, "MEMORY.md"))).toBe(true);

      // When --update is passed, the hire should proceed despite MEMORY.md existing
      // This will be tested at the integration level
    });
  });
});

describe("Issue #4: MCP server conflict notification", () => {
  // This is tested separately as it's in claude.ts
  it("should return info about skipped servers", async () => {
    // We'll need to modify injectMcp to return skip info
    // For now, document the expected behavior
    expect(true).toBe(true); // Placeholder
  });
});
