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

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  } else {
    console.error(err);
  }
  process.exitCode = 1;
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
