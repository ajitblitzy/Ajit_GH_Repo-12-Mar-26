const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

// Single, immutable source of truth for the security response headers. Defining the policy
// exactly once and reusing it for (a) the ServerResponse header mechanism below and (b) the raw
// parser-error serialization guarantees the two response paths cannot drift, and eliminates the
// header-literal duplication that previously existed between them.
const SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
});

// Pre-serialized CRLF form of the same policy, used only on the raw parser-error path where the
// response is written directly to the socket and no ServerResponse object exists.
const SECURITY_HEADERS_RAW = Object.keys(SECURITY_HEADERS)
  .map((name) => `${name}: ${SECURITY_HEADERS[name]}\r\n`)
  .join('');

// Custom ServerResponse that injects the five security headers into EVERY response object Node
// constructs, at the single moment the headers are written. writeHead() is the one choke point:
// the request handler's implicit header flush reaches it via _implicitHeader(), and Node's
// automatic responses -- a 400 for a missing Host header, a 417 for an unsupported Expect value --
// construct a ServerResponse and call writeHead() directly, bypassing the request handler. Applying
// the policy here is therefore the single authoritative mechanism that hardens the normal 200 path
// and every automatic ServerResponse path alike, with no duplicated header literals. Headers a
// caller already set (e.g. Content-Type) are left untouched, preserving their emitted order.
class HardenedServerResponse extends http.ServerResponse {
  writeHead(...args) {
    if (!this.headersSent) {
      const names = Object.keys(SECURITY_HEADERS);
      for (let i = 0; i < names.length; i++) {
        if (!this.hasHeader(names[i])) {
          this.setHeader(names[i], SECURITY_HEADERS[names[i]]);
        }
      }
    }
    return super.writeHead(...args);
  }
}

// Emit safe, structured operational diagnostics without serializing the full Error stack or
// internal execution frames, which would otherwise disclose implementation details (CWE-200).
const logError = (err) => {
  const safe = {};
  if (err && err.code !== undefined) safe.code = err.code;
  if (err && err.message !== undefined) safe.message = err.message;
  if (err && err.syscall !== undefined) safe.syscall = err.syscall;
  if (err && err.address !== undefined) safe.address = err.address;
  if (err && err.port !== undefined) safe.port = err.port;
  console.error(safe);
};

// The request handler stays uniform and method/path-agnostic. The five security headers are no
// longer set here individually -- they are applied centrally by HardenedServerResponse.writeHead
// above, which also covers Node's automatic responses. Setting Content-Type first preserves the
// exact response header order (Content-Type, then the five security headers).
const server = http.createServer({ ServerResponse: HardenedServerResponse }, (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, World!\n');
});

server.headersTimeout = 10000;
server.requestTimeout = 30000;
server.timeout = 30000;
server.keepAliveTimeout = 5000; // preserves observed "Keep-Alive: timeout=5"

// Coordinate a single, deterministic shutdown so cleanup runs at most once regardless of how
// many times it is triggered (repeated signals, or a fatal error arriving after a signal).
let shuttingDown = false;

// Records a shutdown that is requested before the server has reached the 'listening' state
// (the brief startup window between server.listen() and the 'listening' event). Such a request
// has no open handle to close yet; it is remembered here and honored by the listen callback the
// instant the server becomes listening, so an early SIGTERM/SIGINT is never lost and the service
// cannot remain listening after a shutdown was requested.
let shutdownRequested = false;

// Shared, state-guarded shutdown path used by both process signals and fatal server errors.
// It closes the listening handle at most once, surfaces (does not swallow) close-callback
// errors, preserves any already-set nonzero exit code, and never forces process.exit() on the
// graceful path so buffered output/cleanup can drain and the event loop can exit naturally.
const shutdown = () => {
  // Record the request unconditionally so a signal received during the startup window is not
  // dropped; the listen callback re-invokes shutdown() once a handle exists.
  shutdownRequested = true;

  if (shuttingDown) {
    return;
  }

  // If the server has not yet reached the listening state (e.g., a signal during the startup
  // window, or a bind failure such as EADDRINUSE), there is no handle to release yet. Leave
  // shuttingDown unset so the deferred request can still complete: on the startup-window path the
  // listen callback calls shutdown() again once listening; on a bind failure the process exits
  // naturally with the exit code already set by the error handler.
  if (!server.listening) {
    return;
  }

  shuttingDown = true;

  server.close((err) => {
    if (err) {
      // e.g. ERR_SERVER_NOT_RUNNING, or any unexpected close failure -> report as cleanup failure.
      // Use the safe logger so no full Error stack / internal frames are disclosed (CWE-200).
      logError(err);
      process.exitCode = 1;
    }
  });
};

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  } else {
    // Safe structured diagnostics only -- never the full Error stack / internals (CWE-200).
    logError(err);
  }
  process.exitCode = 1;

  // A pre-listen failure (e.g., EADDRINUSE) has no listening handle to close, so we retain the
  // nonzero exit code and let the process exit naturally. An error raised while the server is
  // already listening must stop accepting work and close deterministically through the guarded
  // shutdown path rather than leaving the process listening in an invalid state.
  if (server.listening) {
    shutdown();
  }
});

// Node-generated parser/timeout responses (malformed request, header/request timeout, oversized
// headers) bypass the request handler above, so without this listener they would be returned by
// Node without any of the hardening headers. Mirror Node's built-in status selection and attach
// the same five security headers (plus Connection: close) so every service response is hardened.
// Attaching this listener suppresses Node's default socket teardown, so this handler fully owns
// writing the fixed, no-body response and closing the socket. The normal 200 path is untouched.
server.on('clientError', (err, socket) => {
  // Only emit a fixed error response when it is safe AND no response has begun on this socket.
  // If a normal response has already started (bytesWritten > 0) or an in-flight ServerResponse has
  // already sent its headers, appending a second status line would desynchronize the HTTP stream
  // (CWE-444: the client would receive the normal 200 followed by a spurious 4xx). If the socket
  // is reset or no longer writable, nothing can be sent. In every such case we simply destroy the
  // socket, mirroring Node core's write-and-destroy ownership of error responses.
  const inflight = socket._httpMessage;
  const responseStarted = socket.bytesWritten > 0 || (inflight && inflight.headersSent);
  if (err.code === 'ECONNRESET' || !socket.writable || responseStarted) {
    socket.destroy();
    return;
  }

  let statusLine;
  switch (err.code) {
    case 'HPE_HEADER_OVERFLOW':
      statusLine = 'HTTP/1.1 431 Request Header Fields Too Large';
      break;
    case 'HPE_CHUNK_EXTENSIONS_OVERFLOW':
      statusLine = 'HTTP/1.1 413 Payload Too Large';
      break;
    case 'ERR_HTTP_REQUEST_TIMEOUT':
      statusLine = 'HTTP/1.1 408 Request Timeout';
      break;
    default:
      statusLine = 'HTTP/1.1 400 Bad Request';
      break;
  }

  // Write the fixed, hardened, no-body response reusing the single header policy, then explicitly
  // destroy the socket once the bytes have flushed. socket.end() alone leaves a malicious half-open
  // (allowHalfOpen) peer writable and retains the server socket handle (CWE-400 / CWE-772), which
  // can stall a SIGTERM shutdown; destroying after the flush releases the handle deterministically
  // while still delivering the complete response.
  socket.end(
    `${statusLine}\r\n` +
    'Connection: close\r\n' +
    SECURITY_HEADERS_RAW +
    '\r\n',
    () => socket.destroy()
  );
});

server.listen(port, hostname, () => {
  // Honor a shutdown signal that arrived during the startup window (before 'listening') BEFORE
  // logging readiness. Now that the handle exists, shutdown() closes it immediately and
  // deterministically; returning here guarantees we never emit a false "Server running" readiness
  // line for a server that is about to close, and that the server does not stay listening after an
  // early signal.
  if (shutdownRequested) {
    shutdown();
    return;
  }

  // Normal successful startup that will remain available: preserve the exact readiness line.
  console.log(`Server running at http://${hostname}:${port}/`);
});

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
