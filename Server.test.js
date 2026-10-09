// Automated check for the service in Server.js: it starts the real process as a child and asserts
// the three responses a request can produce. Server.js exports nothing, so every assertion is made
// on the wire rather than against an imported function, and no dependency is added.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const net = require('node:net');

const SERVER_FILE = `${__dirname}/Server.js`;
const CONTENT_TYPE = 'text/plain; charset=utf-8';

// Bounds each wait so a wedged child fails the check instead of hanging it.
const STARTUP_TIMEOUT_MS = 10000;
const STOP_TIMEOUT_MS = 5000;
const REQUEST_TIMEOUT_MS = 10000;

// The fixed default port is never used: it would collide with an instance the developer already
// runs, and PORT=0 is outside the range the service accepts, so a free port is probed for the child.
function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();

    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

async function startServer() {
  const port = await getFreePort();

  return new Promise((resolve, reject) => {
    // process.execPath runs the child on exactly the runtime executing these tests.
    const child = spawn(process.execPath, [SERVER_FILE], {
      cwd: __dirname,
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // The captured output, the start-up bound and the settled flag live in one state record, so
    // nothing in this scope is declared as a reassigned binding.
    const state = { stdout: '', stderr: '', pending: '', timer: null, settled: false };

    const finish = (err, value) => {
      if (state.settled) {
        return;
      }

      state.settled = true;
      clearTimeout(state.timer);

      if (err) {
        // A start that failed must not leave a process behind.
        child.kill('SIGKILL');
        reject(err);
        return;
      }

      resolve(value);
    };

    state.timer = setTimeout(() => {
      finish(new Error(
        `Server did not report a start within ${STARTUP_TIMEOUT_MS} ms. ` +
        `stdout: ${JSON.stringify(state.stdout)} stderr: ${JSON.stringify(state.stderr)}`
      ));
    }, STARTUP_TIMEOUT_MS);

    child.on('error', (err) => finish(new Error(`Failed to spawn ${SERVER_FILE}: ${err.message}`)));
    child.on('exit', (code, signal) => finish(new Error(
      `Server exited before it reported a start (code ${code}, signal ${signal}). ` +
      `stderr: ${JSON.stringify(state.stderr)}`
    )));

    // Captured so a start-up failure reaches the failure message as its cause, not as silence.
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      state.stderr += chunk;
    });

    // The startup line is written only after a successful bind, so waiting for it both proves the
    // service is listening and yields the port it actually bound.
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      state.stdout += chunk;
      state.pending += chunk;

      const lines = state.pending.split(/\r?\n/);
      state.pending = lines.pop();

      for (const line of lines) {
        const match = /^Server running on port (\d+)$/.exec(line);

        if (match === null) {
          continue;
        }

        if (match[1] !== String(port)) {
          finish(new Error(`Server reported port ${match[1]} but was asked to listen on ${port}`));
          return;
        }

        finish(null, { child, port });
        return;
      }
    });
  });
}

function stopServer(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }

    // Escalated so a child ignoring SIGTERM still leaves no listener behind.
    const escalate = setTimeout(() => child.kill('SIGKILL'), STOP_TIMEOUT_MS);

    child.once('exit', () => {
      clearTimeout(escalate);
      resolve();
    });

    child.kill('SIGTERM');
  });
}

// Every case runs against its own child and stops it in a finally, so a failing assertion cannot
// leave a listening process behind and the check needs no test-runner hook, which Node.js provides
// only from 18.8.0 and does not run at all on several releases above that floor.
async function withServer(run) {
  const { child, port } = await startServer();

  try {
    await run(port);
  } finally {
    await stopServer(child);
  }
}

// 127.0.0.1 is used rather than the name localhost, so the check does not depend on name resolution.
function request(port, method, target) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      method,
      path: target,
      agent: false,
      timeout: REQUEST_TIMEOUT_MS
    }, (res) => {
      const chunks = [];

      res.setEncoding('utf8');
      // A response that ends prematurely errors the response object, so that path rejects as well.
      res.on('error', reject);
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      res.on('end', () => resolve({
        status: res.statusCode,
        contentType: res.headers['content-type'],
        body: chunks.join('')
      }));
    });

    req.on('error', reject);

    // A request timeout does not error the request on its own, so the socket is destroyed with a
    // cause for the promise to reject on.
    req.on('timeout', () => req.destroy(new Error(
      `No response to ${method} ${target} within ${REQUEST_TIMEOUT_MS} ms`
    )));

    req.end();
  });
}

test('GET / returns 200 with text/plain and the welcome message', async () => {
  await withServer(async (port) => {
    const res = await request(port, 'GET', '/');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.contentType, CONTENT_TYPE);
    // The served text is the spelling the response contract fixes byte for byte, which differs from
    // the wording in the Ajit_Welcome_Rule; the contract governs here, because a check asserting the
    // rule's wording could not pass against the mandated body. Strict equality pins those exact
    // bytes: 16 of them, with no trailing newline.
    assert.strictEqual(res.body, 'Welcome to Blity');
  });
});

test('an unknown path returns 404 with Not Found', async () => {
  await withServer(async (port) => {
    const res = await request(port, 'GET', '/anything');

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.contentType, CONTENT_TYPE);
    assert.strictEqual(res.body, 'Not Found');
  });
});

test('a non-GET method on the root returns 405 with Method Not Allowed', async () => {
  await withServer(async (port) => {
    const res = await request(port, 'POST', '/');

    assert.strictEqual(res.status, 405);
    assert.strictEqual(res.contentType, CONTENT_TYPE);
    assert.strictEqual(res.body, 'Method Not Allowed');
  });
});
