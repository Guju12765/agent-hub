#!/usr/bin/env node
/**
 * Continuous Learning v2 - Observation Hook
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Captures tool use events for pattern analysis.
 * Claude Code passes hook data via stdin as JSON.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.claude', 'homunculus');
const OBSERVATIONS_FILE = path.join(CONFIG_DIR, 'observations.jsonl');
const MAX_FILE_SIZE_MB = 10;
const MAX_FIELD_LENGTH = 5000;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getTimestamp() {
  return new Date().toISOString();
}

function truncate(str, maxLen) {
  if (!str) return str;
  const s = typeof str === 'string' ? str : JSON.stringify(str);
  return s.length > maxLen ? s.slice(0, maxLen) + '...' : s;
}

function archiveIfNeeded() {
  if (!fs.existsSync(OBSERVATIONS_FILE)) return;

  try {
    const stats = fs.statSync(OBSERVATIONS_FILE);
    const sizeMB = stats.size / (1024 * 1024);

    if (sizeMB >= MAX_FILE_SIZE_MB) {
      const archiveDir = path.join(CONFIG_DIR, 'observations.archive');
      ensureDir(archiveDir);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const archivePath = path.join(archiveDir, `observations-${timestamp}.jsonl`);
      fs.renameSync(OBSERVATIONS_FILE, archivePath);
    }
  } catch (err) {
    // Ignore archive errors
  }
}

async function main() {
  ensureDir(CONFIG_DIR);

  // Check if disabled
  const disabledFile = path.join(CONFIG_DIR, 'disabled');
  if (fs.existsSync(disabledFile)) {
    process.exit(0);
  }

  // Read JSON from stdin
  let inputJson = '';
  for await (const chunk of process.stdin) {
    inputJson += chunk;
  }

  if (!inputJson.trim()) {
    process.exit(0);
  }

  let data;
  try {
    data = JSON.parse(inputJson);
  } catch (err) {
    // Log parse error
    const observation = {
      timestamp: getTimestamp(),
      event: 'parse_error',
      raw: truncate(inputJson, 1000)
    };
    fs.appendFileSync(OBSERVATIONS_FILE, JSON.stringify(observation) + '\n');
    process.exit(0);
  }

  // Extract fields - Claude Code hook format
  const hookType = data.hook_type || 'unknown';
  const toolName = data.tool_name || data.tool || 'unknown';
  const toolInput = data.tool_input || data.input || {};
  const toolOutput = data.tool_output || data.output || '';
  const sessionId = data.session_id || 'unknown';

  // Determine event type
  const event = hookType.includes('Pre') ? 'tool_start' : 'tool_complete';

  // Build observation
  const observation = {
    timestamp: getTimestamp(),
    event,
    tool: toolName,
    session: sessionId
  };

  if (event === 'tool_start') {
    observation.input = truncate(toolInput, MAX_FIELD_LENGTH);
  } else {
    observation.output = truncate(toolOutput, MAX_FIELD_LENGTH);
  }

  // Archive if needed
  archiveIfNeeded();

  // Write observation
  fs.appendFileSync(OBSERVATIONS_FILE, JSON.stringify(observation) + '\n');

  process.exit(0);
}

main().catch(err => {
  console.error('[observe] Error:', err.message);
  process.exit(0); // Don't block on errors
});
