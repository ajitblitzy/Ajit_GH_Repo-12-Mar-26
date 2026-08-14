/**
 * @file Minimal single-file Node.js HTTP service that answers every request with a
 * fixed plain-text response. This file is the entire application.
 * @module server
 * @description
 * The module declares no `module.exports`, so its observable interface is not a
 * JavaScript API but a network contract plus a single line on stdout:
 *
 * - Network contract: an HTTP listener bound to the loopback address
 *   `127.0.0.1:3000` answers every request - whatever its method or path - with
 *   `200`, `Content-Type: text/plain` and the 14-byte body `Hello, World!\n`.
 * - Readiness signal: one line reaches stdout once the bind succeeds,
 *   `Server running at http://127.0.0.1:3000/`, and it is the only lifecycle
 *   signal the process ever produces.
 *
 * Loopback binding means only clients on this host can reach the listener. There is
 * no routing, no configuration mechanism, no request logging, no authentication, no
 * TLS and no graceful shutdown: this module is a deliberately minimal HTTP test
 * fixture rather than a production service, and those absences are characteristics
 * of the fixture rather than defects handled here. Despite the repository name it
 * contains no machine-learning code.
 *
 * The only dependency is the Node.js core `http` module, so nothing has to be
 * installed before the service can run.
 * @requires module:http
 * @see README.md for the full API contract, the setup and deployment guide, the
 * configuration reference and troubleshooting of the known failure modes.
 * @example
 * // Start the service from the repository root:
 * node server.js
 * // stdout: Server running at http://127.0.0.1:3000/
 *
 * // Then call the single catch-all endpoint from the same host:
 * curl -i http://127.0.0.1:3000/
 * // HTTP/1.1 200 OK
 * // Content-Type: text/plain
 * // Content-Length: 14
 * //
 * // Hello, World!
 */
const http = require('http');  // Node.js core module, so no dependency installation is required.

/**
 * Hostname the HTTP listener binds to.
 *
 * `127.0.0.1` is the IPv4 loopback address, so the listener is reachable only from
 * processes on this same host; callers on another host or in another container cannot
 * connect, by design. The value is hard-coded - there is no environment variable,
 * configuration file or command-line override - so changing the bind address means
 * editing this declaration.
 * @constant {string} hostname
 * @default '127.0.0.1'
 */
const hostname = '127.0.0.1';  // Loopback binding restricts reachability to processes on the same host.

/**
 * TCP port the HTTP listener binds to.
 *
 * Fixed in source with no override mechanism, so changing it means editing this
 * declaration. If another listener already holds the port, the bind below fails and
 * the process terminates.
 * @constant {number} port
 * @default 3000
 */
const port = 3000;  // Fixed port; the process cannot start if another listener already holds it.

/**
 * The HTTP server instance, created with its request listener attached.
 *
 * The listener answers every request identically - same status, same header, same
 * body - for every HTTP method and every path. It never inspects `req`: neither
 * `req.method` nor `req.url` is read, so there is no routing, no 404 path and no
 * method rejection. `GET /`, `GET /any/arbitrary/path`, `POST /` and `DELETE /foo`
 * all return `200` with the same 14-byte `text/plain` body.
 * @constant {http.Server} server
 * @param {http.IncomingMessage} req Inbound request. Never inspected by this
 * listener; it is present only because `http.createServer` supplies it.
 * @param {http.ServerResponse} res Outbound response, used to set the status code and
 * the `Content-Type` header and to write the fixed body.
 * @returns {void} Nothing is returned; the listener's effect is the written response.
 */
const server = http.createServer((req, res) => {
  res.statusCode = 200;                        // Status is set before any body is written.
  res.setHeader('Content-Type', 'text/plain'); // Plain text, not markup - clients must not expect HTML.
  res.end('Hello, World!\n');                  // Writes the body and ends the response in one call.
});

/**
 * Readiness callback passed to `server.listen` below.
 *
 * It takes no arguments, runs once the bind has succeeded, and writes exactly one
 * line to stdout: `Server running at http://127.0.0.1:3000/`.
 * @callback ListeningCallback
 * @listens http.Server#event:listening
 * @returns {void} Nothing is returned; the callback's effect is the logged line.
 */

/**
 * Binds `server` to `port` on `hostname` and starts accepting connections. This is
 * the module's only startup action, and it is what keeps the process alive.
 *
 * A failed bind is not handled: no `'error'` listener is registered, so the failure
 * surfaces as an unhandled `'error'` event and terminates the process. Starting a
 * second instance while the port is held exits with
 * `Error: listen EADDRINUSE: address already in use 127.0.0.1:3000`.
 * @param {number} port TCP port to bind; passed first.
 * @param {string} hostname Interface to bind; passed second.
 * @param callback Readiness callback passed third; see ListeningCallback above.
 * @throws Unhandled `'error'` event when the bind fails - `EADDRINUSE` when the port
 * is already held - which terminates the process instead of being recovered from.
 */
server.listen(port, hostname, () => {  // Argument order: port, then host, then readiness callback.
  // The template literal reuses the bind constants, so the logged URL always matches the listen address.
  console.log(`Server running at http://${hostname}:${port}/`);
});
