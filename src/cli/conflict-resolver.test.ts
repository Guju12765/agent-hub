/**
 * Tests for conflict-resolver.ts
 *
 * These tests verify the conflict resolution behavior during agent hire operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ConflictResolver,
  mergeHooks,
  hooksHaveConflict,
  createConflictMarkers,
  hasConflictMarkers,
} from "./conflict-resolver.js";

// Test fixtures directory
const TEST_DIR = join(tmpdir(), "agent-hub-test-conflict-resolver");

describe("ConflictResolver", () => {
  beforeEach(() => {
    // Create fresh test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe("dry-run mode", () => {
    it("should track conflicts without making changes", async () => {
      const resolver = new ConflictResolver("test-agent", true); // isDryRun = true

      const targetPath = join(TEST_DIR, "existing.md");
      const agentPath = join(TEST_DIR, "agent.md");

      writeFileSync(targetPath, "existing content");
      writeFileSync(agentPath, "agent content");

      const action = await resolver.handleConflict(targetPath, agentPath, "file");

      expect(action).toBe("skip");
      // File should remain unchanged
      expect(readFileSync(targetPath, "utf-8")).toBe("existing content");
    });
  });

  describe("force-keep mode", () => {
    it("should keep existing files without prompting", async () => {
      const resolver = new ConflictResolver("test-agent", false, "keep");

      const targetPath = join(TEST_DIR, "existing.md");
      const agentPath = join(TEST_DIR, "agent.md");

      writeFileSync(targetPath, "existing content");
      writeFileSync(agentPath, "agent content");

      const action = await resolver.handleConflict(targetPath, agentPath, "file");

      expect(action).toBe("keep");
      expect(readFileSync(targetPath, "utf-8")).toBe("existing content");
    });
  });

  describe("force-replace mode", () => {
    it("should return replace action without prompting", async () => {
      const resolver = new ConflictResolver("test-agent", false, "replace");

      const targetPath = join(TEST_DIR, "existing.md");
      const agentPath = join(TEST_DIR, "agent.md");

      writeFileSync(targetPath, "existing content");
      writeFileSync(agentPath, "agent content");

      const action = await resolver.handleConflict(targetPath, agentPath, "file");

      expect(action).toBe("replace");
      // Note: The resolver returns action, caller must do the actual copy
    });
  });
});

describe("mergeHooks", () => {
  it("should add new event types", () => {
    const existing = {};
    const agent = {
      SessionStart: [{ matcher: "*", hooks: [{ type: "command" as const, command: "echo hi" }] }],
    };

    const merged = mergeHooks(existing, agent);

    expect(merged.SessionStart).toHaveLength(1);
    expect(merged.SessionStart[0].hooks[0].command).toBe("echo hi");
  });

  it("should merge hooks for same event type", () => {
    const existing = {
      SessionStart: [{ matcher: "*", hooks: [{ type: "command" as const, command: "existing-cmd" }] }],
    };
    const agent = {
      SessionStart: [{ matcher: "*", hooks: [{ type: "command" as const, command: "new-cmd" }] }],
    };

    const merged = mergeHooks(existing, agent);

    expect(merged.SessionStart).toHaveLength(2);
  });

  it("should skip duplicate commands", () => {
    const existing = {
      SessionStart: [{ matcher: "*", hooks: [{ type: "command" as const, command: "same-cmd" }] }],
    };
    const agent = {
      SessionStart: [{ matcher: "*", hooks: [{ type: "command" as const, command: "same-cmd" }] }],
    };

    const merged = mergeHooks(existing, agent);

    expect(merged.SessionStart).toHaveLength(1); // No duplicate added
  });
});

describe("hooksHaveConflict", () => {
  it("should return false when no overlap", () => {
    const existing = {
      SessionStart: [{ matcher: "*", hooks: [{ type: "command" as const, command: "cmd1" }] }],
    };
    const agent = {
      PreCompact: [{ matcher: "*", hooks: [{ type: "command" as const, command: "cmd2" }] }],
    };

    expect(hooksHaveConflict(existing, agent)).toBe(false);
  });

  it("should return true when same command exists", () => {
    const existing = {
      SessionStart: [{ matcher: "*", hooks: [{ type: "command" as const, command: "same-cmd" }] }],
    };
    const agent = {
      SessionStart: [{ matcher: "*", hooks: [{ type: "command" as const, command: "same-cmd" }] }],
    };

    expect(hooksHaveConflict(existing, agent)).toBe(true);
  });
});

describe("createConflictMarkers", () => {
  it("should create proper conflict markers", () => {
    const result = createConflictMarkers("existing", "agent", "alice");

    expect(result).toContain("# --- YOUR VERSION ---");
    expect(result).toContain("existing");
    expect(result).toContain("# --- AGENT VERSION (alice) ---");
    expect(result).toContain("agent");
  });
});

describe("hasConflictMarkers", () => {
  it("should detect YOUR VERSION marker", () => {
    expect(hasConflictMarkers("# --- YOUR VERSION ---")).toBe(true);
  });

  it("should detect AGENT VERSION marker", () => {
    expect(hasConflictMarkers("# --- AGENT VERSION (alice) ---")).toBe(true);
  });

  it("should return false for clean content", () => {
    expect(hasConflictMarkers("clean content")).toBe(false);
  });
});

/**
 * FIXED ISSUES - These issues have been resolved
 *
 * The following issues were identified and fixed:
 * - Issue #1: CLAUDE.md now uses copyClaudeMd() with ConflictResolver
 * - Issue #2: scripts directory now uses copyScriptsDir() with ConflictResolver
 * - Issue #3: plugins.json now uses copyPluginsJson() with ConflictResolver
 * - Issue #4: MCP servers now return { added, skipped } arrays for notification
 * - Issue #5: copyDirWithConflictResolution() provides per-file conflict resolution
 * - Issue #6: --update flag allows re-hiring with conflict resolution
 *
 * See hire.test.ts for comprehensive tests of these fixes.
 */
