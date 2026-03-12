const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  try {
    // Only allow GET method
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed\n');
      return;
    }
    // Only serve the root path
    if (req.url !== '/') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found\n');
      return;
    }
    // Valid request: serve the Hello World response
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello, World!\n');
  } catch (err) {
    // Catch any unexpected error in the handler
    console.error('Request handler error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error\n');
    }
  }
});

// Configure server timeouts for resource cleanup
server.keepAliveTimeout = 5000;
server.headersTimeout = 60000;

// Handle malformed client connections
server.on('clientError', (err, socket) => {
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

// Handle server-level errors (e.g., port already in use)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use.`);
  } else {
    console.error(`Server error: ${err.message}`);
  }
  process.exit(1);
});

// Graceful shutdown: stop accepting new connections, drain existing
let isShuttingDown = false;
function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed. All connections drained.');
    process.exit(0);
  });
  // Force exit after 5 seconds if connections won't drain
  setTimeout(() => {
    console.error('Forced shutdown: connections did not drain in time.');
    process.exit(1);
  }, 5000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Last-resort safety nets for uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});
