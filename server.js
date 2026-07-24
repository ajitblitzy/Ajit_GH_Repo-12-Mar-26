const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.end('Hello, World!\n');
});

server.headersTimeout = 10000;
server.requestTimeout = 30000;
server.timeout = 30000;
server.keepAliveTimeout = 5000; // preserves observed "Keep-Alive: timeout=5"

// Coordinate a single, deterministic shutdown so cleanup runs at most once regardless of how
// many times it is triggered (repeated signals, or a fatal error arriving after a signal).
let shuttingDown = false;

// Shared, state-guarded shutdown path used by both process signals and fatal server errors.
// It closes the listening handle at most once, surfaces (does not swallow) close-callback
// errors, preserves any already-set nonzero exit code, and never forces process.exit() on the
// graceful path so buffered output/cleanup can drain and the event loop can exit naturally.
const shutdown = () => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  // If the server never reached the listening state (e.g., a bind failure such as EADDRINUSE),
  // there is no handle to release; retain the current exit code and allow a natural exit.
  if (!server.listening) {
    return;
  }

  server.close((err) => {
    if (err) {
      // e.g. ERR_SERVER_NOT_RUNNING, or any unexpected close failure -> report as cleanup failure.
      console.error(err);
      process.exitCode = 1;
    }
  });
};

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  } else {
    console.error(err);
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
  if (err.code === 'ECONNRESET' || !socket.writable) {
    // The socket is reset or no longer writable; nothing can be sent, so just tear it down.
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

  socket.end(
    `${statusLine}\r\n` +
    'Connection: close\r\n' +
    'X-Content-Type-Options: nosniff\r\n' +
    'X-Frame-Options: DENY\r\n' +
    "Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'\r\n" +
    'Referrer-Policy: no-referrer\r\n' +
    'Cross-Origin-Resource-Policy: same-origin\r\n' +
    '\r\n'
  );
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
