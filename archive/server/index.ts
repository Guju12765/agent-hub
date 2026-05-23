/**
 * MCP Server setup
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import type { MemoryConfig } from "../core/config/types.js";
import { loadConfig } from "../core/config/defaults.js";
import { MemoryManager } from "../memory/manager.js";
import {
  createEmbeddingProvider,
  syncMemory,
  createAgentWatcher,
  type AgentMemoryWatcher,
} from "../memory/index.js";
import { getMemoryDir } from "../agent/index.js";

import {
  SEARCH_TOOL_DEFINITION,
  executeSearch,
  type SearchToolInput,
} from "./tools/search.js";
import {
  GET_TOOL_DEFINITION,
  executeGet,
  type GetToolInput,
} from "./tools/get.js";
import { STATUS_TOOL_DEFINITION, executeStatus } from "./tools/status.js";

export interface ServerOptions {
  config?: Partial<MemoryConfig>;
  agentName?: string;
  projectDir?: string;
}

export async function createServer(options: ServerOptions = {}): Promise<Server> {
  const config = loadConfig(options.config);
  const agentName = options.agentName;
  const projectDir = options.projectDir;

  // Database path is set by CLI via config.storage.path
  const dbPath = config.storage.path;

  if (agentName) {
    console.error(`Agent mode: ${agentName}`);
  }
  // Always show project directory (we're always in project mode now)
  const { detectProjectDir } = await import("../agent/paths.js");
  const effectiveProjectDir = projectDir ?? detectProjectDir();
  console.error(`Project directory: ${effectiveProjectDir}${projectDir ? " (explicit)" : " (auto-detected)"}`);
  console.error(`Database path: ${dbPath}`);

  // Create embedding provider (auto-selects best available)
  console.error("Initializing embedding provider...");
  const { provider: embeddingProvider, providerId, fallbackFrom, fallbackReason } =
    await createEmbeddingProvider(config.embedding);

  if (fallbackFrom) {
    console.error(`Warning: ${fallbackFrom} failed (${fallbackReason}), using ${providerId}`);
  } else {
    console.error(`Using embedding provider: ${providerId} (${embeddingProvider.model})`);
  }

  // Create memory manager with correct database path
  const manager = new MemoryManager(
    dbPath,
    config,
    embeddingProvider
  );

  // If in agent mode, sync markdown to index and start watcher
  let watcher: AgentMemoryWatcher | null = null;

  if (agentName) {
    console.error(`Syncing memory to index...`);
    try {
      const syncResult = await syncMemory(
        manager.getDatabase(),
        config,
        embeddingProvider,
        {
          workspaceDir: projectDir,
          onProgress: (current, total) => {
            if (total > 0) {
              console.error(`  Indexing files: ${current}/${total}`);
            }
          },
        }
      );
      console.error(`Sync complete: ${syncResult.indexed} indexed, ${syncResult.skipped} skipped, ${syncResult.deleted} deleted`);

      // Start file watcher for memory file changes
      console.error("Starting file watcher...");
      watcher = createAgentWatcher(
        agentName,
        manager.getDatabase(),
        config,
        embeddingProvider,
        {
          onSync: (result) => {
            console.error(`File sync: ${result.indexed} indexed, ${result.skipped} skipped`);
          },
          onError: (err) => {
            console.error(`Sync error: ${err.message}`);
          },
        }
      );
    } catch (err) {
      console.error(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Create MCP server
  const server = new Server(
    {
      name: "agent-hub",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        SEARCH_TOOL_DEFINITION,
        GET_TOOL_DEFINITION,
        STATUS_TOOL_DEFINITION,
      ],
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "memory_search": {
          const input = args as unknown as SearchToolInput;
          const result = await executeSearch(manager, input);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "memory_get": {
          const input = args as unknown as GetToolInput;
          // Always use project-level memory directory
          const baseDir = getMemoryDir(projectDir);
          const result = await executeGet(input, baseDir);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }

        case "memory_status": {
          const result = executeStatus(manager);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: message }),
          },
        ],
        isError: true,
      };
    }
  });

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    if (watcher) watcher.close();
    manager.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    if (watcher) watcher.close();
    manager.close();
    process.exit(0);
  });

  return server;
}

export async function runServer(options: ServerOptions = {}): Promise<void> {
  const server = await createServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Agent Hub MCP Server running on stdio");
}
