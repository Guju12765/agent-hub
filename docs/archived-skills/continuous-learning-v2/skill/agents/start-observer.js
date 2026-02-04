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
const WATCH_DEBOUNCE_MS = 10 * 1000; // 10 seconds

// Debounce utility for file watcher
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

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

    // Escape prompt for shell
    const escapedPrompt = prompt.replace(/"/g, '\\"');

    exec(`claude --model haiku --max-turns 3 --print "${escapedPrompt}"`, (error, stdout, stderr) => {
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

  // Watch for new observations (cross-platform alternative to Unix signals)
  // Debounce to avoid excessive triggers during rapid tool use
  const debouncedAnalyze = debounce(async () => {
    try {
      await analyzeObservations();
    } catch (err) {
      log(`Watch trigger error: ${err.message}`);
    }
  }, WATCH_DEBOUNCE_MS);

  // Start file watcher
  const startWatcher = () => {
    if (fs.existsSync(OBSERVATIONS_FILE)) {
      try {
        const watcher = fs.watch(OBSERVATIONS_FILE, (eventType) => {
          if (eventType === 'change') {
            debouncedAnalyze();
          }
        });
        watcher.on('error', (err) => {
          log(`Watcher error: ${err.message}`);
        });
        log('File watcher started');
      } catch (err) {
        log(`Failed to start watcher: ${err.message}`);
      }
    } else {
      log('Observations file not found, watcher will use polling only');
    }
  };

  startWatcher();

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
