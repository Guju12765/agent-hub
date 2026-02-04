/**
 * memory_get tool - Read specific lines from memory files
 *
 * Used to read portions of memory files after using memory_search
 * to find relevant content. This keeps context small by reading
 * only the relevant portions.
 */

import { readFileSync } from "node:fs";
import { join, isAbsolute, normalize } from "node:path";

export interface GetToolInput {
  /** File path relative to memory directory, e.g., "MEMORY.md", "memory/2026-01-15.md" */
  path: string;
  /** Starting line number (1-indexed, optional) */
  from?: number;
  /** Number of lines to read (optional - defaults to entire file or rest of file from 'from') */
  lines?: number;
}

export interface GetToolResult {
  /** The file path that was read */
  path: string;
  /** The content read from the file */
  content: string;
  /** The starting line number (1-indexed) */
  fromLine: number;
  /** The ending line number (1-indexed) */
  toLine: number;
  /** The number of lines returned */
  linesReturned: number;
}

export const GET_TOOL_DEFINITION = {
  name: "memory_get",
  description: `Read specific lines from a memory file.

Use this tool after memory_search to read the full context around a search result.
You can read an entire file or a specific range of lines.

Examples:
- Read entire file: { "path": "MEMORY.md" }
- Read lines 10-20: { "path": "MEMORY.md", "from": 10, "lines": 11 }
- Read from line 50 to end: { "path": "MEMORY.md", "from": 50 }
- Read subdirectory file: { "path": "memory/2026-01-15.md" }`,
  inputSchema: {
    type: "object" as const,
    properties: {
      path: {
        type: "string",
        description:
          'File path relative to memory directory (e.g., "MEMORY.md", "memory/2026-01-15.md")',
      },
      from: {
        type: "number",
        description: "Starting line number (1-indexed, optional)",
      },
      lines: {
        type: "number",
        description: "Number of lines to read (optional - defaults to entire file)",
      },
    },
    required: ["path"],
  },
};

/**
 * Validate that a path is safe (no directory traversal or absolute paths)
 */
function validatePath(filePath: string): void {
  // Check for absolute paths (Unix-style)
  if (filePath.startsWith("/")) {
    throw new Error("Absolute paths are not allowed");
  }

  // Check for Windows absolute paths (e.g., C:\, D:\)
  if (/^[a-zA-Z]:[\\\/]/.test(filePath)) {
    throw new Error("Absolute paths are not allowed");
  }

  // Normalize and check for directory traversal
  const normalized = normalize(filePath);
  if (normalized.includes("..")) {
    throw new Error("Directory traversal is not allowed");
  }

  // Also check the original path for .. (before normalization might hide it)
  if (filePath.includes("..")) {
    throw new Error("Directory traversal is not allowed");
  }
}

/**
 * Execute the memory_get tool
 */
export async function executeGet(
  input: GetToolInput,
  baseDir: string
): Promise<GetToolResult> {
  // Validate path for security
  validatePath(input.path);

  // Construct full path
  const fullPath = join(baseDir, input.path);

  // Read the file
  let fileContent: string;
  try {
    fileContent = readFileSync(fullPath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`File not found: ${input.path}`);
    }
    throw err;
  }

  // Split into lines
  const allLines = fileContent.split("\n");
  const totalLines = allLines.length;

  // Determine the range to read
  let fromLine = input.from ?? 1;
  let toLine: number;

  if (input.lines !== undefined) {
    // Read specified number of lines
    toLine = Math.min(fromLine + input.lines - 1, totalLines);
  } else if (input.from !== undefined) {
    // Read from 'from' to end of file
    toLine = totalLines;
  } else {
    // Read entire file
    fromLine = 1;
    toLine = totalLines;
  }

  // Extract the lines (convert to 0-indexed for array access)
  const extractedLines = allLines.slice(fromLine - 1, toLine);
  const content = extractedLines.join("\n");

  return {
    path: input.path,
    content,
    fromLine,
    toLine,
    linesReturned: extractedLines.length,
  };
}
