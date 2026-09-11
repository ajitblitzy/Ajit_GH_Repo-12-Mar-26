/**
 * @file Minimal single-file Node.js HTTP service. It opens one listener on the IPv4
 * loopback interface and answers every inbound request with the same fixed plain-text
 * greeting. There is no routing, no request inspection, no persistence, and no state
 * carried from one request to the next.
 *
 * Dependencies: exactly one, the `http` module required immediately below. It is a Node.js
 * built-in -- bundled with the runtime rather than installed from a registry -- so this
 * repository has zero third-party dependencies, no `package.json` and no lockfile.
 *
 * Run it from the repository root with:
 *
 * ```bash
 * node server.js
 * ```
 *
 * There is deliberately no `npm start` to reach for: an npm script would require a
 * `package.json`, and none exists here.
 *
 * Nothing in this file assigns to `module.exports`, so `require('./server')` returns an
 * empty object and is never a useful way to consume it. Loading the module binds the
 * socket as a side effect while handing the caller no handle on the server it just
 * started, so run this file as a process rather than importing it.
 *
 * @see docs/README.md Documentation hub for this repository.
 */

const http = require('http');

/**
 * Bind address for the listener: the IPv4 loopback literal `127.0.0.1`.
 *
 * Loopback restricts reachability to the machine this process runs on. A client on another
 * host, in another container, or in another network namespace cannot reach the service at
 * all -- the connection fails to establish rather than coming back as an HTTP error, so
 * there is no status code to read and nothing server-side to inspect. This is the most
 * consequential operational property declared anywhere in the file.
 *
 * The value is a hardcoded literal. Nothing in this file reads `process.env`, so no
 * environment variable, command-line flag or configuration file can override it; moving
 * the service off loopback means editing this line and accepting the wider network
 * exposure that follows.
 *
 * Read in exactly two places: the `server.listen(...)` bind call below, and the readiness
 * line that the Listen Readiness Callback writes to stdout.
 *
 * @constant {string}
 * @see docs/configuration.md How to change this value and what changes when you do.
 */
const hostname = '127.0.0.1';

/**
 * TCP port for the listener: the literal `3000`.
 *
 * Hardcoded in the same manner as the bind address, with no `process.env` fallback, so the
 * only way to move the service to a different port is to edit this line.
 *
 * Collision behaviour is abrupt and worth knowing before it is encountered. If another
 * process already holds this port the bind fails and the process terminates with exit
 * code 1, after reporting:
 *
 * ```text
 * Error: listen EADDRINUSE: address already in use 127.0.0.1:3000
 * ```
 *
 * That failure is fatal rather than merely reported because this file registers no
 * `'error'` listener on the server, which leaves the `'error'` event unhandled. There is
 * no retry, no fallback port and no diagnostic of the file's own making.
 *
 * Read in exactly two places: the `server.listen(...)` bind call below, and the readiness
 * line written to stdout.
 *
 * @constant {number}
 * @see docs/configuration.md How to change this value and what changes when you do.
 * @see docs/troubleshooting.md Diagnosing the EADDRINUSE termination described above.
 */
const port = 3000;

/**
 * The **Request Handler Callback**, registered as the sole argument to
 * `http.createServer(...)` on the line below. That registration makes it the listener for
 * the server's `'request'` event, so it is invoked once per inbound request for as long as
 * the process lives.
 *
 * It answers every request identically, in three unconditional statements with no
 * branching of any kind: it sets the status to `200`, sets `Content-Type` to `text/plain`
 * (deliberately with no `charset` parameter), and ends the response with the body
 * `Hello, World!\n` -- 14 bytes, being 13 printable characters plus one trailing LF. The
 * response is completed before the callback returns, so nothing is left pending.
 *
 * `Content-Type` is the only header this code sets. `Content-Length: 14` is derived by the
 * runtime from the `res.end()` payload, and `Date`, `Connection: keep-alive` and
 * `Keep-Alive: timeout=5` are injected by the runtime as well -- an integrator should read
 * those four as runtime behaviour rather than as a contract this file states. A `HEAD`
 * request is answered with `200` and a zero-byte body for that same reason: the runtime
 * suppresses response bodies for `HEAD`, not this handler, which cannot tell one method
 * from another.
 *
 * Implements F-002 Uniform HTTP Response Handler.
 *
 * @callback RequestHandlerCallback
 * @param {import('http').IncomingMessage} req The inbound request. It is **never read**:
 *   nothing here touches `req.url`, `req.method`, `req.headers` or the request body, and
 *   the body is never consumed or drained. Every surprise this service holds follows from
 *   that one omission -- an unknown path returns the greeting instead of a `404`, an
 *   unexpected method returns it instead of a `405`, `/favicon.ico` returns it instead of
 *   an icon, and `Accept: text/html` still returns `text/plain` because no content
 *   negotiation, routing, parsing, validation or authentication takes place at all.
 * @param {import('http').ServerResponse} res The outbound response, and the only one of
 *   the two parameters this callback actually uses. All three statements in the body write
 *   to it.
 * @returns {void} The body contains no `return` statement, and the emitter that invokes it
 *   discards the result.
 * @see docs/api-reference/functions/request-handler-callback.md Dedicated reference page
 *   for this callback.
 */
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, World!\n');
});

/**
 * The **Listen Readiness Callback**. `server.listen(...)` on the line below takes it as
 * its third argument, and the runtime registers it as a one-shot `'listening'` listener.
 * It runs once the socket is bound and accepting connections, and it runs at most once:
 * nothing in this file ever re-binds the server, so there is no second invocation to
 * account for.
 *
 * Its entire effect is a single line on stdout, written with `console.log` from a template
 * literal that interpolates the `hostname` and `port` constants declared above. Reading
 * those two bindings rather than repeating their values is what keeps the message
 * trustworthy -- it always names the address that was actually bound, even if the
 * constants are edited. As they currently stand it prints exactly:
 *
 * ```text
 * Server running at http://127.0.0.1:3000/
 * ```
 *
 * That line is this process's only readiness signal and its only observability output of
 * any kind. There is no health endpoint, no readiness probe, no structured logging and no
 * metrics, so seeing it is the sole confirmation that startup succeeded.
 *
 * The negative case matters more here than the positive one: if the bind fails, this
 * callback never executes at all. The server emits `'error'` instead of `'listening'`,
 * that event has no listener anywhere in this file, and the process is torn down before
 * the callback could be reached. An absent readiness line therefore means the socket was
 * never bound -- never that the logging itself went wrong.
 *
 * Implements F-003 Startup Readiness Logging.
 *
 * @callback ListenReadinessCallback
 * @returns {void} Invoked with no arguments whatsoever -- zero arity. In particular this
 *   is not Node's error-first `(err, result)` convention: the readiness callback of
 *   `listen` is handed nothing, there is no `err` parameter to inspect, and a bind failure
 *   surfaces through the unhandled `'error'` event described above rather than through an
 *   argument to this function.
 * @see docs/api-reference/functions/listen-readiness-callback.md Dedicated reference page
 *   for this callback.
 */
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
