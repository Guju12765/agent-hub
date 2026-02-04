#!/usr/bin/env node
/**
 * Agent Hub - Entry point
 *
 * Routes to CLI commands or starts MCP server.
 */

import { runServer } from "./server/index.js";
import { agentExists, getMemoryDbPath } from "./agent/index.js";

// Parse command line arguments
const args = process.argv.slice(2);

// CLI commands that should be routed to cli/index.ts
const CLI_COMMANDS = [
  "create", "agents", "list", "status", "hire", "delete", "remove"
];

// Check if first arg is a CLI command
const firstArg = args[0];
if (firstArg && CLI_COMMANDS.includes(firstArg)) {
  // Dynamically import and run CLI
  import("./cli/index.js");
} else {
  // MCP Server mode
  const showHelp = args.includes("--help") || args.includes("-h");
  const showVersion = args.includes("--version") || args.includes("-v");

  // Extract --agent and --project-dir flags
  let agentName: string | undefined;
  let projectDir: string | undefined;

  const agentIndex = args.indexOf("--agent");
  if (agentIndex !== -1 && args[agentIndex + 1]) {
    agentName = args[agentIndex + 1];
  }

  const projectDirIndex = args.indexOf("--project-dir");
  if (projectDirIndex !== -1 && args[projectDirIndex + 1]) {
    projectDir = args[projectDirIndex + 1];
  }

  if (showHelp) {
    console.log(`
Agent Hub - Agent configuration, deployment, and sharing center

Usage:
  npx agent-hub [options]
  npx agent-hub <command> [options]

Server Options:
  --help, -h          Show this help message
  --version, -v       Show version number
  --agent <name>      Use specified agent's config
  --project-dir <dir> Explicit project directory (default: auto-detected)

Commands:
  create <name>       Create a new agent
  list                List all agents
  hire <name>         Deploy agent to current project
  status              Show agent status
  delete <name>       Delete an agent

For more information, see: https://github.com/anthropics/agent-hub
`);
    process.exit(0);
  }

  if (showVersion) {
    console.log("0.1.0");
    process.exit(0);
  }

  // Validate agent if specified
  if (agentName) {
    if (!agentExists(agentName)) {
      console.error(`Error: Agent "${agentName}" not found.`);
      console.error("");
      console.error("Create an agent with:");
      console.error(`  npx agent-hub create ${agentName}`);
      process.exit(1);
    }
  }

  // Run the server - always use project-level memory
  const serverOptions = agentName
    ? {
        config: {
          storage: {
            path: getMemoryDbPath(projectDir),
          },
        },
        agentName,
        projectDir,
      }
    : {
        config: {
          storage: {
            path: getMemoryDbPath(projectDir),
          },
        },
        projectDir,
      };

  runServer(serverOptions).catch((error) => {
    console.error("Failed to start Agent Hub server:", error);
    process.exit(1);
  });
}
