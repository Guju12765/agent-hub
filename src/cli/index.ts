#!/usr/bin/env node
/**
 * Agent Hub CLI — AI Development Kit
 */

import { listCommand } from "./commands/list.js";
import { createCommand } from "./commands/create.js";
import { addCommand } from "./commands/add.js";
import { removeCommand } from "./commands/remove.js";
import { deployCommand } from "./commands/deploy.js";
import { agentsCommand } from "./commands/agents.js";
import { infoCommand } from "./commands/info.js";

const HELP = `
Agent Hub — AI Development Kit

Usage:
  agent-hub <command> [options]

Commands:
  list                          Browse available assets and agents
  info <name>                   Show details about an asset or agent
  create <agent> [assets...]    Create agent from selected assets
  add <agent> [assets...]       Add assets to an existing agent
  remove <agent> [assets...]    Remove assets from an agent
  agents                        List your local agents
  deploy <agent>                Deploy agent to current project

Examples:
  agent-hub list
  agent-hub create my-agent debugging tdd coding-style senior-engineer
  agent-hub add my-agent qmd
  agent-hub deploy my-agent
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  if (args[0] === "--version" || args[0] === "-v") {
    console.log("0.2.0");
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  try {
    switch (command) {
      case "list":
        await listCommand(commandArgs);
        break;
      case "info":
        await infoCommand(commandArgs);
        break;
      case "create":
        await createCommand(commandArgs);
        break;
      case "add":
        await addCommand(commandArgs);
        break;
      case "remove":
        await removeCommand(commandArgs);
        break;
      case "agents":
        await agentsCommand(commandArgs);
        break;
      case "deploy":
        await deployCommand(commandArgs);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error("Run 'agent-hub --help' for usage.");
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

main();
