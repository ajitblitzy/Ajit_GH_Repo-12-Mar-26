'use strict';

// Black-box + in-process contract test suite for the refactored zero-dependency
// HTTP server (../server.js). Uses ONLY Node.js built-in modules and CommonJS.
//
// It proves the refactor preserves the externally observable behavior exactly
// (tech-spec Section 6.6 cases T-001..T-008). Run via `node --test` (npm test).
//
// API-compatibility note: this suite intentionally uses ONLY the top-level
// `test()` API from `node:test` (available since Node 18.0.0). The suite/hook
// helpers `describe`/`before`/`after` were added later in the 18.x line
// (`describe`/`it` in v18.6.0, `before`/`after` in v18.8.0), so they are avoided
// to stay compatible with the entire `engines.node: ">=18"` range declared in
// package.json. Shared setup/teardown is expressed with explicit try/finally
// (see `withListeningServer` and the per-test spawn/kill blocks below).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

// The refactored server exports its surface and guards `listen` behind
// `require.main === module`, so importing here MUST NOT bind any port. The full
// module object is captured so the sanity test can assert the EXACT export set.
const serverModule = require('../server.js');
const { server, requestHandler } = serverModule;

// ---------------------------------------------------------------------------
// Frozen contract "oracle" (empirically captured; Node also auto-adds
// `Connection: keep-alive` + `Keep-Alive: timeout=5` and never uses chunked
// transfer encoding for this fixed-length body).
// ---------------------------------------------------------------------------
const EXPECTED_BODY = 'Hello, World!\n';
const EXPECTED_BYTE_LENGTH = 14;
const EXPECTED_CONTENT_TYPE = 'text/plain';
const EXPECTED_CONTENT_LENGTH = '14'; // HTTP header values are strings
const EXPECTED_CONNECTION = 'keep-alive';
const EXPECTED_KEEP_ALIVE = 'timeout=5';
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3000;
const STARTUP_LOG = `Server running at http://${DEFAULT_HOST}:${DEFAULT_PORT}/`;
const STARTUP_LOG_RE = /Server running at http:\/\/127\.0\.0\.1:3000\//;
// Matches ANY startup banner regardless of the configured host/port. Used by the
// failure-path test to prove no "listening" banner is printed on a bind failure.
const STARTUP_BANNER_RE = /Server running at http:\/\//;

const SERVER_PATH = path.join(__dirname, '..', 'server.js');

// ---------------------------------------------------------------------------
// Helpers (all built on Node core).
// ---------------------------------------------------------------------------

// Promisified HTTP client.
//
// Connection mode is selectable so the suite can prove BOTH halves of the frozen
// oracle:
//   - Default (`keepAlive: false`) uses `agent: false`, so the client closes its
//     socket after each response. This keeps in-process `server.close()` prompt
//     (no pooled keep-alive socket lingering until the keep-alive timeout).
//   - `keepAlive: true` uses a dedicated keep-alive Agent so the server emits its
//     default `Connection: keep-alive` / `Keep-Alive: timeout=5` headers. The
//     Agent is destroyed once the response completes (or errors) so no pooled
//     socket lingers to hang teardown.
function httpRequest({ method = 'GET', host = DEFAULT_HOST, port, path: reqPath = '/', keepAlive = false }, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const agent = keepAlive ? new http.Agent({ keepAlive: true, maxSockets: 1 }) : false;
    const cleanup = () => { if (agent) agent.destroy(); };
    const req = http.request({ method, host, port, path: reqPath, agent }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        cleanup();
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });
    req.on('error', (err) => { cleanup(); reject(err); });
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`HTTP request timed out after ${timeoutMs}ms`)));
    req.end();
  });
}

function listen(srv, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (err) => { srv.removeListener('listening', onListening); reject(err); };
    const onListening = () => { srv.removeListener('error', onError); resolve(srv.address()); };
    srv.once('error', onError);
    srv.once('listening', onListening);
    srv.listen(port, host);
  });
}

function close(srv) {
  return new Promise((resolve) => (srv && srv.listening ? srv.close(() => resolve()) : resolve()));
}

// Run `fn(port)` with the exported `server` bound to an ephemeral port (listen(0),
// no fixed-port contention), guaranteeing the server is closed afterward. This
// replaces the former describe/before/after grouping with explicit try/finally
// setup/teardown so the suite uses only the Node 18.0.0 top-level `test()` API.
async function withListeningServer(fn) {
  const address = await listen(server, 0, DEFAULT_HOST);
  try {
    await fn(address.port);
  } finally {
    await close(server);
  }
}

// Poll TCP connectivity until the server accepts connections (readiness probe),
// independent of any log output. Used so startup-log assertions stay isolated.
function waitForPort(port, host = DEFAULT_HOST, timeoutMs = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const sock = net.connect(port, host);
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => {
        sock.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Port ${host}:${port} not reachable within ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 100);
        }
      });
    };
    attempt();
  });
}

// Compare header maps ignoring the volatile Date header.
function headersSansDate(headers) {
  const copy = { ...headers };
  delete copy.date;
  return copy;
}

// Assert the universally-true portion of the preserved response contract on a
// parsed response (holds for both connection modes): status, content-type,
// content-length, the absence of chunked transfer encoding, and the body bytes.
function assertContract(res) {
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], EXPECTED_CONTENT_TYPE);
  assert.equal(res.headers['content-length'], EXPECTED_CONTENT_LENGTH);
  // The server always sends a fixed Content-Length and NEVER chunks this body.
  assert.equal(res.headers['transfer-encoding'], undefined);
  assert.equal(res.body.toString('utf8'), EXPECTED_BODY);
  assert.equal(res.body.length, EXPECTED_BYTE_LENGTH);
}

// Assert the keep-alive portion of the frozen oracle on a response obtained via a
// keep-alive client. These headers only appear for keep-alive connections, so
// they are asserted separately from `assertContract` (which holds for any client).
function assertKeepAliveHeaders(res) {
  assert.equal(res.headers.connection, EXPECTED_CONNECTION);
  assert.equal(res.headers['keep-alive'], EXPECTED_KEEP_ALIVE);
  assert.equal(res.headers['transfer-encoding'], undefined);
}

// Accumulate a child stream and allow awaiting a pattern with a timeout.
function streamWaiter(stream) {
  let buf = '';
  const waiters = [];
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buf += chunk;
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i].re.test(buf)) {
        clearTimeout(waiters[i].timer);
        waiters[i].resolve(buf);
        waiters.splice(i, 1);
      }
    }
  });
  return {
    get text() { return buf; },
    wait(re, timeoutMs = 8000) {
      if (re.test(buf)) return Promise.resolve(buf);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = waiters.findIndex((w) => w.timer === timer);
          if (idx >= 0) waiters.splice(idx, 1);
          reject(new Error(`Timed out after ${timeoutMs}ms waiting for ${re}. Captured: ${JSON.stringify(buf)}`));
        }, timeoutMs);
        waiters.push({ re, resolve, timer });
      });
    },
  };
}

// Spawn `node server.js`. By default strips PORT/HOST/WEB_CONCURRENCY so the
// child runs with the true defaults; `envOverrides` can re-add specific vars.
function spawnServer(envOverrides = {}) {
  const env = { ...process.env };
  delete env.PORT;
  delete env.HOST;
  delete env.WEB_CONCURRENCY;
  Object.assign(env, envOverrides);

  const child = spawn(process.execPath, [SERVER_PATH], {
    cwd: path.dirname(SERVER_PATH),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdout = streamWaiter(child.stdout);
  const stderr = streamWaiter(child.stderr);
  const exited = new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })));

  async function kill() {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
      const winner = await Promise.race([exited, new Promise((r) => setTimeout(() => r('timeout'), 2000))]);
      if (winner === 'timeout' && child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
        await exited;
      }
    }
  }

  return { child, stdout, stderr, exited, kill };
}

// ---------------------------------------------------------------------------
// Sanity: importing the module exposed EXACTLY the expected surface WITHOUT
// binding a port. (If the require.main guard were missing, importing would have
// started a listener; the suite relies on this guarantee.)
// ---------------------------------------------------------------------------
test('module exports exactly { server, requestHandler } and import does not listen', () => {
  // Exact export set — extra or renamed exports must fail this assertion.
  assert.deepEqual(Object.keys(serverModule).sort(), ['requestHandler', 'server']);
  assert.equal(typeof requestHandler, 'function');
  assert.ok(server instanceof http.Server);
  assert.equal(server.listening, false);
});

// ---------------------------------------------------------------------------
// In-process contract tests (T-001..T-005) against the exported `server`
// bound to an ephemeral port (listen(0)) — no fixed-port contention. Each test
// owns the server lifecycle via withListeningServer (try/finally teardown).
// ---------------------------------------------------------------------------
test('T-001: GET / responds with status 200', async () => {
  await withListeningServer(async (port) => {
    const res = await httpRequest({ method: 'GET', port, path: '/' });
    assert.equal(res.statusCode, 200);
  });
});

test('T-002: Content-Type is text/plain', async () => {
  await withListeningServer(async (port) => {
    const res = await httpRequest({ method: 'GET', port, path: '/' });
    assert.equal(res.headers['content-type'], EXPECTED_CONTENT_TYPE);
  });
});

test('T-003: body equals exactly "Hello, World!\\n"', async () => {
  await withListeningServer(async (port) => {
    const res = await httpRequest({ method: 'GET', port, path: '/' });
    assert.equal(res.body.toString('utf8'), EXPECTED_BODY);
    assert.equal(res.body.length, EXPECTED_BYTE_LENGTH);
  });
});

test('T-004: Content-Length is 14', async () => {
  await withListeningServer(async (port) => {
    const res = await httpRequest({ method: 'GET', port, path: '/' });
    assert.equal(res.headers['content-length'], EXPECTED_CONTENT_LENGTH);
  });
});

test('T-005: route-agnostic — identical status/headers/body across methods & paths', async () => {
  await withListeningServer(async (port) => {
    const baseline = await httpRequest({ method: 'GET', port, path: '/' });
    assertContract(baseline);

    const variants = [
      { method: 'POST', path: '/' },
      { method: 'PUT', path: '/anything/deep/path' },
      { method: 'DELETE', path: '/x?y=1&z=2' },
      { method: 'GET', path: '/some/other/route' },
      { method: 'HEAD', path: '/' },
    ];

    for (const v of variants) {
      const res = await httpRequest({ method: v.method, port, path: v.path });
      // HEAD legitimately carries no body, but status + headers must still match.
      assert.equal(res.statusCode, 200, `status for ${v.method} ${v.path}`);
      assert.equal(res.headers['content-type'], EXPECTED_CONTENT_TYPE, `content-type for ${v.method} ${v.path}`);
      assert.equal(res.headers['content-length'], EXPECTED_CONTENT_LENGTH, `content-length for ${v.method} ${v.path}`);
      assert.deepEqual(headersSansDate(res.headers), headersSansDate(baseline.headers), `headers (sans date) for ${v.method} ${v.path}`);
      if (v.method !== 'HEAD') {
        assert.equal(res.body.toString('utf8'), EXPECTED_BODY, `body for ${v.method} ${v.path}`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Black-box default startup (T-006, T-007): a real `node server.js` process on
// the default 127.0.0.1:3000. Each test spawns and kills its own child (in a
// try/finally) so they remain independent top-level tests; they run
// sequentially, so the fixed port 3000 is free for each.
// ---------------------------------------------------------------------------
test('T-006: prints exactly the default startup log line to stdout', { timeout: 15000 }, async () => {
  const proc = spawnServer(); // defaults: 127.0.0.1:3000, single process
  try {
    // Wait for readiness via a TCP probe (log-independent), then assert the log.
    await waitForPort(DEFAULT_PORT, DEFAULT_HOST, 10000);
    await proc.stdout.wait(STARTUP_LOG_RE, 5000);

    // Exact stdout: the ONLY non-empty line must equal the startup banner. This
    // rejects extra output, a missing banner, or the banner printed more than
    // once (tolerating a single trailing newline and either \n or \r\n).
    const lines = proc.stdout.text.split(/\r?\n/).filter((l) => l.length > 0);
    assert.deepEqual(
      lines,
      [STARTUP_LOG],
      `stdout must be exactly the startup banner; got: ${JSON.stringify(proc.stdout.text)}`,
    );

    // A successful startup writes nothing to stderr.
    assert.equal(
      proc.stderr.text,
      '',
      `successful startup must not write to stderr; got: ${JSON.stringify(proc.stderr.text)}`,
    );
  } finally {
    await proc.kill();
  }
});

test('T-007: default bind is reachable on 127.0.0.1:3000 with the full contract', { timeout: 15000 }, async () => {
  const proc = spawnServer(); // defaults: 127.0.0.1:3000, single process
  try {
    await waitForPort(DEFAULT_PORT, DEFAULT_HOST, 10000);
    // Use a keep-alive client so the server emits its default keep-alive headers,
    // letting us prove the FULL frozen oracle (status/type/length/body PLUS
    // Connection: keep-alive and Keep-Alive: timeout=5, and no chunked encoding).
    const res = await httpRequest({ method: 'GET', host: DEFAULT_HOST, port: DEFAULT_PORT, path: '/', keepAlive: true });
    assertContract(res);
    assertKeepAliveHeaders(res);
  } finally {
    await proc.kill();
  }
});

// ---------------------------------------------------------------------------
// Port-conflict handling (T-008): when the configured port is already in use,
// the server's 'error' handler reports EADDRINUSE gracefully (to stderr) and
// the process does not hang.
// ---------------------------------------------------------------------------
test('T-008: port-conflict (EADDRINUSE) is handled gracefully, no hang', { timeout: 15000 }, async () => {
  // Occupy an ephemeral port and keep it bound. Binding directly to port 0 and
  // reading the assigned port while the occupier remains listening avoids the
  // close-then-rebind TOCTOU window of a separate reservation step.
  const occupier = http.createServer((_req, res) => res.end());
  const { port: busyPort } = await listen(occupier, 0, DEFAULT_HOST);

  const proc = spawnServer({ PORT: String(busyPort), HOST: DEFAULT_HOST });
  try {
    // The server's error handler logs "Server error: ... EADDRINUSE ...".
    await proc.stderr.wait(/EADDRINUSE/i, 10000);
    assert.match(proc.stderr.text, /EADDRINUSE/i);
    assert.match(proc.stderr.text, /Server error:/);
    // It must NOT have printed ANY "listening" startup banner (for the configured
    // port or any other), since the bind failed.
    assert.ok(
      !STARTUP_BANNER_RE.test(proc.stdout.text),
      `must not print any startup banner on bind failure; got: ${JSON.stringify(proc.stdout.text)}`,
    );

    // No hang: the child exits on its own once listen fails.
    const result = await Promise.race([
      proc.exited,
      new Promise((r) => setTimeout(() => r('still-running'), 4000)),
    ]);
    assert.notEqual(result, 'still-running', 'child should exit (not hang) after EADDRINUSE');
  } finally {
    await proc.kill();
    await close(occupier);
  }
});
