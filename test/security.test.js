'use strict';

/*
 * Regression suite for the fixed plain-text service in server.js.
 *
 * The suite makes "the current functionality is not impacted" checkable rather than a
 * matter of opinion. It pins every measured element of the contract — the status line,
 * Content-Type, Content-Length, body bytes, the request-dependent Connection and Keep-Alive
 * fields, the uniform response the handler returns for every dispatched request, the
 * startup readiness line, the loopback bind scope, signal-derived termination, and the five
 * request shapes the HTTP parser handles before or without the handler. Those cases are
 * registered unconditionally and must hold both before and after hardening.
 *
 * The four intentional departures the hardening makes — the nosniff header, the bounded
 * header phase, the single sanitized listener-error line with its bounded shutdown, and the
 * declared runtime support — are a separate group selected by EXPECT_HARDENED, so a
 * pre-change run never depends on a control that does not exist yet:
 *
 *   node --test                          baseline set only (EXPECT_HARDENED unset)
 *   EXPECT_HARDENED=1 node --test        baseline set plus every mitigation assertion
 *   EXPECT_HARDENED=d1,d2 node --test    baseline set plus only the named groups
 *
 * A selection the suite does not recognise fails loudly and runs no mitigation case at all,
 * and a selected group fails loudly rather than skipping when its control is missing.
 *
 * Every assertion is per field: the Date header varies per request, so no case compares a
 * whole header block. Every wait carries its own explicit deadline, because node:test has no
 * default per-test timeout and an unbounded probe would hang the run instead of failing it.
 * The server binds a hard-coded 127.0.0.1:3000, so the suite is serial and only one child
 * owns the port at a time. Only Node core modules are imported; no third-party package may
 * be added to make this file run.
 *
 * The project's one allocation rule asks for the C++ smart-pointer factories in place of raw
 * new/delete. It has no site here: this file is JavaScript, and each of its new expressions
 * constructs a core built-in the runtime manages (Promise, Error, Map, RegExp), none of which
 * has a smart-pointer counterpart or expresses ownership a reader could convert.
 */

const test = require('node:test');
const assert = require('node:assert');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const SERVER_PATH = path.join(REPO_ROOT, 'server.js');
const MANIFEST_PATH = path.join(REPO_ROOT, 'package.json');
const NVMRC_PATH = path.join(REPO_ROOT, '.nvmrc');

const HOST = '127.0.0.1';
const PORT = 3000;
const STARTUP_LINE = 'Server running at http://127.0.0.1:3000/';
const BODY = 'Hello, World!\n';
const BODY_LENGTH = 14;
const CANARY = 'CANARY123';

const READINESS_DEADLINE_MS = 5000;
const CHILD_STOP_GRACE_MS = 2000;
const SOCKET_DEADLINE_MS = 5000;
const SIGNAL_DEADLINE_MS = 5000;
const SLOW_BODY_OBSERVATION_MS = 25000;
const FORCED_EXIT_DEADLINE_MS = 10000;
const HEADER_PHASE_MIN_MS = 9000;
const HEADER_PHASE_MAX_MS = 15000;
const HEADER_DRIBBLE_INTERVAL_MS = 1500;

const EXPECTED_LISTEN_ERROR_LINE = 'Server error: EADDRINUSE';

const UNREACHED = Symbol('deadline');

const MITIGATION_GROUPS = ['d1', 'd2', 'd3', 'd4'];

const FORBIDDEN_SERVER_PROPERTIES = [
  'requestTimeout',
  'maxHeadersCount',
  'maxRequestsPerSocket',
  'maxConnections',
  'timeout',
  'keepAliveTimeout',
];

const FORBIDDEN_OPTION_KEYS = [
  'requestTimeout',
  'maxHeadersCount',
  'maxRequestsPerSocket',
  'maxConnections',
  'keepAliveTimeout',
];

const FORBIDDEN_PROCESS_EVENTS = [
  'uncaughtException',
  'unhandledRejection',
  'SIGTERM',
  'SIGINT',
];

// -----------------------------------------------------------------------------------------
// Mode selection and the banner that makes a mis-set EXPECT_HARDENED visible in the log.
// -----------------------------------------------------------------------------------------

function selectedMitigationGroups(value) {
  if (value === undefined || value === null || String(value).trim() === '') return [];
  const normalized = String(value).trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'all') {
    return MITIGATION_GROUPS.slice();
  }
  return normalized.split(',').map((token) => token.trim()).filter((token) => token !== '');
}

const SELECTED_GROUPS = selectedMitigationGroups(process.env.EXPECT_HARDENED);
const UNKNOWN_GROUPS = SELECTED_GROUPS.filter((group) => !MITIGATION_GROUPS.includes(group));

// -----------------------------------------------------------------------------------------
// Port preflight, run before a single case is registered.
//
// Port 3000 is a hard-coded literal in server.js, so the suite needs it to itself. It can be
// held by an unrelated process, and the failure then surfaces as a cascade of confusing
// EADDRINUSE readiness rejections; probing once up front turns that into one unmistakable
// diagnostic and registers no case that could produce the cascade.
// -----------------------------------------------------------------------------------------

const PORT_PROBE_SCRIPT = [
  "const net = require('net');",
  'const probe = net.createServer();',
  "probe.once('error', () => process.exit(1));",
  "probe.listen(" + PORT + ", '" + HOST + "', () => probe.close(() => process.exit(0)));",
].join('\n');

function portIsAvailable() {
  const probe = spawnSync(process.execPath, ['-e', PORT_PROBE_SCRIPT], {
    timeout: READINESS_DEADLINE_MS,
    stdio: 'ignore',
  });
  return probe.status === 0;
}

const PORT_AVAILABLE = portIsAvailable();

// When the port is taken, every behavioural case below is registered through this gate, and
// the preflight case — which is registered unconditionally — fails, so the run reports the one
// real cause instead of a cascade and can never read as a vacuous green.
const portTest = PORT_AVAILABLE ? test : () => {};

process.stdout.write(
  '# mode: '
  + (SELECTED_GROUPS.length === 0 ? 'baseline' : 'hardened [' + SELECTED_GROUPS.join(', ') + ']')
  + '\n'
);
if (!PORT_AVAILABLE) {
  process.stdout.write('# port ' + PORT + ' is in use, so no behavioural case is registered\n');
}

// A selected mitigation group must fail loudly rather than skip. This second gate therefore
// suppresses registration only when the port is unavailable or the selector names a group that
// does not exist, and in both states the case that reports the reason is already registered.
const mitigationTest = (PORT_AVAILABLE && UNKNOWN_GROUPS.length === 0) ? test : () => {};

function firstNonLoopbackIPv4() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses) {
      if (address.family === 'IPv4' && address.internal === false) return address.address;
    }
  }
  return null;
}

const NON_LOOPBACK_HOST = firstNonLoopbackIPv4();

// -----------------------------------------------------------------------------------------
// Small helpers.
// -----------------------------------------------------------------------------------------

function withDeadline(promise, ms) {
  let timer = null;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve(UNREACHED), ms);
  });
  return Promise.race([promise, deadline])
    .then((outcome) => (outcome === UNREACHED ? null : outcome))
    .finally(() => clearTimeout(timer));
}

// Removes comments while leaving string literals intact, so a setting is detected in code and
// never mistaken for one named in prose, and so the '//' inside a 'http://' string is not
// read as the start of a comment.
function stripComments(source) {
  let out = '';
  let index = 0;
  let state = 'code';
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (state === 'code') {
      if (char === '/' && next === '/') {
        state = 'line-comment';
        index += 2;
        continue;
      }
      if (char === '/' && next === '*') {
        state = 'block-comment';
        index += 2;
        continue;
      }
      if (char === "'") {
        state = 'single';
        out += char;
        index += 1;
        continue;
      }
      if (char === '"') {
        state = 'double';
        out += char;
        index += 1;
        continue;
      }
      if (char === '`') {
        state = 'template';
        out += char;
        index += 1;
        continue;
      }
      out += char;
      index += 1;
      continue;
    }
    if (state === 'line-comment') {
      if (char === '\n') {
        state = 'code';
        out += char;
      }
      index += 1;
      continue;
    }
    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        state = 'code';
        index += 2;
        continue;
      }
      if (char === '\n') out += char;
      index += 1;
      continue;
    }
    if (char === '\\') {
      out += char + (next === undefined ? '' : next);
      index += 2;
      continue;
    }
    if (
      (state === 'single' && char === "'")
      || (state === 'double' && char === '"')
      || (state === 'template' && char === '`')
    ) {
      state = 'code';
    }
    out += char;
    index += 1;
  }
  return out;
}

// Reads a major.minor.patch version out of a string, tolerating a leading 'v'.
function parseVersion(value, label) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(value).trim());
  assert.ok(
    match,
    'could not read a major.minor.patch version out of ' + label + ': ' + JSON.stringify(value)
  );
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}

// Handles exactly the range form the manifest declares: '||' separates alternatives,
// whitespace separates the comparators within one, and each comparator is an optional
// operator followed by a major.minor.patch version. No general semver implementation is
// attempted and no semver package is imported.
function satisfiesRange(version, range) {
  const candidate = parseVersion(version, 'the version being checked');
  return String(range)
    .split('||')
    .some((alternative) => alternative.trim().split(/\s+/).every((token) => {
      const match = /^(>=|<=|>|<|=)?(v?\d+\.\d+\.\d+)$/.exec(token);
      assert.ok(match, 'unsupported comparator in the declared range: ' + JSON.stringify(token));
      const operator = match[1] === undefined ? '=' : match[1];
      const order = compareVersions(candidate, parseVersion(match[2], 'the declared range'));
      if (operator === '>=') return order >= 0;
      if (operator === '<=') return order <= 0;
      if (operator === '>') return order > 0;
      if (operator === '<') return order < 0;
      return order === 0;
    }));
}

// -----------------------------------------------------------------------------------------
// Child harness: spawn server.js, resolve on the exact readiness line, and always reap the
// child before rejecting, so a start that fails never leaves port 3000 held for the run.
// -----------------------------------------------------------------------------------------

async function terminate(child, exitRecord) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  const stopped = await withDeadline(exitRecord, CHILD_STOP_GRACE_MS);
  if (stopped !== null) return;
  child.kill('SIGKILL');
  await exitRecord;
}

function spawnServer(options) {
  const settings = options || {};
  const args = [];
  if (settings.require) args.push('--require', settings.require);
  args.push(SERVER_PATH);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: REPO_ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdoutText = '';
    let stderrText = '';
    let firstLine = null;
    let settled = false;
    const exitRecord = new Promise((resolveExit) => {
      child.on('exit', (code, signal) => resolveExit({ code, signal }));
    });

    function rejectAfterCleanup(reason) {
      if (settled) return;
      settled = true;
      clearTimeout(readinessTimer);
      terminate(child, exitRecord)
        .then(() => reject(new Error(reason)), () => reject(new Error(reason)));
    }

    const readinessTimer = setTimeout(() => {
      rejectAfterCleanup(
        'the child did not report readiness within ' + READINESS_DEADLINE_MS + ' ms'
        + (stderrText.trim() === '' ? '' : ' (stderr: ' + stderrText.trim() + ')')
      );
    }, READINESS_DEADLINE_MS);

    const handle = {
      child,
      exitRecord,
      stdout: () => stdoutText,
      stderr: () => stderrText,
      firstLine: () => firstLine,
      stop: () => terminate(child, exitRecord),
      waitForExit: (ms) => withDeadline(exitRecord, ms === undefined ? CHILD_STOP_GRACE_MS : ms),
    };

    child.stdout.on('data', (chunk) => {
      stdoutText += chunk.toString('utf8');
      if (firstLine === null) {
        const newline = stdoutText.indexOf('\n');
        if (newline !== -1) firstLine = stdoutText.slice(0, newline).replace(/\r$/, '');
      }
      if (settled) return;
      const ready = stdoutText.split('\n').some((line) => line.replace(/\r$/, '') === STARTUP_LINE);
      if (ready) {
        settled = true;
        clearTimeout(readinessTimer);
        resolve(handle);
      }
    });

    child.stderr.on('data', (chunk) => {
      stderrText += chunk.toString('utf8');
      if (!settled && stderrText.includes('EADDRINUSE')) {
        rejectAfterCleanup('the child could not bind ' + HOST + ':' + PORT + ': ' + stderrText.trim());
      }
    });

    child.on('exit', (code, signal) => {
      if (!settled) {
        rejectAfterCleanup('the child exited before reporting readiness (code ' + code + ', signal ' + signal + ')');
      }
    });

    child.on('error', (err) => {
      rejectAfterCleanup('the server child could not be spawned: ' + err.message);
    });
  });
}

// -----------------------------------------------------------------------------------------
// Raw-socket helpers. Requests are written as exact bytes so nothing the suite sends
// perturbs the fields it asserts, and every read is bounded by an explicit deadline.
//
// Read modes: 'headers' resolves once the header block has arrived, 'body' once the declared
// Content-Length has arrived, and 'close' once the server closes the connection.
// -----------------------------------------------------------------------------------------

function parseResponse(text) {
  const headerEnd = text.indexOf('\r\n\r\n');
  const head = headerEnd === -1 ? text : text.slice(0, headerEnd);
  const lines = head.split('\r\n');
  const statusLine = lines[0] === undefined ? '' : lines[0];
  const parts = statusLine.split(' ');
  const fields = new Map();
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(':');
    if (separator > 0) {
      fields.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
    }
  }
  return {
    statusLine,
    httpVersion: parts[0] === undefined ? '' : parts[0].replace(/^HTTP\//, ''),
    statusCode: Number(parts[1]),
    statusMessage: parts.slice(2).join(' '),
    fields,
    field: (name) => fields.get(name.toLowerCase()),
    body: headerEnd === -1 ? '' : text.slice(headerEnd + 4),
  };
}

function rawExchange(bytes, options) {
  const settings = options || {};
  const mode = settings.mode === undefined ? 'body' : settings.mode;
  const deadlineMs = settings.deadlineMs === undefined ? SOCKET_DEADLINE_MS : settings.deadlineMs;
  const host = settings.host === undefined ? HOST : settings.host;
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const socket = net.createConnection({ host, port: PORT });
    const chunks = [];
    let settled = false;
    let sawEnd = false;
    let errorCode = null;

    function finish(why, error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      const text = Buffer.concat(chunks).toString('latin1');
      const result = {
        why,
        elapsedMs: Date.now() - startedAt,
        text,
        byteLength: Buffer.concat(chunks).length,
        sawEnd,
        errorCode,
        response: parseResponse(text),
      };
      if (error === undefined) resolve(result);
      else reject(error);
    }

    const timer = setTimeout(() => finish('deadline'), deadlineMs);

    socket.on('connect', () => {
      if (bytes !== null && bytes !== undefined) socket.write(bytes);
    });

    socket.on('data', (chunk) => {
      chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      const text = buffer.toString('latin1');
      const headerEnd = text.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;
      if (mode === 'headers') {
        finish('headers-complete');
        return;
      }
      if (mode !== 'body') return;
      const declared = /^content-length:\s*(\d+)\s*$/im.exec(text.slice(0, headerEnd));
      if (declared && buffer.length >= headerEnd + 4 + Number(declared[1])) finish('body-complete');
    });

    socket.on('end', () => {
      sawEnd = true;
      if (mode === 'close') finish('end');
    });

    socket.on('close', () => {
      if (settled) return;
      finish(mode === 'close' ? 'close' : 'socket-closed');
    });

    socket.on('error', (err) => {
      errorCode = err.code;
      if (mode === 'close') finish('error');
      else finish('socket-error', err);
    });
  });
}

function hostHeader() {
  return 'Host: ' + HOST + ':' + PORT + '\r\n';
}

function requestFor(method, target) {
  return method + ' ' + target + ' HTTP/1.1\r\n' + hostHeader() + '\r\n';
}

function generatedHeaderFields(count) {
  let out = '';
  for (let index = 0; index < count; index += 1) out += 'X-' + index + ': v\r\n';
  return out;
}

// A POST whose body arrives one byte per second: it receives its response as soon as the
// headers are complete, and any second response inside the observation window means a body
// timeout was introduced.
function slowBodyExchange(contentLength, initialBytes, intervalMs, observationMs) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = net.createConnection({ host: HOST, port: PORT });
    const responses = [];
    let sent = initialBytes;
    let ticker = null;
    let done = false;

    function finish() {
      if (done) return;
      done = true;
      clearInterval(ticker);
      clearTimeout(deadline);
      socket.destroy();
      resolve({ responses, elapsedMs: Date.now() - startedAt });
    }

    const deadline = setTimeout(finish, observationMs);

    socket.on('connect', () => {
      socket.write(
        'POST /slow-body HTTP/1.1\r\n' + hostHeader() + 'Content-Length: ' + contentLength
        + '\r\n\r\n' + 'x'.repeat(initialBytes)
      );
      ticker = setInterval(() => {
        if (sent >= contentLength) return;
        socket.write('x');
        sent += 1;
      }, intervalMs);
    });

    socket.on('data', (chunk) => {
      responses.push({ atMs: Date.now() - startedAt, text: chunk.toString('latin1') });
    });

    socket.on('error', finish);
    socket.on('close', finish);

    setTimeout(() => {
      if (!done) socket.destroy();
    }, observationMs + 1);
  });
}

// -----------------------------------------------------------------------------------------
// Shared child. The port is hard-coded, so one request-serving child stands behind every
// request case and the lifecycle cases take the port exclusively.
// -----------------------------------------------------------------------------------------

let shared = null;

async function startShared() {
  shared = await spawnServer();
  return shared;
}

async function releaseShared() {
  const child = shared;
  shared = null;
  if (child !== null) await child.stop();
}

// A lifecycle case that signalled the shared child would destroy the fixture for every case
// after it, and a lifecycle child spawned while the shared child listens dies on EADDRINUSE
// and proves nothing, so the port is released for the case and handed back afterwards.
async function withExclusivePort(body) {
  const restore = shared !== null;
  await releaseShared();
  try {
    await body();
  } finally {
    if (restore && PORT_AVAILABLE) await startShared();
  }
}

// The shared child stands behind every request case. Both hooks are registered unconditionally
// so that the port condition is carried by their bodies rather than by their registration.
test.before(async () => {
  if (PORT_AVAILABLE) await startShared();
});

test.after(async () => {
  if (PORT_AVAILABLE) await releaseShared();
});

// A run killed part-way through would otherwise leave the shared child listening on the port,
// so the suite also reaps it synchronously if the process is going away.
process.on('exit', () => {
  if (shared !== null && shared.child.exitCode === null && shared.child.signalCode === null) {
    shared.child.kill('SIGKILL');
  }
});

// A connection-level probe, for the case that asserts whether a connection is accepted at all
// rather than what the service writes on it.
function connectionOutcome(host) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: PORT });
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve('timeout');
    }, SOCKET_DEADLINE_MS);
    socket.on('connect', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve('connected');
    });
    socket.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(err.code);
    });
  });
}

// -----------------------------------------------------------------------------------------
// Baseline set: the measured contract. Registered unconditionally, and required to hold both
// against the unmodified server.js and after the hardening.
// -----------------------------------------------------------------------------------------

test('preflight: 127.0.0.1:3000 is available to this suite', () => {
  assert.ok(
    PORT_AVAILABLE,
    'port 3000 is already in use — this suite needs exclusive use of it; stop whatever holds '
    + '127.0.0.1:3000 (lsof -i :3000) and re-run'
  );
});

portTest('baseline: the child reports the readiness line exactly', () => {
  assert.strictEqual(shared.firstLine(), STARTUP_LINE);
});

portTest('baseline: GET / returns the measured status line, content-type, content-length and body', async () => {
  const result = await rawExchange(requestFor('GET', '/'), { mode: 'body' });
  const { response } = result;
  assert.strictEqual(result.why, 'body-complete', 'the response did not complete: ' + JSON.stringify(result.text));
  assert.strictEqual(response.statusLine, 'HTTP/1.1 200 OK', 'the status line changed: ' + JSON.stringify(result.text));
  assert.strictEqual(response.httpVersion, '1.1');
  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.statusMessage, 'OK');
  assert.strictEqual(
    response.field('content-type'),
    'text/plain',
    'Content-Type must stay exactly text/plain, with no parameters: ' + JSON.stringify(result.text)
  );
  assert.strictEqual(response.field('content-length'), String(BODY_LENGTH));
  assert.strictEqual(response.body, BODY);
});

portTest('baseline: a client that does not ask for closure sees connection keep-alive and timeout=5', async () => {
  const result = await rawExchange(requestFor('GET', '/'), { mode: 'body' });
  assert.strictEqual(result.response.field('connection'), 'keep-alive');
  assert.strictEqual(result.response.field('keep-alive'), 'timeout=5');
});

portTest('baseline: a client that asks for closure sees connection close with the same response', async () => {
  const result = await rawExchange(
    'GET / HTTP/1.1\r\n' + hostHeader() + 'Connection: close\r\n\r\n',
    { mode: 'close' }
  );
  const { response } = result;
  assert.strictEqual(response.statusLine, 'HTTP/1.1 200 OK');
  assert.strictEqual(response.field('connection'), 'close');
  assert.strictEqual(response.field('content-type'), 'text/plain');
  assert.strictEqual(response.field('content-length'), String(BODY_LENGTH));
  assert.strictEqual(response.field('keep-alive'), undefined, 'the closure response must carry no Keep-Alive field');
  assert.strictEqual(response.body, BODY);
});

portTest('baseline: no Server and no X-Powered-By field is emitted', async () => {
  const result = await rawExchange(requestFor('GET', '/'), { mode: 'body' });
  assert.strictEqual(result.response.field('server'), undefined, 'a Server banner was introduced');
  assert.strictEqual(result.response.field('x-powered-by'), undefined, 'an X-Powered-By banner was introduced');
});

portTest('baseline: every method is answered uniformly on / and on an arbitrary path', async () => {
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'TRACE'];
  for (const method of methods) {
    for (const target of ['/', '/some/arbitrary/path']) {
      const result = await rawExchange(requestFor(method, target), { mode: 'body' });
      const label = method + ' ' + target + ': ' + JSON.stringify(result.text);
      assert.strictEqual(result.response.statusCode, 200, label);
      assert.strictEqual(result.response.statusMessage, 'OK', label);
      assert.strictEqual(result.response.field('content-type'), 'text/plain', label);
      assert.strictEqual(result.response.body, BODY, label);
    }
  }
});

portTest('baseline: traversal- and injection-shaped targets return the identical response', async () => {
  const targets = ['/admin', '/../../etc/passwd', '/%2e%2e%2fetc%2fpasswd', '/?x=<script>alert(1)</script>'];
  for (const target of targets) {
    const result = await rawExchange(requestFor('GET', target), { mode: 'body' });
    const label = target + ': ' + JSON.stringify(result.text);
    assert.strictEqual(result.response.statusCode, 200, label);
    assert.strictEqual(result.response.field('content-type'), 'text/plain', label);
    assert.strictEqual(result.response.body, BODY, label);
  }
});

portTest('baseline: a canary header on a raw TRACE request is not reflected', async () => {
  const result = await rawExchange(
    'TRACE / HTTP/1.1\r\n' + hostHeader() + 'X-Secret-Probe: ' + CANARY + '\r\n\r\n',
    { mode: 'body' }
  );
  assert.strictEqual(result.response.statusCode, 200);
  assert.strictEqual(
    result.text.includes(CANARY),
    false,
    'the response echoed a request header, which would make the TRACE answer an echo service'
  );
  assert.strictEqual(result.response.body, BODY);
});

portTest('baseline: the listener answers on loopback and refuses a non-loopback local address', async (t) => {
  assert.strictEqual(await connectionOutcome(HOST), 'connected', 'the listener is not reachable on ' + HOST);
  if (NON_LOOPBACK_HOST === null) {
    t.diagnostic('no non-loopback IPv4 address exists on this host, so the refusal half of this case was not probed');
    return;
  }
  assert.strictEqual(
    await connectionOutcome(NON_LOOPBACK_HOST),
    'ECONNREFUSED',
    'the listener accepted a connection on the non-loopback address ' + NON_LOOPBACK_HOST
  );
});

portTest('baseline: a POST whose body arrives one byte per second receives exactly one response', async () => {
  const observed = await slowBodyExchange(60, 9, 1000, SLOW_BODY_OBSERVATION_MS);
  assert.strictEqual(
    observed.responses.length,
    1,
    'expected exactly one response, so a body-phase timeout was introduced: '
    + JSON.stringify(observed.responses)
  );
  const only = parseResponse(observed.responses[0].text);
  assert.strictEqual(only.statusCode, 200);
  assert.strictEqual(only.field('content-length'), String(BODY_LENGTH));
  assert.strictEqual(only.body, BODY);
});

portTest('baseline: SIGTERM terminates the process by signal, with no exit code', async () => {
  await withExclusivePort(async () => {
    const server = await spawnServer();
    server.child.kill('SIGTERM');
    const exited = await server.waitForExit(SIGNAL_DEADLINE_MS);
    assert.notStrictEqual(exited, null, 'the process was still running after SIGTERM');
    assert.strictEqual(exited.code, null, 'SIGTERM produced a normal exit instead of a signal');
    assert.strictEqual(exited.signal, 'SIGTERM');
  });
});

portTest('baseline: SIGINT terminates the process by signal, with no exit code', async () => {
  await withExclusivePort(async () => {
    const server = await spawnServer();
    server.child.kill('SIGINT');
    const exited = await server.waitForExit(SIGNAL_DEADLINE_MS);
    assert.notStrictEqual(exited, null, 'the process was still running after SIGINT');
    assert.strictEqual(exited.code, null, 'SIGINT produced a normal exit instead of a signal');
    assert.strictEqual(exited.signal, 'SIGINT');
  });
});

// -----------------------------------------------------------------------------------------
// The five request shapes the HTTP parser answers before or without the handler. Each is
// required behaviour that must be preserved, and each is asserted field by field from its
// exact bytes, so no later change can quietly alter a shape the service is described as
// answering uniformly.
// -----------------------------------------------------------------------------------------

portTest('divergence 1: HEAD / answers 200 with no body and no content-length', async () => {
  const result = await rawExchange('HEAD / HTTP/1.1\r\n' + hostHeader() + '\r\n', { mode: 'headers' });
  const { response } = result;
  assert.strictEqual(response.statusLine, 'HTTP/1.1 200 OK');
  assert.strictEqual(response.field('content-type'), 'text/plain');
  assert.strictEqual(response.field('connection'), 'keep-alive');
  assert.strictEqual(response.field('keep-alive'), 'timeout=5');
  assert.strictEqual(response.field('content-length'), undefined, 'HEAD gained a Content-Length field');
  assert.strictEqual(
    result.text.slice(result.text.indexOf('\r\n\r\n') + 4),
    '',
    'bytes followed the HEAD header block: ' + JSON.stringify(result.text)
  );
});

portTest('divergence 2: CONNECT is closed with no bytes written', async () => {
  const result = await rawExchange('CONNECT ' + HOST + ':' + PORT + ' HTTP/1.1\r\n' + hostHeader() + '\r\n', {
    mode: 'close',
  });
  assert.strictEqual(result.byteLength, 0, 'the server wrote bytes for CONNECT: ' + JSON.stringify(result.text));
  assert.strictEqual(result.sawEnd, true, 'the server did not close the CONNECT connection');
});

portTest('divergence 3: an illegal byte in the method token is rejected by the parser', async () => {
  const result = await rawExchange('BAD\x01METHOD / HTTP/1.1\r\nHost: x\r\n\r\n', { mode: 'headers' });
  const { response } = result;
  assert.strictEqual(response.statusLine, 'HTTP/1.1 400 Bad Request', 'the parser rejection changed: ' + JSON.stringify(result.text));
  assert.strictEqual(response.field('connection'), 'close');
  assert.strictEqual(response.field('date'), undefined, 'this parser-level rejection carries no Date field');
  assert.strictEqual(response.field('content-length'), undefined, 'this parser-level rejection carries no Content-Length field');
});

portTest('divergence 4: a request without a Host field is rejected with a chunked 400', async () => {
  const result = await rawExchange('GET / HTTP/1.1\r\n\r\n', { mode: 'close' });
  const { response } = result;
  assert.strictEqual(response.statusLine, 'HTTP/1.1 400 Bad Request', 'the missing-Host rejection changed: ' + JSON.stringify(result.text));
  assert.strictEqual(response.field('connection'), 'close');
  assert.strictEqual(response.field('transfer-encoding'), 'chunked');
  assert.ok(result.text.endsWith('0\r\n\r\n'), 'the chunked body did not terminate with 0\\r\\n\\r\\n: ' + JSON.stringify(result.text));
});

portTest('divergence 5: 1000 total header fields are accepted and 1001 are rejected', async () => {
  // The count is of every header field, Host included: Host plus 999 generated fields is
  // 1000 total and is accepted, and Host plus 1000 generated fields is 1001 total and is
  // rejected. The same request described as '1000 generated fields' is 1001 total and lands
  // on the other side of this boundary.
  const accepted = await rawExchange(
    'GET / HTTP/1.1\r\n' + hostHeader() + generatedHeaderFields(999) + '\r\n',
    { mode: 'headers', deadlineMs: 10000 }
  );
  assert.strictEqual(
    accepted.response.statusCode,
    200,
    '1000 total header fields were refused: ' + JSON.stringify(accepted.text)
  );

  const rejected = await rawExchange(
    'GET / HTTP/1.1\r\n' + hostHeader() + generatedHeaderFields(1000) + '\r\n',
    { mode: 'headers', deadlineMs: 10000 }
  );
  assert.strictEqual(
    rejected.response.statusLine,
    'HTTP/1.1 431 Request Header Fields Too Large',
    '1001 total header fields were not refused as measured: ' + JSON.stringify(rejected.text)
  );
  assert.strictEqual(rejected.response.field('connection'), 'close');
});

// -----------------------------------------------------------------------------------------
// Dropped-control guard, static half. Seven conventional settings were rejected on
// measurement: a count cap rejects requests the baseline serves, and a lowered body timeout
// emits a second response the baseline never emits. Behavioural cases cannot catch every
// value — a header-count cap set between the two boundary fixtures would pass both sides, and
// a raised body timeout would pass the slow-body case — so this check is the enforcement,
// with the behavioural cases kept alongside it as detection for the most likely
// reintroductions.
// -----------------------------------------------------------------------------------------

function createServerOptionsObject(source) {
  const callIndex = source.indexOf('http.createServer');
  if (callIndex === -1) return null;
  const openParen = source.indexOf('(', callIndex);
  if (openParen === -1) return null;
  let cursor = openParen + 1;
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
  if (source[cursor] !== '{') return null;
  let depth = 0;
  for (let index = cursor; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(cursor + 1, index);
    }
  }
  return null;
}

portTest('guard: server.js assigns none of the settings that were rejected on measurement', () => {
  const source = stripComments(fs.readFileSync(SERVER_PATH, 'utf8'));

  for (const name of FORBIDDEN_SERVER_PROPERTIES) {
    const assignment = new RegExp('\\bserver\\s*\\.\\s*' + name + '\\s*=');
    assert.strictEqual(
      assignment.test(source),
      false,
      'server.js assigns server.' + name + ', which changes how many requests the service accepts or how long it holds one'
    );
  }

  const options = createServerOptionsObject(source);
  if (options !== null) {
    for (const name of FORBIDDEN_OPTION_KEYS) {
      const key = new RegExp('\\b' + name + '\\s*:');
      assert.strictEqual(
        key.test(options),
        false,
        'the http.createServer options object sets ' + name + ', which changes how many requests the service accepts or how long it holds one'
      );
    }
  }

  for (const event of FORBIDDEN_PROCESS_EVENTS) {
    const handler = new RegExp('process\\s*\\.\\s*(?:on|once|prependListener)\\s*\\(\\s*[\'"]' + event + '[\'"]');
    assert.strictEqual(
      handler.test(source),
      false,
      'server.js registers a ' + event + ' handler, which replaces the process contract the service was measured with'
    );
  }
});

// -----------------------------------------------------------------------------------------
// Mitigation set. Each group is registered only when EXPECT_HARDENED selects it, and a
// selected group fails loudly rather than skipping when its control is missing, so a
// mis-set selector can never read as green.
// -----------------------------------------------------------------------------------------

if (UNKNOWN_GROUPS.length > 0) {
  test('EXPECT_HARDENED names mitigation groups that exist', () => {
    assert.fail(
      'unknown mitigation group(s): ' + UNKNOWN_GROUPS.join(', ')
      + '; accepted values are 1, all, or a comma-separated list drawn from ' + MITIGATION_GROUPS.join(', ')
    );
  });
}

if (SELECTED_GROUPS.includes('d1')) {
  mitigationTest('D-1: every dispatched response carries X-Content-Type-Options: nosniff', async () => {
    const get = await rawExchange(requestFor('GET', '/'), { mode: 'body' });
    assert.strictEqual(
      get.response.field('x-content-type-options'),
      'nosniff',
      'GET lost the nosniff field: ' + JSON.stringify(get.text)
    );

    const post = await rawExchange(requestFor('POST', '/'), { mode: 'body' });
    assert.strictEqual(
      post.response.field('x-content-type-options'),
      'nosniff',
      'POST lost the nosniff field: ' + JSON.stringify(post.text)
    );

    const head = await rawExchange('HEAD / HTTP/1.1\r\n' + hostHeader() + '\r\n', { mode: 'headers' });
    assert.strictEqual(
      head.response.field('x-content-type-options'),
      'nosniff',
      'HEAD reaches the handler and is not exempt from the field: ' + JSON.stringify(head.text)
    );
    assert.strictEqual(head.response.field('content-length'), undefined, 'HEAD gained a Content-Length field');
  });
}

// A connection that never completes a header phase. The first variant keeps sending header
// fields on an interval, the second sends nothing at all.
function headerPhaseExchange(options) {
  const settings = options || {};
  const initial = settings.initial === undefined ? null : settings.initial;
  const dribbleIntervalMs = settings.dribbleIntervalMs === undefined ? null : settings.dribbleIntervalMs;
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const socket = net.createConnection({ host: HOST, port: PORT });
    let settled = false;
    let dribble = null;
    const deadlineMs = HEADER_PHASE_MAX_MS + SOCKET_DEADLINE_MS;

    function settle(callback, value) {
      if (settled) return;
      settled = true;
      clearInterval(dribble);
      clearTimeout(timer);
      socket.destroy();
      callback(value);
    }

    const timer = setTimeout(() => {
      settle(reject, new Error('no response arrived within ' + deadlineMs + ' ms'));
    }, deadlineMs);

    socket.on('connect', () => {
      if (initial !== null) socket.write(initial);
      if (dribbleIntervalMs !== null) {
        dribble = setInterval(() => {
          socket.write('X-Dribble: v\r\n');
        }, dribbleIntervalMs);
      }
    });

    socket.on('data', (chunk) => {
      const text = chunk.toString('latin1');
      settle(resolve, {
        elapsedMs: Date.now() - startedAt,
        text,
        response: parseResponse(text),
      });
    });

    socket.on('error', (err) => {
      settle(reject, err);
    });
  });
}

function assertHeaderPhaseWindow(result, label) {
  assert.match(
    result.response.statusLine,
    /^HTTP\/1\.1 408( |$)/,
    label + ' was answered with ' + JSON.stringify(result.text)
  );
  assert.ok(
    result.elapsedMs >= HEADER_PHASE_MIN_MS,
    label + ' was closed after ' + result.elapsedMs + ' ms, sooner than the control allows'
  );
  assert.ok(
    result.elapsedMs <= HEADER_PHASE_MAX_MS,
    label + ' was closed after ' + result.elapsedMs + ' ms, later than the control allows'
  );
}

if (SELECTED_GROUPS.includes('d2')) {
  mitigationTest('D-2: a client that dribbles its headers is answered 408 inside the bounded window', async () => {
    const result = await headerPhaseExchange({
      initial: 'GET / HTTP/1.1\r\n' + hostHeader(),
      dribbleIntervalMs: HEADER_DRIBBLE_INTERVAL_MS,
    });
    assertHeaderPhaseWindow(result, 'a dribbled header phase');
  });

  mitigationTest('D-2: a client that connects and sends nothing is answered 408 inside the same window', async () => {
    const result = await headerPhaseExchange({});
    assertHeaderPhaseWindow(result, 'a connection that sent nothing');
  });
}

function stderrLines(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim() !== '');
}

// The colliding instance never reports readiness, so it is awaited on exit instead.
function spawnCollidingInstance() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SERVER_PATH], { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdoutText = '';
    let stderrText = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('the second instance neither exited nor reported within ' + FORCED_EXIT_DEADLINE_MS + ' ms'));
    }, FORCED_EXIT_DEADLINE_MS);
    child.stdout.on('data', (chunk) => {
      stdoutText += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderrText += chunk.toString('utf8');
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout: stdoutText, stderr: stderrText });
    });
  });
}

// Writes the injection module outside the repository: server.js exports nothing and must not
// gain a hook that exists only so a test can reach it, so the test side captures the instance
// by wrapping the core module the production file already imports.
function writePreloadModule() {
  const preloadPath = path.join(os.tmpdir(), 'blitzy-security-suite-preload-' + process.pid + '.js');
  const source = [
    "'use strict';",
    '',
    "const http = require('http');",
    '',
    'let captured = null;',
    'const createServer = http.createServer;',
    '',
    'http.createServer = function patchedCreateServer(...args) {',
    '  const server = createServer.apply(this, args);',
    '  captured = server;',
    '  return server;',
    '};',
    '',
    "process.stdin.setEncoding('utf8');",
    "process.stdin.on('data', (chunk) => {",
    "  if (chunk.trim() !== 'emit-error') return;",
    "  const error = new Error('injected post-listen failure');",
    "  error.code = 'EINJECTED';",
    '  if (captured !== null) captured.emit(\'error\', error);',
    '});',
    '',
  ].join('\n');
  fs.writeFileSync(preloadPath, source, 'utf8');
  return preloadPath;
}

const DISCLOSURE_FRAGMENTS = ['throw er', 'at Server', 'node:net', 'errno', 'syscall', 'address', 'port'];

if (SELECTED_GROUPS.includes('d3')) {
  mitigationTest('D-3: a second instance reports one sanitized line and exits 1 while the first keeps serving', async () => {
    await withExclusivePort(async () => {
      const first = await spawnServer();
      try {
        const second = await spawnCollidingInstance();
        assert.strictEqual(
          second.code,
          1,
          'a bind collision must still exit with code 1: ' + JSON.stringify(second)
        );
        assert.deepStrictEqual(
          stderrLines(second.stderr),
          [EXPECTED_LISTEN_ERROR_LINE],
          'stderr must hold exactly the one sanitized line: ' + JSON.stringify(second.stderr)
        );
        for (const fragment of DISCLOSURE_FRAGMENTS) {
          assert.strictEqual(
            second.stderr.includes(fragment),
            false,
            'stderr disclosed ' + JSON.stringify(fragment) + ': ' + JSON.stringify(second.stderr)
          );
        }
        const served = await rawExchange(requestFor('GET', '/'), { mode: 'body' });
        assert.strictEqual(
          served.response.statusCode,
          200,
          'the listening instance stopped serving after the collision: ' + JSON.stringify(served.text)
        );
      } finally {
        await first.stop();
      }
    });
  });

  mitigationTest('D-3: an error raised after the listener started is one sanitized line with a bounded exit', async () => {
    const preloadPath = writePreloadModule();
    try {
      await withExclusivePort(async () => {
        const server = await spawnServer({ require: preloadPath });
        const held = net.createConnection({ host: HOST, port: PORT });
        try {
          await new Promise((resolve, reject) => {
            held.on('connect', resolve);
            held.on('error', reject);
          });
          // The held connection carries an incomplete request, so it is still active: this is
          // the state a shutdown that simply waits on active connections never leaves.
          held.write('GET /held HTTP/1.1\r\n' + hostHeader());

          server.child.stdin.write('emit-error\n');

          const exited = await server.waitForExit(FORCED_EXIT_DEADLINE_MS);
          assert.notStrictEqual(
            exited,
            null,
            'the process was still running after a listener error'
          );
          assert.strictEqual(exited.code, 1, 'the bounded shutdown must preserve exit code 1');

          assert.deepStrictEqual(
            stderrLines(server.stderr()),
            ['Server error: EINJECTED'],
            'the diagnostic output changed: ' + JSON.stringify(server.stderr())
          );
          for (const fragment of DISCLOSURE_FRAGMENTS) {
            assert.strictEqual(
              server.stderr().includes(fragment),
              false,
              'stderr disclosed ' + JSON.stringify(fragment) + ': ' + JSON.stringify(server.stderr())
            );
          }

          assert.strictEqual(
            await connectionOutcome(HOST),
            'ECONNREFUSED',
            'a listening handle survived the error and the bounded exit'
          );
        } finally {
          held.destroy();
          await server.stop();
        }
      });
    } finally {
      fs.rmSync(preloadPath, { force: true });
    }
  });
}

if (SELECTED_GROUPS.includes('d4')) {
  mitigationTest('D-4: the declared runtime range admits the pinned toolchain and the running runtime', () => {
    const pinned = fs.readFileSync(NVMRC_PATH, 'utf8').trim();
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const range = manifest.engines === undefined ? undefined : manifest.engines.node;

    // The two declarations have different roles and are deliberately not compared as strings:
    // .nvmrc selects one exact toolchain version, and engines.node states the policy range.
    assert.match(pinned, /^v?\d+\.\d+\.\d+$/, '.nvmrc must pin one exact major.minor.patch version');
    assert.ok(
      typeof range === 'string' && range.trim() !== '',
      'package.json declares no engines.node range'
    );
    assert.ok(
      satisfiesRange(pinned, range),
      '.nvmrc pins ' + pinned + ', which the declared range ' + JSON.stringify(range) + ' does not admit'
    );
    assert.ok(
      satisfiesRange(process.version, range),
      'the running runtime ' + process.version + ' is outside the declared range ' + JSON.stringify(range)
    );
  });
}