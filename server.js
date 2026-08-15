/**
 * @file Minimal single-file Node.js HTTP service that answers requests with one
 * fixed plain-text response. This file is the entire application.
 * @module server
 * @description
 * The module declares no `module.exports`, so its observable interface is not a
 * JavaScript API but a network contract plus a single line on stdout:
 *
 * - Network contract: an HTTP listener bound to the loopback address
 *   `127.0.0.1:3000` answers every request Node.js hands to its request handler
 *   with the same fixed plain-text response, whatever the method and whatever the
 *   path.
 * - Readiness log: `Server running at http://127.0.0.1:3000/` reaches stdout once
 *   the bind succeeds.
 *
 * This module is a deliberately minimal HTTP test fixture rather than a production
 * service. The service uses only Node.js's core `http` module, so no package
 * installation is required once Node.js is available.
 * @requires module:http
 * @see README.md for the full HTTP contract and the request shapes Node.js
 * resolves itself, the configuration reference, the setup and deployment guide,
 * the troubleshooting of the known failure modes, and the limitations and
 * non-goals.
 * @example
 * node server.js
 * // Then, from another shell on the same host:
 * curl -i http://127.0.0.1:3000/
 */
const http = require('http');  // Node.js core module, so no dependency installation is required.

/**
 * Hostname the HTTP listener binds to.
 *
 * `127.0.0.1` is the IPv4 loopback address, so the listener is reachable only from
 * processes on this same host. The value is hard-coded with no override, so changing
 * the bind address means editing this declaration.
 * @constant {string} hostname
 * @default '127.0.0.1'
 */
const hostname = '127.0.0.1';  // Loopback binding restricts reachability to processes on the same host.

/**
 * TCP port the HTTP listener binds to.
 *
 * Hard-coded with no override, so changing it means editing this declaration. If
 * another listener already holds the port, the bind below fails.
 * @constant {number} port
 * @default 3000
 */
const port = 3000;  // Fixed port; the process cannot start if another listener already holds it.

/**
 * The HTTP server instance, created with its request handler attached.
 *
 * The handler never inspects `req`: neither `req.method` nor `req.url` is read, so
 * this module has no routing, no 404 path and no method rejection, and every method
 * and every path it is handed gets the same response. Node.js answers a few request
 * shapes without invoking this handler, and suppresses the body of a `HEAD` reply
 * after it runs; README.md tabulates those documented exceptions.
 * @constant {http.Server} server
 * @param {http.IncomingMessage} req Inbound request. Never inspected by this
 * handler; it is present only because `http.createServer` supplies it.
 * @param {http.ServerResponse} res Outbound response, used to set the status code and
 * the `Content-Type` header and to write the fixed body.
 * @returns {void} Nothing is returned; the handler's effect is the written response.
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
 * The call is asynchronous and does not throw when the bind fails: the failure is
 * reported afterwards, as an `'error'` event on the server, so it cannot be caught
 * around this call. No `'error'` listener is registered here, which leaves that
 * event unhandled and ends the process - README.md documents the failure modes.
 * @function listen
 * @memberof module:server~server
 * @param {number} port TCP port to bind; passed first.
 * @param {string} hostname Interface to bind; passed second.
 * @param {module:server~ListeningCallback} callback Readiness callback; passed third.
 * @returns {http.Server} The same server instance, which this module discards because
 * nothing is chained onto the call.
 * @fires http.Server#event:error
 * @see module:server~ListeningCallback
 */
server.listen(port, hostname, () => {  // Argument order: port, then host, then readiness callback.
  // The template literal reuses the bind constants, so the logged URL always matches the listen address.
  console.log(`Server running at http://${hostname}:${port}/`);
});
