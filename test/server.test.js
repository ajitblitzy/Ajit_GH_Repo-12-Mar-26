'use strict';

// Black-box + in-process contract test suite for the refactored zero-dependency
// HTTP server (../server.js). Uses ONLY Node.js built-in modules and CommonJS.
//
// It proves the refactor preserves the externally observable behavior exactly
// (tech-spec Section 6.6 cases T-001..T-008). Run via `node --test` (npm test).

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

// The refactored server exports its surface and guards `listen` behind
// `require.main === module`, so importing here MUST NOT bind any port.
const { server, requestHandler } = require('../server.js');

// ---------------------------------------------------------------------------
// Frozen contract "oracle" (empirically captured on Node v22.22.2).
// ---------------------------------------------------------------------------
const EXPECTED_BODY = 'Hello, World!\n';
const EXPECTED_BYTE_LENGTH = 14;
const EXPECTED_CONTENT_TYPE = 'text/plain';
const EXPECTED_CONTENT_LENGTH = '14'; // HTTP header values are strings
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3000;
const STARTUP_LOG = `Server running at http://${DEFAULT_HOST}:${DEFAULT_PORT}/`;
const STARTUP_LOG_RE = /Server running at http:\/\/127\.0\.0\.1:3000\//;

const SERVER_PATH = path.join(__dirname, '..', 'server.js');

// ---------------------------------------------------------------------------
// Helpers (all built on Node core).
// ---------------------------------------------------------------------------

// Promisified HTTP client. `agent: false` => the client closes its socket after
// each response, so server.close() resolves promptly (no keep-alive lingering).
function httpRequest({ method = 'GET', host = DEFAULT_HOST, port, path: reqPath = '/' }, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.request({ method, host, port, path: reqPath, agent: false }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }));
    });
    req.on('error', reject);
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

// Reserve a free port by briefly binding then releasing a throwaway listener.
function reservePort(host = DEFAULT_HOST) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, host, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// Compare header maps ignoring the volatile Date header.
function headersSansDate(headers) {
  const copy = { ...headers };
  delete copy.date;
  return copy;
}

// Assert the full preserved response contract on a parsed response.
function assertContract(res) {
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], EXPECTED_CONTENT_TYPE);
  assert.equal(res.headers['content-length'], EXPECTED_CONTENT_LENGTH);
  assert.equal(res.body.toString('utf8'), EXPECTED_BODY);
  assert.equal(res.body.length, EXPECTED_BYTE_LENGTH);
}

// Promisified keep-alive HTTP client. Unlike `httpRequest` (which forces
// `agent: false`, so the client requests `Connection: close` and the response
// therefore carries `connection: close`), this uses a dedicated keep-alive agent
// so the client sends `Connection: keep-alive`. That is what makes the server's
// preserved keep-alive headers OBSERVABLE on the parsed response. The agent is
// destroyed in a `.finally` so no pooled socket lingers — preserving the prompt
// `server.close()` teardown that `agent: false` otherwise guarantees.
function httpRequestKeepAlive({ method = 'GET', host = DEFAULT_HOST, port, path: reqPath = '/' }, timeoutMs = 5000) {
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
  return new Promise((resolve, reject) => {
    const req = http.request({ method, host, port, path: reqPath, agent }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`HTTP request timed out after ${timeoutMs}ms`)));
    req.end();
  }).finally(() => agent.destroy());
}

// Assert the preserved keep-alive header oracle on a response obtained via the
// keep-alive client above. Values come from the parsed `res.headers` map (never
// raw header byte order): the server emits `Connection: keep-alive` and
// `Keep-Alive: timeout=5` (the default keepAliveTimeout of 5000ms), and because
// an explicit `Content-Length` is sent there is NO `Transfer-Encoding: chunked`.
function assertKeepAliveOracle(headers) {
  assert.equal(headers['connection'], 'keep-alive');
  assert.equal(headers['keep-alive'], 'timeout=5');
  assert.equal(headers['transfer-encoding'], undefined);
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
// Sanity: importing the module exposed the surface WITHOUT binding a port.
// (If the require.main guard were missing, importing would have started a
// listener; the suite relies on this guarantee.)
// ---------------------------------------------------------------------------
test('module exports { server, requestHandler } and import does not listen', () => {
  assert.equal(typeof requestHandler, 'function');
  assert.ok(server instanceof http.Server);
  assert.equal(server.listening, false);
});

// ---------------------------------------------------------------------------
// In-process contract tests (T-001..T-005) against the exported `server`
// bound to an ephemeral port (listen(0)) — no fixed-port contention.
// ---------------------------------------------------------------------------
describe('in-process response contract (T-001..T-005)', () => {
  let port;

  before(async () => {
    const address = await listen(server, 0, DEFAULT_HOST);
    port = address.port;
  });

  after(async () => {
    await close(server);
  });

  test('T-001: GET / responds with status 200', async () => {
    const res = await httpRequest({ method: 'GET', port, path: '/' });
    assert.equal(res.statusCode, 200);
  });

  test('T-002: Content-Type is text/plain', async () => {
    const res = await httpRequest({ method: 'GET', port, path: '/' });
    assert.equal(res.headers['content-type'], EXPECTED_CONTENT_TYPE);
  });

  test('T-003: body equals exactly "Hello, World!\\n"', async () => {
    const res = await httpRequest({ method: 'GET', port, path: '/' });
    assert.equal(res.body.toString('utf8'), EXPECTED_BODY);
    assert.equal(res.body.length, EXPECTED_BYTE_LENGTH);
  });

  test('T-004: Content-Length is 14', async () => {
    const res = await httpRequest({ method: 'GET', port, path: '/' });
    assert.equal(res.headers['content-length'], EXPECTED_CONTENT_LENGTH);
  });

  test('T-005: route-agnostic — identical status/headers/body across methods & paths', async () => {
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

  test('T-005b: keep-alive header oracle — Connection: keep-alive, Keep-Alive: timeout=5, no chunked', async () => {
    // The shared `httpRequest` forces `agent: false`, so its responses carry
    // `connection: close` and cannot prove the keep-alive part of the contract.
    // Issue a keep-alive request so the server's preserved keep-alive headers are
    // observable, then assert both the core contract and the keep-alive oracle.
    const res = await httpRequestKeepAlive({ method: 'GET', port, path: '/' });
    assertContract(res);
    assertKeepAliveOracle(res.headers);
  });
});

// ---------------------------------------------------------------------------
// Black-box default startup (T-006, T-007): a real `node server.js` process
// on the default 127.0.0.1:3000.
// ---------------------------------------------------------------------------
describe('black-box default startup (T-006, T-007)', () => {
  let proc;

  before(async () => {
    proc = spawnServer(); // defaults: 127.0.0.1:3000, single process
    // Wait for readiness via a TCP probe (log-independent) so the startup-log
    // assertion below remains the sole responsibility of T-006.
    await waitForPort(DEFAULT_PORT, DEFAULT_HOST, 10000);
  }, { timeout: 15000 });

  after(async () => {
    if (proc) await proc.kill();
  });

  test('T-006: prints exactly the single default startup log line to stdout', async () => {
    // The log is emitted from the listen callback; allow for pipe-delivery latency.
    await proc.stdout.wait(STARTUP_LOG_RE, 5000);
    // Prove the EXACT single startup line: normalize stdout into non-empty,
    // trimmed lines and require it to equal exactly [STARTUP_LOG]. Substring
    // matching alone would still pass on duplicate startup lines, prefixes/
    // suffixes, or any additional stdout containing the expected text; exact
    // single-line equality fails on all of those regressions.
    const lines = proc.stdout.text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    assert.deepEqual(
      lines,
      [STARTUP_LOG],
      `stdout must be exactly one line equal to "${STARTUP_LOG}"; got: ${JSON.stringify(proc.stdout.text)}`,
    );
    // A successful default startup writes nothing to stderr.
    assert.equal(
      proc.stderr.text.trim(),
      '',
      `stderr should be empty on successful startup; got: ${JSON.stringify(proc.stderr.text)}`,
    );
  });

  test('T-007: default bind is reachable on 127.0.0.1:3000 with the full contract', async () => {
    const res = await httpRequest({ method: 'GET', host: DEFAULT_HOST, port: DEFAULT_PORT, path: '/' });
    assertContract(res);
    // Complete the header oracle on the default bind: the `agent: false` request
    // above yields `connection: close`, so issue a keep-alive request to assert
    // the preserved Connection/Keep-Alive headers and the absence of chunked TE.
    const ka = await httpRequestKeepAlive({ method: 'GET', host: DEFAULT_HOST, port: DEFAULT_PORT, path: '/' });
    assertContract(ka);
    assertKeepAliveOracle(ka.headers);
  });
});

// ---------------------------------------------------------------------------
// Port-conflict handling (T-008): when the configured port is already in use,
// the server's 'error' handler reports EADDRINUSE gracefully (to stderr) and
// the process does not hang.
// ---------------------------------------------------------------------------
test('T-008: port-conflict (EADDRINUSE) is handled gracefully, no hang', { timeout: 15000 }, async () => {
  // Occupy a free port with a throwaway listener.
  const occupier = http.createServer((_req, res) => res.end());
  const busyPort = await reservePort(DEFAULT_HOST);
  await listen(occupier, busyPort, DEFAULT_HOST);

  const proc = spawnServer({ PORT: String(busyPort), HOST: DEFAULT_HOST });
  try {
    // The server's error handler logs "Server error: ... EADDRINUSE ...".
    await proc.stderr.wait(/EADDRINUSE/i, 10000);
    assert.match(proc.stderr.text, /EADDRINUSE/i);
    assert.match(proc.stderr.text, /Server error:/);
    // It must NOT have printed the success startup banner.
    assert.ok(!proc.stdout.text.includes(STARTUP_LOG), 'must not print startup log on bind failure');

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
