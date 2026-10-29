const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

// The added response-header policy, kept as one declaration so the whole of it is auditable.
// X-Content-Type-Options is the only header with an effect on this service: a text/plain body
// is what MIME sniffing can reinterpret as active content, whereas the framing, referrer,
// cross-origin and permissions headers govern a document this service never returns.
const responseHeaders = Object.freeze({ 'X-Content-Type-Options': 'nosniff' });

const server = http.createServer({ connectionsCheckingInterval: 1000 }, (req, res) => {
  for (const [name, value] of Object.entries(responseHeaders)) {
    res.setHeader(name, value);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, World!\n');
});

// Incomplete-request timeouts are swept on the connectionsCheckingInterval option above rather
// than evaluated per socket, so that interval is what makes this window real: with the default
// 30-second sweep the same timeout is enforced only to within 30 seconds of it.
server.headersTimeout = 10000;

// Attaching a listener replaces Node's fatal default for every server error, so this handler
// has to supply the termination that default provided. It reports the error code alone: the
// default diagnostic also printed the stack, errno, syscall, address and port, disclosing the
// bind target and the internals of the runtime.
server.on('error', (err) => {
  console.error(`Server error: ${err.code}`);
  process.exitCode = 1;

  if (!server.listening) return;

  // close() stops further accepts but waits on active and upgraded connections, so one held
  // connection would keep the process alive indefinitely; closeAllConnections() plus the
  // forced exit bound this branch to the outcome the fatal default produced.
  server.close();
  server.closeAllConnections();
  setTimeout(() => process.exit(1), 1000);
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
