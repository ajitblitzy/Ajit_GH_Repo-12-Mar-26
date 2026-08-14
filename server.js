/**
 * @file Minimal single-file Node.js HTTP service that answers requests with one
 * fixed plain-text response. This file is the entire application.
 * @module server
 * @description
 * The module declares no `module.exports`, so its observable interface is not a
 * JavaScript API but a network contract plus a single line on stdout:
 *
 * - Network contract: an HTTP listener bound to the loopback address
 *   `127.0.0.1:3000` answers every request Node.js hands to its request listener -
 *   whatever the method, whatever the path - with `200`,
 *   `Content-Type: text/plain` and the 14-byte body `Hello, World!\n`. A few
 *   request shapes are resolved by the runtime instead, so they are documented
 *   exceptions to that uniformity rather than behavior of this module: a `HEAD`
 *   request reaches the listener but Node.js suppresses its body, an unsupported
 *   `Expect` value (`417`) and a malformed request line (`400`) are answered by
 *   Node.js before the listener runs, and a `CONNECT` request is closed with no
 *   response because no `'connect'` listener is registered. README.md tabulates
 *   each exception with its observed response.
 * - Readiness log: one line reaches stdout once the bind succeeds,
 *   `Server running at http://127.0.0.1:3000/`. It is the only log this module
 *   authors and the only output of a successful run - nothing is written per
 *   request and nothing on shutdown - and it records startup rather than
 *   continuing liveness, because it is written once and never repeated. A failed
 *   bind is the exception: Node.js itself writes an unhandled-`'error'`
 *   diagnostic to stderr and the process ends.
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
 * // (abridged: Node.js also sets Date, Connection and Keep-Alive on that response)
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
 * The listener never inspects `req`: neither `req.method` nor `req.url` is read, so
 * this module has no routing, no 404 path and no method rejection, and it runs the
 * same three statements for every request Node.js hands it. `GET /`,
 * `GET /any/arbitrary/path`, `POST /` and `DELETE /foo` were each observed returning
 * `200` with the same 14-byte `text/plain` body.
 *
 * That uniformity describes this listener, not everything a client can observe,
 * because Node.js resolves some request shapes itself: a `HEAD` request runs the
 * listener but its body is suppressed (`200` and the header, zero bytes), an
 * unsupported `Expect` value is answered `417` and a malformed request line `400`
 * without the listener running at all, and a `CONNECT` request is closed with no
 * response. README.md carries the exception table and its transcripts.
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
 * surfaces as an unhandled `'error'` event, which Node.js reports on stderr before
 * terminating the process. Starting a second instance while the port is held exits
 * with `Error: listen EADDRINUSE: address already in use 127.0.0.1:3000`.
 * @function listen
 * @memberof module:server~server
 * @param {number} port TCP port to bind; passed first.
 * @param {string} hostname Interface to bind; passed second.
 * @param {module:server~ListeningCallback} callback Readiness callback; passed third.
 * @returns {http.Server} The same server instance, which this module discards because
 * nothing is chained onto the call.
 * @throws {Error} Unhandled `'error'` event when the bind fails - `EADDRINUSE` when
 * the port is already held - which terminates the process instead of being recovered
 * from.
 * @see module:server~ListeningCallback
 */
server.listen(port, hostname, () => {  // Argument order: port, then host, then readiness callback.
  // The template literal reuses the bind constants, so the logged URL always matches the listen address.
  console.log(`Server running at http://${hostname}:${port}/`);
});
