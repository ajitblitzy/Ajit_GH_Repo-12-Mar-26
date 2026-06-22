'use strict';

const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');

// Absolute path to the system under test (repo root server.js), resolved relative to this helper.
const SERVER_PATH = path.join(__dirname, '..', '..', 'server.js');
const STARTUP_LOG = 'Server running at http://127.0.0.1:3000/';

// ---------------------------------------------------------------------------
// In-process interception harness (used by server.test.js).
// Patches http.createServer to CAPTURE the server instance that server.js
// creates, BEFORE requiring server.js. Because require('http') and
// require('node:http') return the SAME object, patching here intercepts the
// server's bare require('http'). Yields real server.js coverage with no source edit.
// ---------------------------------------------------------------------------
function startServerInProcess() {
  return new Promise((resolve, reject) => {
    const originalCreateServer = http.createServer;
    let captured = null;
    http.createServer = function patchedCreateServer(...args) {
      captured = originalCreateServer.apply(this, args);
      return captured;
    };
    try {
      // Ensure a fresh execution of server.js (clear any cached instance).
      delete require.cache[require.resolve(SERVER_PATH)];
      require(SERVER_PATH); // self-executes: createServer(...) + listen(3000, '127.0.0.1')
    } catch (err) {
      http.createServer = originalCreateServer;
      return reject(err);
    }
    http.createServer = originalCreateServer; // restore immediately after capture
    if (!captured) return reject(new Error('Failed to capture server instance from server.js'));
    if (captured.listening) return resolve(captured);
    captured.once('listening', () => resolve(captured));
    captured.once('error', reject);
  });
}

function closeInProcess(server) {
  return new Promise((resolve) => {
    try {
      delete require.cache[require.resolve(SERVER_PATH)];
    } catch (_) { /* ignore */ }
    if (!server) return resolve();
    server.close(() => resolve());
  });
}

// ---------------------------------------------------------------------------
// Black-box child-process harness (used by lifecycle.test.js + load-test.js).
// Spawns `node server.js`, resolves only AFTER the exact startup log is seen.
// ---------------------------------------------------------------------------
function startServerProcess({ timeoutMs = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SERVER_PATH], { cwd: path.dirname(SERVER_PATH) });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill('SIGKILL'); } catch (_) { /* ignore */ }
      reject(new Error(`Server did not emit startup log within ${timeoutMs}ms. stderr: ${stderr}`));
    }, timeoutMs);

    child.stdout.on('data', (d) => {
      stdout += d.toString();
      if (!settled && stdout.includes(STARTUP_LOG)) {
        settled = true;
        clearTimeout(timer);
        resolve({ child, getStdout: () => stdout, getStderr: () => stderr });
      }
    });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Server exited before startup (code=${code}, signal=${signal}). stderr: ${stderr}`));
    });
  });
}

function stopServerProcess(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.signalCode !== null || child.killed) return resolve();
    const killTimer = setTimeout(() => { try { child.kill('SIGKILL'); } catch (_) { /* ignore */ } }, 2000);
    child.once('exit', () => { clearTimeout(killTimer); resolve(); });
    try { child.kill('SIGTERM'); } catch (_) { clearTimeout(killTimer); resolve(); }
  });
}

// Raw spawn (no wait for startup log) — used by the port-conflict negative test
// to observe a failing second instance's exit code + stderr.
function spawnServerRaw() {
  const child = spawn(process.execPath, [SERVER_PATH], { cwd: path.dirname(SERVER_PATH) });
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d.toString(); });
  const exited = new Promise((resolve) => {
    child.on('exit', (code, signal) => resolve({ code, signal, stderr }));
    child.on('error', () => resolve({ code: null, signal: null, stderr }));
  });
  return { child, exited: () => exited };
}

module.exports = {
  SERVER_PATH,
  STARTUP_LOG,
  startServerInProcess,
  closeInProcess,
  startServerProcess,
  stopServerProcess,
  spawnServerRaw,
};
