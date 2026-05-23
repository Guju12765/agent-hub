/**
 * memory_status tool - Get memory system status
 */

import type { MemoryManager } from "../../memory/manager.js";
import type { MemoryStatus } from "../../core/config/types.js";

export interface StatusToolInput {
  // No input required
}

export interface StatusToolResult {
  status: MemoryStatus;
  summary: string;
}

export const STATUS_TOOL_DEFINITION = {
  name: "memory_status",
  description: `Get the current status of the memory system.

Returns statistics about:
- Total chunks stored
- Indexed files count
- Embedding status
- Search capabilities available`,
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
};

export function executeStatus(manager: MemoryManager): StatusToolResult {
  const status = manager.getStatus();

  const searchCapabilities: string[] = [];
  if (status.ftsAvailable) searchCapabilities.push("keyword search (FTS5)");
  if (status.vectorAvailable) searchCapabilities.push("vector search");
  if (searchCapabilities.length === 0) searchCapabilities.push("basic search only");

  const summary = `Memory system has ${status.totalChunks} chunks (${status.embeddedChunks} embedded) from ${status.totalFiles} files.
Embedding model: ${status.embeddingModel}
Search capabilities: ${searchCapabilities.join(", ")}`;

  return {
    status,
    summary,
  };
}
