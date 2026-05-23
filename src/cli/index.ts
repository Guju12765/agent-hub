#!/usr/bin/env node
/**
 * Agent Hub CLI - Manage agents and their memory
 *
 * Commands:
 *   create <name>      Create a new agent
 *   agents             List all agents
 *   status [name]      Show agent status
 *   hire <name>        Add agent to current project
 *   fire <name>        Remove agent from current project
 *   delete <name>      Delete an agent
 */

import { createCommand } from "./commands/create.js";
import { agentsCommand } from "./commands/agents.js";
import { statusCommand } from "./commands/status.js";
import { hireCommand } from "./commands/hire.js";
import { deleteCommand } from "./commands/delete.js";

const HELP = `
Agent Hub CLI - Agent configuration, deployment, and sharing center

Usage:
  npx agent-hub <command> [options]

Commands:
  create <name>         Create a new agent
    --specialty, -s     Agent specialty description

  agents                List all agents

  status [name]         Show agent status and memory stats

  hire <name>           Add agent to current project's config
    --global, -g        Add to global settings instead of project

  delete <name>         Permanently delete an agent and all memory
    --force, -f         Skip confirmation

Examples:
  npx agent-hub create alice-fullstack -s "Full-stack AI engineer"
  npx agent-hub agents
  npx agent-hub hire alice-fullstack
  npx agent-hub status alice-fullstack
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  if (args[0] === "--version" || args[0] === "-v") {
    console.log("0.1.0");
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  try {
    switch (command) {
      case "create":
        await createCommand(commandArgs);
        break;

      case "agents":
      case "list":
        await agentsCommand(commandArgs);
        break;

      case "status":
        await statusCommand(commandArgs);
        break;

      case "hire":
        await hireCommand(commandArgs);
        break;

      case "delete":
      case "remove":
        await deleteCommand(commandArgs);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error("Run 'npx agent-hub --help' for usage.");
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

main();
