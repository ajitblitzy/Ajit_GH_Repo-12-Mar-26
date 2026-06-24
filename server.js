'use strict';

/**
 * Minimal, zero-dependency HTTP server.
 *
 * This module exposes a tiny HTTP service that responds to every request —
 * regardless of method or path — with the plain-text body "Hello, World!\n".
 *
 * Refactor goals (behavior-preserving on the default execution path):
 *   1. Performance — all invariant work (response body encoding and its byte
 *      length) is computed ONCE at module load instead of on every request,
 *      and the status + headers are written with a single `res.writeHead(...)`
 *      call rather than a separate status assignment plus `res.setHeader(...)`.
 *   2. Code quality / testability — strict mode, a named exported request
 *      handler, an importable module surface, environment-overridable host/port
 *      (defaulting to the previous hardcoded values), a defensive server
 *      'error' handler, and a `require.main === module` guard so importing the
 *      module does not bind a port as a side effect.
 *   3. Optional multi-core scaling — opt-in via the WEB_CONCURRENCY environment
 *      variable. When unset (the default), the server runs as a single process
 *      and emits exactly one startup log line, preserving current behavior.
 *
 * The default-path response contract is byte-for-byte identical to the prior
 * implementation: HTTP 200, `Content-Type: text/plain`, `Content-Length: 14`,
 * body "Hello, World!\n", bound to 127.0.0.1:3000, with the startup log line
 * "Server running at http://127.0.0.1:3000/". Zero external dependencies — only
 * Node.js built-in modules are used.
 */

// Node.js core HTTP module (the `node:` prefix is behavior-identical to 'http'
// and makes the built-in origin explicit). This is the only module loaded on
// the default execution path.
const http = require('node:http');

// Network binding configuration. Reads from the environment so the bind target
// is configurable, while defaulting to the original hardcoded loopback values
// so the default behavior is unchanged.
const HOST = process.env.HOST || '127.0.0.1';

// Validate and coerce PORT from the environment. `process.env.PORT` is always a
// string (or undefined), and a bare `process.env.PORT || 3000` would only fall
// back to the default for falsy values (unset or empty string); a non-empty but
// invalid value such as "not-a-port" would be forwarded to server.listen(),
// where a non-numeric string is treated as a pipe path and fails to bind (e.g.
// EACCES) instead of falling back. Parsing once and range-checking guarantees
// the default 3000 is used for any unset, empty, non-numeric, non-integer, or
// out-of-range (outside 1-65535) value, while a valid TCP port overrides it.
// With PORT unset this yields exactly 3000, so the default behavior is unchanged.
const parsedPort = Number(process.env.PORT);
const PORT =
  Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535
    ? parsedPort
    : 3000;

// Precomputed, loop-invariant response payload. Encoding the fixed body to a
// Buffer once at module load removes the per-request UTF-8 string-to-bytes
// encoding and the implicit Content-Length computation from the hot path. The
// byte length (14) is likewise computed a single time.
const BODY = Buffer.from('Hello, World!\n');
const CONTENT_LENGTH = BODY.length;

/**
 * Handle an inbound HTTP request.
 *
 * Behavior is intentionally route-agnostic: the same response is returned for
 * every HTTP method and every path. The status line and all headers are
 * emitted in a single `writeHead` call, and the precomputed Buffer is sent
 * directly so no per-request encoding or length calculation occurs.
 *
 * @param {http.IncomingMessage} req - The inbound request (unused; the response
 *   is identical for all requests by design).
 * @param {http.ServerResponse} res - The outgoing response.
 */
function requestHandler(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Content-Length': CONTENT_LENGTH,
  });
  res.end(BODY);
}

// Create the server with the named handler.
const server = http.createServer(requestHandler);

// Defensive error handling. Without an 'error' listener, an operational error
// such as EADDRINUSE (port already in use) would be thrown as an uncaught
// exception and crash the process. This listener surfaces the failure on
// stderr without altering the success-path response contract.
server.on('error', (err) => {
  console.error(`Server error: ${err.message}`);
});

// Importable module surface: exporting the server instance and the handler
// lets tests require this file and exercise the handler without binding a port
// (the listen call below is guarded by `require.main === module`).
module.exports = { server, requestHandler };

// Executable entry point. Only runs when this file is executed directly
// (`node server.js`), never when it is imported via `require`.
if (require.main === module) {
  // Number of worker processes for optional multi-core scaling. Defaults to 0
  // (single process) when WEB_CONCURRENCY is unset or not a positive number.
  const workers = Number(process.env.WEB_CONCURRENCY) || 0;

  if (workers > 1) {
    // Opt-in clustering path. `node:cluster` and `node:os` are required lazily
    // here so the default single-process path loads nothing beyond `node:http`.
    // Workers share the listening socket; the OS distributes incoming
    // connections across them, so aggregate throughput scales across CPU cores
    // (a single Node process is bound to one core) while the per-response
    // contract is unchanged.
    const cluster = require('node:cluster');
    const os = require('node:os');

    if (cluster.isPrimary) {
      // Cap the worker pool at the number of logical CPUs. Forking more workers
      // than there are cores oversubscribes the CPU and degrades throughput
      // through context-switching, so a request for more workers than cores is
      // clamped to the core count. When WEB_CONCURRENCY is at most the core
      // count (the common case) this clamp is a no-op and exactly the requested
      // number of workers are forked.
      const workerCount = Math.min(workers, os.cpus().length);
      for (let i = 0; i < workerCount; i++) {
        cluster.fork();
      }
    } else {
      // Worker processes listen but intentionally do not log, so the startup
      // output is not duplicated per worker.
      server.listen(PORT, HOST);
    }
  } else {
    // Default single-process path. Emits exactly one startup log line, which
    // with the default HOST/PORT yields "Server running at http://127.0.0.1:3000/".
    server.listen(PORT, HOST, () => {
      console.log(`Server running at http://${HOST}:${PORT}/`);
    });
  }
}
