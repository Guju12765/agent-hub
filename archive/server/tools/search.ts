/**
 * memory_search tool - Search for relevant memories
 */

import type { MemoryManager } from "../../memory/manager.js";

export interface SearchToolInput {
  query: string;
  limit?: number;
  minScore?: number;
}

export interface SearchToolResult {
  results: Array<{
    id: string;
    text: string;
    source: string;
    score: number;
    snippet: string;
    createdAt: string;
  }>;
  count: number;
  query: string;
}

export const SEARCH_TOOL_DEFINITION = {
  name: "memory_search",
  description: `Search for relevant memories using semantic and keyword search.

Use this tool when you need to:
- Find information that was previously stored
- Look up facts, preferences, or decisions
- Search for context about a topic
- Find related memories

The search uses both semantic (meaning-based) and keyword matching for best results.`,
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "The search query - can be a question or keywords",
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (default: 6)",
      },
      minScore: {
        type: "number",
        description: "Minimum relevance score 0-1 (default: 0.35)",
      },
    },
    required: ["query"],
  },
};

export async function executeSearch(
  manager: MemoryManager,
  input: SearchToolInput
): Promise<SearchToolResult> {
  const results = await manager.search(input.query, {
    limit: input.limit ?? 6,
    minScore: input.minScore ?? 0.35,
  });

  return {
    results: results.map((r) => ({
      id: r.memory.id,
      text: r.memory.text,
      source: r.memory.source,
      score: Math.round(r.score * 100) / 100,
      snippet: r.snippet,
      createdAt: new Date(r.memory.createdAt).toISOString(),
    })),
    count: results.length,
    query: input.query,
  };
}
