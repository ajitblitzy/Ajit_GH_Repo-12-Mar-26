/**
 * Shared Test Lifecycle Utility Module
 *
 * Foundational helper used by ALL test files (unit, integration, negative,
 * performance, security) to manage server process lifecycle and provide a
 * single source of truth for expected response values derived from server.js.
 *
 * Design Decisions:
 * - Uses black-box process testing pattern because server.js has no
 *   module.exports — we spawn it as a child process, send HTTP requests,
 *   and assert on responses.
 * - All expected values are constants defined here so that if server.js
 *   changes, only this file needs updating.
 * - Only Node.js built-in modules are used — zero external dependencies.
 */

'use strict';

const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Expected Value Constants — Single Source of Truth
// Each constant is derived from a specific line in server.js
// ---------------------------------------------------------------------------

/** From server.js line 3: const hostname = '127.0.0.1'; */
const DEFAULT_HOSTNAME = '127.0.0.1';

/** From server.js line 4: const port = 3000; */
const DEFAULT_PORT = 3000;

/** From server.js line 7: res.statusCode = 200; */
const EXPECTED_STATUS = 200;

/** From server.js line 8: res.setHeader('Content-Type', 'text/plain'); */
const EXPECTED_CONTENT_TYPE = 'text/plain';

/** From server.js line 9: res.end('Hello, World!\n'); */
const EXPECTED_BODY = 'Hello, World!\n';

/**
 * From server.js line 13:
 *   console.log(`Server running at http://${hostname}:${port}/`);
 * Resolved template literal output with hostname=127.0.0.1, port=3000.
 */
const EXPECTED_LOG_MESSAGE = 'Server running at http://127.0.0.1:3000/';

// ---------------------------------------------------------------------------
// Timeout Configuration
// ---------------------------------------------------------------------------

/** Maximum time in ms to wait for the server to emit its startup log message */
const READY_TIMEOUT_MS = 5000;

/** Maximum time in ms to wait for a graceful shutdown before sending SIGKILL */
const FORCE_KILL_TIMEOUT_MS = 3000;

/** Maximum time in ms for an individual HTTP request to complete */
const REQUEST_TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------------
// Server Lifecycle Functions
// ---------------------------------------------------------------------------

/**
 * Spawns server.js as a child process.
 *
 * @param {number} [port=DEFAULT_PORT] - Port number for test coordination.
 *   NOTE: server.js currently uses a hardcoded port (3000) and ignores
 *   environment variables. This parameter is accepted for documentation
 *   purposes, future-proofing, and is passed as a PORT env var in case
 *   server.js is later updated to read from the environment.
 * @returns {import('node:child_process').ChildProcess} The spawned child process.
 */
const spawnServer = (port = DEFAULT_PORT) => {
  const serverPath = path.resolve(__dirname, '../../server.js');
  const env = { ...process.env };

  // Pass port as an environment variable for future-proofing
  if (port !== DEFAULT_PORT) {
    env.PORT = String(port);
  }

  const child = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env
  });

  return child;
};

/**
 * Waits for the server process to emit its startup readiness log message on
 * stdout. Resolves when the EXPECTED_LOG_MESSAGE is detected, or rejects if
 * the server fails to start within READY_TIMEOUT_MS, encounters a spawn
 * error, or the process exits prematurely.
 *
 * @param {import('node:child_process').ChildProcess} serverProcess - The child
 *   process returned by spawnServer().
 * @returns {Promise<string>} Resolves with the accumulated stdout output once
 *   the server is ready.
 */
const waitForReady = (serverProcess) => {
  return new Promise((resolve, reject) => {
    if (!serverProcess) {
      reject(new Error('waitForReady: serverProcess is null or undefined'));
      return;
    }

    let stdout = '';
    let stderr = '';
    let settled = false;

    const settle = (fn, value) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutHandle);
        fn(value);
      }
    };

    const timeoutHandle = setTimeout(() => {
      settle(reject, new Error(
        `Server failed to start within ${READY_TIMEOUT_MS}ms. ` +
        `stdout so far: "${stdout.trim()}" | stderr so far: "${stderr.trim()}"`
      ));
    }, READY_TIMEOUT_MS);

    serverProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      if (stdout.includes(EXPECTED_LOG_MESSAGE)) {
        settle(resolve, stdout);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    serverProcess.on('error', (err) => {
      settle(reject, err);
    });

    serverProcess.on('close', (code) => {
      if (!stdout.includes(EXPECTED_LOG_MESSAGE)) {
        settle(reject, new Error(
          `Server process exited with code ${code} before ready. ` +
          `stdout: "${stdout.trim()}" | stderr: "${stderr.trim()}"`
        ));
      }
    });
  });
};

/**
 * Gracefully stops a server child process. Sends SIGTERM first, then falls
 * back to SIGKILL if the process has not exited within FORCE_KILL_TIMEOUT_MS.
 *
 * Handles defensive cases:
 * - serverProcess is null/undefined → resolves immediately
 * - Process is already killed → resolves immediately
 * - SIGTERM fails (process already dead) → resolves immediately
 *
 * @param {import('node:child_process').ChildProcess | null | undefined} serverProcess
 *   The child process to stop.
 * @returns {Promise<void>} Resolves once the process has exited.
 */
const stopServer = (serverProcess) => {
  return new Promise((resolve) => {
    // Defensive: handle null, undefined, or already-killed process
    if (!serverProcess || serverProcess.killed) {
      resolve();
      return;
    }

    let resolved = false;

    const done = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(forceKillHandle);
        resolve();
      }
    };

    // Safety net: force-kill if graceful shutdown exceeds timeout
    const forceKillHandle = setTimeout(() => {
      try {
        serverProcess.kill('SIGKILL');
      } catch (_err) {
        // Process may already be dead — ignore
      }
    }, FORCE_KILL_TIMEOUT_MS);

    serverProcess.on('close', done);

    // Also handle the 'exit' event for extra safety
    serverProcess.on('exit', done);

    try {
      serverProcess.kill('SIGTERM');
    } catch (_err) {
      // Process already dead — clean up and resolve
      done();
    }
  });
};

/**
 * Sends an HTTP request to the server and returns the response.
 *
 * @param {Object} [options={}] - Request options compatible with
 *   http.request(). Unrecognised properties are forwarded to the underlying
 *   http.request call.
 * @param {string}  [options.hostname=DEFAULT_HOSTNAME] - Target hostname.
 * @param {number}  [options.port=DEFAULT_PORT]         - Target port.
 * @param {string}  [options.path='/']                  - URL path.
 * @param {string}  [options.method='GET']              - HTTP method.
 * @param {Object}  [options.headers={}]                - Request headers.
 * @param {string}  [options.body]                      - Optional request body
 *   to write before ending the request.
 * @returns {Promise<{ statusCode: number, headers: Object, body: string }>}
 *   Resolves with the response status code, headers, and body string.
 */
const makeRequest = (options = {}) => {
  return new Promise((resolve, reject) => {
    // Destructure 'body' out so it is not forwarded to http.request (which
    // does not recognise it and would silently ignore it).
    const { body: requestBody, ...rest } = options;

    const opts = {
      hostname: DEFAULT_HOSTNAME,
      port: DEFAULT_PORT,
      path: '/',
      method: 'GET',
      headers: {},
      ...rest
    };

    const req = http.request(opts, (res) => {
      let body = '';

      res.setEncoding('utf8');

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });

      res.on('error', (err) => {
        reject(err);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`HTTP request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });

    // Write request body if provided
    if (requestBody !== undefined && requestBody !== null) {
      req.write(requestBody);
    }

    req.end();
  });
};

// ---------------------------------------------------------------------------
// Module Exports — All 4 functions and all 6 constants
// ---------------------------------------------------------------------------

module.exports = {
  spawnServer,
  waitForReady,
  stopServer,
  makeRequest,
  EXPECTED_STATUS,
  EXPECTED_CONTENT_TYPE,
  EXPECTED_BODY,
  EXPECTED_LOG_MESSAGE,
  DEFAULT_HOSTNAME,
  DEFAULT_PORT
};
