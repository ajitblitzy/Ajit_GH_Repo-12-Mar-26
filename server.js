// server.js - a tiny web server that replies "Hello, World!" to every request.
// Run it with: node server.js
// It prints a confirmation line naming http://127.0.0.1:3000/ and then serves that address.
// Load Node's built-in http module so a web server can be created.
const http = require('http');

// The address the server listens on - this machine only.
const hostname = '127.0.0.1';
// The port the server listens on.
const port = 3000;

// Create the server; the function below runs once for each incoming request.
const server = http.createServer((req, res) => {
  // Reply with status 200, which means "OK".
  res.statusCode = 200;
  // Tell the client the reply is plain text, not HTML.
  res.setHeader('Content-Type', 'text/plain');
  // Send the body "Hello, World!" and end the reply.
  res.end('Hello, World!\n');
});

// Start listening on the host and port set above.
server.listen(port, hostname, () => {
  // Print a confirmation line once the server is ready.
  console.log(`Server running at http://${hostname}:${port}/`);
});
