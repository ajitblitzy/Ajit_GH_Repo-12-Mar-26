'use strict';

// Shared expected-value constants — the single source of truth for all tests.
// Values are execution-verified against the running server.js. No logic, no requires.
module.exports = {
  statusCode: 200,
  contentType: 'text/plain',
  body: 'Hello, World!\n',
  contentLength: 14,
  host: '127.0.0.1',
  port: 3000,
  startupLog: 'Server running at http://127.0.0.1:3000/',
};
