'use strict';

/**
 * Minimal, zero-dependency Node.js HTTP server.
 *
 * Behavior contract (DEFAULT path, no environment variables set) is preserved
 * byte-for-byte from the original implementation:
 *   - HTTP 200 OK
 *   - Content-Type: text/plain
 *   - Content-Length: 14
 *   - Body: "Hello, World!\n" (14 bytes)
 *   - Route-agnostic: the same response for ANY method and ANY path
 *   - Default bind: 127.0.0.1:3000
 *   - Startup log: "Server running at http://127.0.0.1:3000/"
 *
 * Performance/quality refactor (all behavior-neutral on the default path):
 *   - The response body Buffer and its byte length are precomputed ONCE at
 *     module load, removing per-request UTF-8 encoding and length computation
 *     from the hottest code path (the request handler).
 *   - Status and headers are written in a single res.writeHead() call.
 *   - The handler is a named, exported function and the server is exported,
 *     so the module can be imported for testing WITHOUT binding a port.
 *   - HOST/PORT are environment-overridable with defaults that reproduce the
 *     original hardcoded values exactly.
 *   - Optional, opt-in multi-core scaling via the cluster module, gated strictly
 *     on the WEB_CONCURRENCY environment variable (default: single process).
 *   - A defensive 'error' listener handles failures (e.g. EADDRINUSE) gracefully
 *     instead of crashing on an unhandled error event.
 *
 * Module system: CommonJS (require). Dependencies: Node.js built-ins only.
 */

// Phase A — Node.js core HTTP module (the `node:` scheme is behavior-identical
// to `'http'` and makes the built-in origin explicit).
const http = require('node:http');

// Phase B — Configuration. Reading from the environment makes host/port
// configurable; the `|| default` fallbacks reproduce the original hardcoded
// 127.0.0.1:3000 exactly when the variables are unset.
const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3000;

// Phase C — Precomputed, loop-invariant response payload. Encoding the fixed
// body to bytes once at module load (instead of on every request) eliminates
// repeated UTF-8 encoding and Content-Length computation from the hot path.
// The produced bytes are identical to passing the string to res.end().
const BODY = Buffer.from('Hello, World!\n');
const CONTENT_LENGTH = BODY.length; // === 14

/**
 * Phase D — Request handler.
 *
 * Responds identically to every request regardless of HTTP method or URL path
 * (the server's route-agnostic contract). A single writeHead() collapses the
 * former statusCode assignment + setHeader() call into one header-block write,
 * and the precomputed Buffer is sent directly so no per-request encoding or
 * length computation occurs.
 *
 * @param {http.IncomingMessage} req - The inbound request (unused; intentionally
 *   ignored to keep behavior route-agnostic).
 * @param {http.ServerResponse} res - The outbound response.
 */
function requestHandler(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Length': CONTENT_LENGTH });
  res.end(BODY);
}

// Phase E — Create the server and attach a defensive error handler. The handler
// is observable ONLY on failure (e.g. the port is already in use); it does not
// alter the success-path response. Without it, an 'error' event such as
// EADDRINUSE would be thrown and crash the process.
const server = http.createServer(requestHandler);

server.on('error', (err) => {
  console.error(`Server error: ${err.message}`);
});

// Phase F — Export the module surface so tests can import the handler and the
// server WITHOUT the side effect of binding a port (see the require.main guard
// below). This is the standard Node.js idiom for a testable server.
module.exports = { server, requestHandler };

// Phase G — Executable entry point. When this file is run directly (not imported)
// it starts listening. Multi-core scaling is OPT-IN and gated strictly on
// WEB_CONCURRENCY: when it is unset or <= 1 the server stays single-process and
// prints exactly one startup log line, preserving the original behavior exactly.
if (require.main === module) {
  const workers = Number(process.env.WEB_CONCURRENCY) || 0;

  if (workers > 1) {
    // Multi-process mode: the primary forks workers that share the listening
    // socket; each worker listens silently so the startup log is not duplicated.
    // `node:cluster` is required only here so the default path loads nothing extra.
    const cluster = require('node:cluster');

    if (cluster.isPrimary) {
      for (let i = 0; i < workers; i++) {
        cluster.fork();
      }
    } else {
      server.listen(PORT, HOST);
    }
  } else {
    // Default single-process mode — reproduces the original startup behavior,
    // including the exact single startup log line.
    server.listen(PORT, HOST, () => {
      console.log(`Server running at http://${HOST}:${PORT}/`);
    });
  }
}
