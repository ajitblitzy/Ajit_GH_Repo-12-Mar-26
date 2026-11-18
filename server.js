// A standalone Node HTTP server: on 127.0.0.1 port 3000 it answers every
// request, whatever the method, path, headers or body, with status 200,
// Content-Type text/plain and the body "Hello, World!" plus one line feed.
// Start it with 'node server.js'.  Nothing in welcome.py, the test suite or
// README.md refers to this file.
const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, World!\n');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
