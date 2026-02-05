# Continuous Learning v2 Node.js Conversion Plan

> **STATUS: NOT IMPLEMENTED** - This plan describes a feature that was never built. The continuous-learning-v2 skill does not exist in the current codebase. This document is preserved for historical reference only.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert all bash/python scripts in continuous-learning-v2 to cross-platform Node.js for Windows compatibility.

**Architecture:** Replace observe.sh, start-observer.sh, and instinct-cli.py with Node.js equivalents. Update default.json hook commands to use .js files.

**Tech Stack:** Node.js (no external dependencies)

---

## Task 1: Create observe.js

**Files:**
- Create: `src/templates/skills/continuous-learning-v2/hooks/observe.js`
- Delete: `src/templates/skills/continuous-learning-v2/hooks/observe.sh`

**Step 1: Create observe.js**

```javascript
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
```

**Step 2: Delete observe.sh**

```bash
rm src/templates/skills/continuous-learning-v2/hooks/observe.sh
```

**Step 3: Commit**

```bash
git add src/templates/skills/continuous-learning-v2/hooks/
git commit -m "feat: convert observe.sh to cross-platform observe.js"
```

---

## Task 2: Create start-observer.js

**Files:**
- Create: `src/templates/skills/continuous-learning-v2/agents/start-observer.js`
- Delete: `src/templates/skills/continuous-learning-v2/agents/start-observer.sh`

**Step 1: Create start-observer.js**

```javascript
#!/usr/bin/env node
/**
 * Continuous Learning v2 - Observer Agent Launcher
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Starts the background observer agent that analyzes observations
 * and creates instincts. Uses Haiku model for cost efficiency.
 *
 * Usage:
 *   node start-observer.js        # Start observer in background
 *   node start-observer.js stop   # Stop running observer
 *   node start-observer.js status # Check if observer is running
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');

const CONFIG_DIR = path.join(os.homedir(), '.claude', 'homunculus');
const PID_FILE = path.join(CONFIG_DIR, '.observer.pid');
const LOG_FILE = path.join(CONFIG_DIR, 'observer.log');
const OBSERVATIONS_FILE = path.join(CONFIG_DIR, 'observations.jsonl');
const INSTINCTS_DIR = path.join(CONFIG_DIR, 'instincts', 'personal');

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_OBSERVATIONS = 10;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return false;
  }
}

function getObservationCount() {
  if (!fs.existsSync(OBSERVATIONS_FILE)) return 0;
  try {
    const content = fs.readFileSync(OBSERVATIONS_FILE, 'utf-8');
    return content.trim().split('\n').filter(Boolean).length;
  } catch {
    return 0;
  }
}

function archiveObservations() {
  if (!fs.existsSync(OBSERVATIONS_FILE)) return;

  const archiveDir = path.join(CONFIG_DIR, 'observations.archive');
  ensureDir(archiveDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const archivePath = path.join(archiveDir, `processed-${timestamp}.jsonl`);

  fs.renameSync(OBSERVATIONS_FILE, archivePath);
  fs.writeFileSync(OBSERVATIONS_FILE, '');
}

async function analyzeObservations() {
  const obsCount = getObservationCount();
  if (obsCount < MIN_OBSERVATIONS) {
    return;
  }

  log(`Analyzing ${obsCount} observations...`);

  // Check if claude CLI is available
  return new Promise((resolve) => {
    const prompt = `Read ${OBSERVATIONS_FILE} and identify patterns. If you find 3+ occurrences of the same pattern, create an instinct file in ${INSTINCTS_DIR} following the YAML format with fields: id, trigger, confidence, domain, source. Be conservative - only create instincts for clear patterns.`;

    exec(`claude --model haiku --max-turns 3 --print "${prompt}"`, (error, stdout, stderr) => {
      if (error) {
        log(`Analysis error: ${error.message}`);
      } else {
        log(`Analysis complete`);
        if (stdout) log(`Output: ${stdout.slice(0, 500)}`);
      }

      // Archive processed observations
      archiveObservations();
      resolve();
    });
  });
}

// Command handlers
async function cmdStart() {
  ensureDir(CONFIG_DIR);
  ensureDir(INSTINCTS_DIR);

  // Check if already running
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim());
    if (isProcessRunning(pid)) {
      console.log(`Observer already running (PID: ${pid})`);
      return;
    }
    fs.unlinkSync(PID_FILE);
  }

  console.log('Starting observer agent...');

  // Spawn detached background process
  const child = spawn(process.execPath, [__filename, '__daemon__'], {
    detached: true,
    stdio: 'ignore',
    cwd: CONFIG_DIR
  });

  child.unref();

  // Wait for PID file
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (fs.existsSync(PID_FILE)) {
    const pid = fs.readFileSync(PID_FILE, 'utf-8').trim();
    console.log(`Observer started (PID: ${pid})`);
    console.log(`Log: ${LOG_FILE}`);
  } else {
    console.log('Failed to start observer');
    process.exit(1);
  }
}

function cmdStop() {
  if (!fs.existsSync(PID_FILE)) {
    console.log('Observer not running.');
    return;
  }

  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim());

  if (isProcessRunning(pid)) {
    console.log(`Stopping observer (PID: ${pid})...`);
    try {
      process.kill(pid, 'SIGTERM');
      fs.unlinkSync(PID_FILE);
      console.log('Observer stopped.');
    } catch (err) {
      console.log(`Failed to stop: ${err.message}`);
    }
  } else {
    console.log('Observer not running (stale PID file).');
    fs.unlinkSync(PID_FILE);
  }
}

function cmdStatus() {
  if (!fs.existsSync(PID_FILE)) {
    console.log('Observer not running');
    process.exit(1);
  }

  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim());

  if (isProcessRunning(pid)) {
    console.log(`Observer is running (PID: ${pid})`);
    console.log(`Log: ${LOG_FILE}`);
    console.log(`Observations: ${getObservationCount()} lines`);
  } else {
    console.log('Observer not running (stale PID file)');
    fs.unlinkSync(PID_FILE);
    process.exit(1);
  }
}

async function runDaemon() {
  ensureDir(CONFIG_DIR);

  // Write PID file
  fs.writeFileSync(PID_FILE, String(process.pid));
  log(`Observer started (PID: ${process.pid})`);

  // Handle termination
  const cleanup = () => {
    try {
      if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    } catch {}
    process.exit(0);
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  // Main loop
  const loop = async () => {
    try {
      await analyzeObservations();
    } catch (err) {
      log(`Loop error: ${err.message}`);
    }
  };

  // Initial check
  await loop();

  // Poll every 5 minutes
  setInterval(loop, POLL_INTERVAL_MS);
}

// Main
const command = process.argv[2] || 'start';

switch (command) {
  case 'start':
    cmdStart();
    break;
  case 'stop':
    cmdStop();
    break;
  case 'status':
    cmdStatus();
    break;
  case '__daemon__':
    runDaemon();
    break;
  default:
    console.log('Usage: node start-observer.js {start|stop|status}');
    process.exit(1);
}
```

**Step 2: Delete start-observer.sh**

```bash
rm src/templates/skills/continuous-learning-v2/agents/start-observer.sh
```

**Step 3: Commit**

```bash
git add src/templates/skills/continuous-learning-v2/agents/
git commit -m "feat: convert start-observer.sh to cross-platform start-observer.js"
```

---

## Task 3: Create instinct-cli.js

**Files:**
- Create: `src/templates/skills/continuous-learning-v2/scripts/instinct-cli.js`
- Delete: `src/templates/skills/continuous-learning-v2/scripts/instinct-cli.py`

**Step 1: Create instinct-cli.js**

Create a Node.js version that implements:
- `status` - Show all instincts grouped by domain with confidence bars
- `import <source>` - Import from file or URL with --dry-run, --force, --min-confidence
- `export` - Export to file with --output, --domain, --min-confidence filters
- `evolve` - Analyze patterns and suggest skills/commands/agents

The file is large (~400 lines). Key functions:
- `parseInstinctFile(content)` - Parse YAML-like instinct format
- `loadAllInstincts()` - Load from personal and inherited dirs
- `cmdStatus()`, `cmdImport()`, `cmdExport()`, `cmdEvolve()`

**Step 2: Delete instinct-cli.py**

```bash
rm src/templates/skills/continuous-learning-v2/scripts/instinct-cli.py
```

**Step 3: Commit**

```bash
git add src/templates/skills/continuous-learning-v2/scripts/
git commit -m "feat: convert instinct-cli.py to cross-platform instinct-cli.js"
```

---

## Task 4: Update default.json Hook Commands

**Files:**
- Modify: `src/templates/hooks/default.json`

**Step 1: Update PreToolUse and PostToolUse commands**

Change from:
```json
"command": ".claude/skills/continuous-learning-v2/hooks/observe.sh pre"
```

To:
```json
"command": "node .claude/skills/continuous-learning-v2/hooks/observe.js"
```

Note: The `pre`/`post` argument is no longer needed - the hook type comes from stdin JSON.

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/templates/hooks/default.json
git commit -m "feat: update hooks to use cross-platform observe.js"
```

---

## Task 5: Test Full Flow

**Step 1: Build**

```bash
npm run build
```

**Step 2: Create test agent**

```bash
echo "yes" | npx agent-hub delete test-cl-agent 2>/dev/null; true
npx agent-hub create test-cl-agent
```

**Step 3: Verify Node.js files in master**

```bash
ls ~/.agent-hub/agents/test-cl-agent/skills/continuous-learning-v2/hooks/
# Expected: observe.js (no .sh)

ls ~/.agent-hub/agents/test-cl-agent/skills/continuous-learning-v2/agents/
# Expected: observer.md, start-observer.js (no .sh)

ls ~/.agent-hub/agents/test-cl-agent/skills/continuous-learning-v2/scripts/
# Expected: instinct-cli.js (no .py)
```

**Step 4: Test observe.js**

```bash
echo '{"hook_type":"PreToolUse","tool_name":"Read","tool_input":{"file":"/test.txt"},"session_id":"test123"}' | node ~/.agent-hub/agents/test-cl-agent/skills/continuous-learning-v2/hooks/observe.js
cat ~/.claude/homunculus/observations.jsonl
# Expected: JSON line with tool_start event
```

**Step 5: Test start-observer.js**

```bash
node ~/.agent-hub/agents/test-cl-agent/skills/continuous-learning-v2/agents/start-observer.js status
# Expected: "Observer not running"
```

**Step 6: Test instinct-cli.js**

```bash
node ~/.agent-hub/agents/test-cl-agent/skills/continuous-learning-v2/scripts/instinct-cli.js status
# Expected: "No instincts found" with directory paths
```

**Step 7: Clean up**

```bash
echo "yes" | npx agent-hub delete test-cl-agent
rm -f ~/.claude/homunculus/observations.jsonl
```

---

## Summary

After completion:
- `observe.sh` → `observe.js` (cross-platform hook)
- `start-observer.sh` → `start-observer.js` (cross-platform daemon)
- `instinct-cli.py` → `instinct-cli.js` (cross-platform CLI)
- `default.json` updated with new hook commands
- All scripts work on Windows, macOS, and Linux
- No external dependencies (pure Node.js)
