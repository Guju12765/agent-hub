/**
 * Delete command - Permanently delete an agent
 */

import { parseArgs } from "node:util";
import { createInterface } from "node:readline";
import { deleteAgent, getAgentInfo } from "../../agent/index.js";

export async function deleteCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      force: { type: "boolean", short: "f" },
    },
    allowPositionals: true,
  });

  const name = positionals[0];

  if (!name) {
    console.error("Usage: npx agent-hub delete <name> [--force]");
    process.exit(1);
  }

  const info = getAgentInfo(name);
  if (!info) {
    console.error(`Agent not found: ${name}`);
    process.exit(1);
  }

  // Confirm unless --force
  if (!values.force) {
    console.log(`About to delete agent: ${name}`);
    console.log("");

    const confirmed = await confirm(`Delete ${name} permanently? (yes/no): `);
    if (!confirmed) {
      console.log("Cancelled.");
      return;
    }
  }

  deleteAgent(name);
  console.log(`Deleted agent: ${name}`);
}

function confirm(prompt: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
    });
  });
}
