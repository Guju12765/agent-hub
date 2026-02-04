import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { platform, tmpdir } from "node:os";
import { createInterface } from "node:readline";
import { join, basename } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Detect available text editor
 */
export function detectEditor(): string | null {
  // Check environment variables first
  if (process.env.EDITOR) return process.env.EDITOR;
  if (process.env.VISUAL) return process.env.VISUAL;

  // Platform-specific defaults
  if (platform() === "win32") {
    return "notepad";
  }

  // Unix-like: try common editors
  if (existsSync("/usr/bin/vim")) return "vim";
  if (existsSync("/usr/bin/nano")) return "nano";
  if (existsSync("/bin/nano")) return "nano";

  return null;
}

/**
 * Create conflict markers for merge
 */
export function createConflictMarkers(
  existingContent: string,
  agentContent: string,
  agentName: string
): string {
  return `# ============================================
# CONFLICT: Choose one or combine both
# ============================================

# --- YOUR VERSION ---
${existingContent}

# --- AGENT VERSION (${agentName}) ---
${agentContent}

# ============================================
# Delete markers and unwanted sections above
# ============================================
`;
}

/**
 * Check if content still has conflict markers
 */
export function hasConflictMarkers(content: string): boolean {
  return content.includes("# --- YOUR VERSION ---") ||
         content.includes("# --- AGENT VERSION");
}

interface HookCommand {
  type: "command";
  command: string;
}

interface HookMatcher {
  matcher: string;
  hooks: HookCommand[];
}

type HooksConfig = Record<string, HookMatcher[]>;

/**
 * Auto-merge hooks JSON by combining arrays
 */
export function mergeHooks(existing: HooksConfig, agent: HooksConfig): HooksConfig {
  const merged = { ...existing };

  for (const [event, agentHooks] of Object.entries(agent)) {
    if (!merged[event]) {
      // New event type - just add it
      merged[event] = agentHooks;
    } else {
      // Event exists - merge hook arrays
      const existingArray = merged[event];
      const agentArray = agentHooks;

      // Check for duplicate hook commands
      const existingCommands = new Set(
        existingArray.flatMap((h) => h.hooks.map((hook) => hook.command))
      );

      const uniqueNew = agentArray.filter((matcher) =>
        matcher.hooks.every((hook) => !existingCommands.has(hook.command))
      );

      if (uniqueNew.length > 0) {
        merged[event] = [...existingArray, ...uniqueNew];
      }
    }
  }

  return merged;
}

/**
 * Check if hooks have conflicts (same command for same event)
 */
export function hooksHaveConflict(
  existing: HooksConfig,
  agent: HooksConfig
): boolean {
  for (const [event, agentHooks] of Object.entries(agent)) {
    if (!existing[event]) continue;

    const existingArray = existing[event];
    const agentArray = agentHooks;

    const existingCommands = new Set(
      existingArray.flatMap((h) => h.hooks.map((hook) => hook.command))
    );

    const hasConflict = agentArray.some((matcher) =>
      matcher.hooks.some((hook) => existingCommands.has(hook.command))
    );

    if (hasConflict) return true;
  }

  return false;
}

/**
 * Prompt user for input with specific choices
 */
export async function prompt(
  message: string,
  choices: string[]
): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message}\nChoice: `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      const choice = choices.find((c) => c.toLowerCase().startsWith(normalized));
      if (choice) {
        resolve(choice);
      } else {
        console.log(`Invalid choice. Please enter one of: ${choices.join(", ")}`);
        // Re-prompt
        resolve(prompt(message, choices));
      }
    });
  });
}

export type ConflictAction = "keep" | "replace" | "merge" | "skip" | "abort";

export class ConflictResolver {
  private skipped: string[] = [];
  private backup: Map<string, string> = new Map();
  private newFiles: string[] = [];
  private conflicts: string[] = [];
  private editor: string | null;
  private stats = {
    copied: 0,
    replaced: 0,
    merged: 0,
    skipped: 0,
  };

  constructor(
    private agentName: string,
    private isDryRun: boolean = false,
    private forceMode?: "keep" | "replace"
  ) {
    this.editor = detectEditor();
  }

  /**
   * Handle a file conflict
   */
  async handleConflict(
    targetPath: string,
    agentPath: string,
    type: "file" | "skill-dir"
  ): Promise<ConflictAction> {
    // If dry run, just track
    if (this.isDryRun) {
      this.conflicts.push(targetPath);
      console.log(`Would conflict: ${basename(targetPath)} (${type})`);
      return "skip";
    }

    // If force mode, return immediately
    if (this.forceMode === "keep") {
      this.stats.skipped++;
      return "keep";
    }
    if (this.forceMode === "replace") {
      this.stats.replaced++;
      return "replace";
    }

    // Interactive prompt
    return await this.promptForAction(targetPath, agentPath, type);
  }

  /**
   * Prompt user for conflict resolution action
   */
  private async promptForAction(
    targetPath: string,
    agentPath: string,
    type: "file" | "skill-dir"
  ): Promise<ConflictAction> {
    const fileName = basename(targetPath);
    console.log(`\nConflict: ${fileName} already exists`);
    console.log(`  [K]eep existing    [R]eplace with agent's`);
    console.log(`  [M]erge in editor  [D]iff first`);
    console.log(`  [S]kip for now     [A]bort hire`);

    const choice = await prompt("", ["Keep", "Replace", "Merge", "Diff", "Skip", "Abort"]);

    switch (choice) {
      case "Keep":
        this.stats.skipped++;
        return "keep";
      case "Replace":
        this.stats.replaced++;
        return "replace";
      case "Merge":
        return await this.handleMerge(targetPath, agentPath);
      case "Diff":
        return await this.handleDiff(targetPath, agentPath);
      case "Skip":
        this.skipped.push(targetPath);
        this.stats.skipped++;
        return "skip";
      case "Abort":
        return await this.handleAbort();
      default:
        return "skip";
    }
  }

  /**
   * Handle merge action
   */
  private async handleMerge(
    targetPath: string,
    agentPath: string
  ): Promise<ConflictAction> {
    if (!this.editor) {
      console.error("No editor found. Set $EDITOR environment variable.");
      console.log("Falling back to [K]eep or [R]eplace.");
      const choice = await prompt(
        "  [K]eep existing  [R]eplace with agent's",
        ["Keep", "Replace"]
      );
      return choice === "Keep" ? "keep" : "replace";
    }

    // Create temp file with conflict markers
    const existing = readFileSync(targetPath, "utf-8");
    const agent = readFileSync(agentPath, "utf-8");
    const tempFile = join(tmpdir(), `merge-${basename(targetPath)}`);

    writeFileSync(
      tempFile,
      createConflictMarkers(existing, agent, this.agentName)
    );

    // Open editor
    console.log(`Opening ${this.editor}...`);
    const result = spawnSync(this.editor, [tempFile], { stdio: "inherit" });

    if (result.error || result.status !== 0) {
      console.error(
        `Editor failed: ${result.error?.message || "Exit code " + result.status}`
      );
      console.log(`Temp file saved at: ${tempFile}`);
      const choice = await prompt(
        "  [R]etry  [K]eep existing  [R]eplace with agent's",
        ["Retry", "Keep", "Replace"]
      );
      if (choice === "Retry") return this.handleMerge(targetPath, agentPath);
      return choice === "Keep" ? "keep" : "replace";
    }

    // Read merged content
    const merged = readFileSync(tempFile, "utf-8");

    // Validate
    if (!merged.trim()) {
      console.log("Empty file - treating as [K]eep existing");
      unlinkSync(tempFile);
      return "keep";
    }

    if (hasConflictMarkers(merged)) {
      console.log("Conflict markers still present. Merge incomplete.");
      const choice = await prompt(
        "  [R]etry  [K]eep existing  [R]eplace with agent's",
        ["Retry", "Keep", "Replace"]
      );
      unlinkSync(tempFile);
      if (choice === "Retry") return this.handleMerge(targetPath, agentPath);
      return choice === "Keep" ? "keep" : "replace";
    }

    // Save merged content
    this.backup.set(targetPath, existing);
    writeFileSync(targetPath, merged);
    unlinkSync(tempFile);
    this.stats.merged++;
    return "merge";
  }

  /**
   * Handle diff action
   */
  private async handleDiff(
    targetPath: string,
    agentPath: string
  ): Promise<ConflictAction> {
    console.log("\nShowing diff...\n");
    spawnSync("git", ["diff", "--no-index", "--color=always", targetPath, agentPath], {
      stdio: "inherit",
    });

    // Re-prompt
    return await this.promptForAction(targetPath, agentPath, "file");
  }

  /**
   * Handle abort action
   */
  private async handleAbort(): Promise<ConflictAction> {
    console.log("\nAbort hire operation?");
    console.log("  [R]ollback all changes made so far");
    console.log("  [K]eep changes, stop processing remaining files");
    console.log("  [C]ancel abort (continue hiring)");

    const choice = await prompt("", ["Rollback", "Keep", "Cancel"]);

    if (choice === "Rollback") {
      await this.rollback();
      return "abort";
    } else if (choice === "Keep") {
      return "abort";
    } else {
      // Cancel abort, continue
      return await this.promptForAction("", "", "file");
    }
  }

  /**
   * Rollback all changes
   */
  async rollback(): Promise<void> {
    console.log("Rolling back changes...");

    // Restore backed-up files
    for (const [path, content] of this.backup) {
      writeFileSync(path, content);
      console.log(`  Restored: ${path}`);
    }

    // Remove newly copied files
    for (const path of this.newFiles) {
      if (existsSync(path)) {
        unlinkSync(path);
        console.log(`  Removed: ${path}`);
      }
    }
  }

  /**
   * Show summary of hire operation
   */
  showSummary(): void {
    // For dry run, show conflicts
    if (this.isDryRun) {
      if (this.conflicts.length > 0) {
        console.log(`\nFound ${this.conflicts.length} potential conflicts:`);
        this.conflicts.forEach((path) => console.log(`  - ${basename(path)}`));
        console.log("\nRun without --dry-run to resolve conflicts interactively.");
      }
      return;
    }

    // For regular mode, show detailed summary
    if (this.stats.copied === 0 && this.stats.replaced === 0 &&
        this.stats.merged === 0 && this.skipped.length === 0) {
      return; // No conflicts or actions, skip summary
    }

    console.log("\nConflict Resolution Summary:");
    if (this.stats.copied > 0) console.log(`  Copied: ${this.stats.copied} files`);
    if (this.stats.replaced > 0) console.log(`  Replaced: ${this.stats.replaced} files`);
    if (this.stats.merged > 0) console.log(`  Merged: ${this.stats.merged} files`);
    if (this.skipped.length > 0) {
      console.log(`  Skipped: ${this.skipped.length} files`);
      this.skipped.forEach((path) => console.log(`    - ${basename(path)}`));
      console.log("");
      console.log(
        `  Tip: Run 'npx agent-hub hire ${this.agentName}' again to handle skipped files`
      );
    }
  }
}
