/**
 * @file Minimal single-file Node.js HTTP service. It opens one listener on the IPv4
 * loopback interface and answers ordinary inbound requests with the same fixed plain-text
 * greeting. There is no routing, no request inspection, no persistence, and no state
 * carried from one request to the next.
 *
 * Dependencies: exactly one, the <code>http</code> module required immediately below. It is
 * a Node.js built-in -- bundled with the runtime rather than installed from a registry --
 * so this repository has zero third-party dependencies, no <code>package.json</code> and no
 * lockfile.
 *
 * Run it from the repository root with:
 *
 * <pre>node server.js</pre>
 *
 * There is deliberately no <code>npm start</code> to reach for: an npm script would require
 * a <code>package.json</code>, and none exists here.
 *
 * Nothing in this file assigns to <code>module.exports</code>, so
 * <code>require('./server')</code> returns an empty object and is never a useful way to
 * consume it. Loading the module binds the socket as a side effect while handing the caller
 * no handle on the server it just started, so run this file as a process rather than
 * importing it.
 *
 * @see <a href="docs/README.md">Documentation hub for this repository</a>
 */

const http = require('http');

/**
 * Bind address for the listener: the IPv4 loopback literal <code>127.0.0.1</code>.
 *
 * Loopback restricts reachability to this machine's own network namespace. A client on
 * another host, or in a separate network namespace -- an ordinarily networked container
 * among them -- cannot reach the service at all: the connection fails to establish rather
 * than coming back as an HTTP error, so there is no status code to read and nothing
 * server-side to inspect. Container membership is not by itself what decides that, and a
 * container sharing the host's network namespace is the case that shows why -- it sits
 * inside the same namespace, so it reaches this listener exactly as any other local process
 * does. This is the most consequential operational property declared anywhere in the file.
 *
 * The value is a hardcoded literal. Nothing in this file reads <code>process.env</code>, so
 * no environment variable, command-line flag or configuration file can override it; moving
 * the service off loopback means editing this line and accepting the wider network exposure
 * that follows.
 *
 * Read in exactly two places: the <code>server.listen(...)</code> bind call below, and the
 * readiness line that the Listen Readiness Callback writes to stdout.
 *
 * @constant {string}
 * @see <a href="docs/configuration.md">How to change this value and what changes when you
 *   do</a>
 */
const hostname = '127.0.0.1';

/**
 * TCP port for the listener: the literal <code>3000</code>.
 *
 * Hardcoded in the same manner as the bind address, with no <code>process.env</code>
 * fallback, so the only way to move the service to a different port is to edit this line.
 *
 * Collision behaviour is abrupt and worth knowing before it is encountered. If another
 * process already holds this port the bind fails, and because this file registers no
 * <code>'error'</code> listener on the server the resulting <code>'error'</code> event is
 * unhandled and the failure is fatal rather than merely reported. There is no retry, no
 * fallback port and no diagnostic of the file's own making. The <code>EADDRINUSE</code>
 * error code for an occupied port is stable Node.js behaviour; the exact wording and the
 * exit status are runtime and platform presentation rather than anything this source
 * defines. Observed on Windows under Node.js 24.19.0, the process writes an
 * unhandled-<code>'error'</code> stack trace to stderr carrying:
 *
 * <pre>Error: listen EADDRINUSE: address already in use 127.0.0.1:3000</pre>
 *
 * leaves stdout empty, and exits with code 1 -- reproduced unchanged under 24.21.0, the
 * current patch of the same line. Naming a patch records the build a check ran on rather
 * than a level to pin to: patch releases within a supported Node.js line carry security
 * fixes for the runtime and for the libraries bundled inside it, so the runtime to install
 * is the current patch of the supported line.
 *
 * Read in exactly two places: the <code>server.listen(...)</code> bind call below, and the
 * readiness line written to stdout.
 *
 * @constant {number}
 * @see <a href="docs/configuration.md">How to change this value and what changes when you
 *   do</a>
 * @see <a href="docs/troubleshooting.md">Diagnosing the EADDRINUSE termination described
 *   above</a>
 * @see <a href="docs/getting-started.md">The supported runtime line, and the requirement to
 *   run its current patch release</a>
 */
const port = 3000;

/**
 * The <strong>Request Handler Callback</strong>, registered as the sole argument to the
 * <code>http.createServer(...)</code> call immediately below. That makes it the listener
 * for the server's <code>'request'</code> event, and for nothing else: it runs once for
 * every request the runtime emits as a <code>'request'</code> event, for as long as the
 * process lives.
 *
 * Every such invocation reaches the same three unconditional statements, because the body
 * contains no branching of any kind: it sets the status to <code>200</code>, sets
 * <code>Content-Type</code> to <code>text/plain</code> (deliberately with no
 * <code>charset</code> parameter), and ends the response with the payload
 * <code>Hello, World!\n</code> -- 14 bytes, being 13 printable characters plus one trailing
 * LF.
 *
 * <code>Content-Type</code> is the only header this code sets. Every other header an
 * integrator sees, <code>Date</code> and <code>Content-Length</code> and
 * <code>Connection</code> among them, is runtime output rather than a contract this file
 * states, and the runtime can also answer a client without invoking this callback at all.
 * The full wire-level contract, the conditions under which the runtime answers by itself,
 * and the <code>HEAD</code> case belong to the reference page linked below, which is their
 * authority rather than this comment.
 *
 * Implements F-002 Uniform HTTP Response Handler.
 *
 * @callback RequestHandlerCallback
 * @param {http.IncomingMessage} req The inbound request. This callback
 *   <strong>never reads or observes it</strong>: nothing here touches
 *   <code>req.url</code>, <code>req.method</code>, <code>req.headers</code> or the request
 *   body, and nothing subscribes to <code>req</code>'s <code>'data'</code>,
 *   <code>'end'</code> or <code>'error'</code> events. Every surprise this service holds
 *   follows from that one omission: an unknown path returns the greeting instead of a
 *   <code>404</code>, an unexpected method returns it instead of a <code>405</code>,
 *   <code>/favicon.ico</code> returns it instead of an icon, and
 *   <code>Accept: text/html</code> still returns <code>text/plain</code> because no content
 *   negotiation, routing, parsing, validation or authentication takes place at all.
 * @param {http.ServerResponse} res The outbound response, and the only one of the two
 *   parameters this callback actually uses. All three statements in the body write to it.
 *   The last of them, <code>res.end(...)</code>, marks the outgoing message ended rather
 *   than delivered, and nothing here observes <code>res</code> afterwards, so this callback
 *   schedules no further work of its own.
 * @returns {void} The body contains no <code>return</code> statement, and the emitter that
 *   invokes it discards the result.
 * @see <a href="docs/api-reference/functions/request-handler-callback.md">Dedicated
 *   reference page for this callback</a>
 */
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, World!\n');
});

/**
 * The <strong>Listen Readiness Callback</strong>. The <code>server.listen(...)</code> call
 * immediately below takes it as its third argument, and the runtime registers it as a
 * one-shot <code>'listening'</code> listener. It runs once the socket is bound and
 * accepting connections, and it runs at most once: nothing in this file ever re-binds the
 * server, so there is no second invocation to account for.
 *
 * Its entire effect is a single line on stdout, written with <code>console.log</code> from a
 * template literal that interpolates the <code>hostname</code> and <code>port</code>
 * constants declared above. Reading those two bindings rather than repeating their values
 * is what keeps the line reporting the values this file actually binds with. As they stand
 * it prints exactly:
 *
 * <pre>Server running at http://127.0.0.1:3000/</pre>
 *
 * That line is the only positive, application-authored readiness signal this process emits,
 * and the only output it writes to stdout: there is no health endpoint, no readiness probe,
 * no structured logging and no metrics. It is not the only output the process can produce,
 * because the runtime still writes diagnostics of its own to stderr -- the
 * unhandled-<code>'error'</code> stack trace on a failed bind is exactly that.
 *
 * The inference runs in one direction only, and the negative case is where that matters. If
 * the bind fails this callback never executes: the server emits <code>'error'</code> instead
 * of <code>'listening'</code>, that event has no listener anywhere in this file, and the
 * process is torn down before the callback could be reached, so no readiness line is
 * produced. The converse does not hold, because <code>server.listen(...)</code> is
 * asynchronous: an absent line means readiness has not been observed rather than that the
 * socket was never bound, and the troubleshooting page linked from the
 * <code>port</code> constant above is the authority on telling those two apart.
 *
 * Implements F-003 Startup Readiness Logging.
 *
 * @callback ListenReadinessCallback
 * @returns {void} Invoked with no arguments whatsoever -- zero arity. In particular this is
 *   not Node's error-first <code>(err, result)</code> convention: the readiness callback of
 *   <code>listen</code> is handed nothing, there is no <code>err</code> parameter to
 *   inspect, and a bind failure surfaces through the unhandled <code>'error'</code> event
 *   described above rather than through an argument to this function.
 * @see <a href="docs/api-reference/functions/listen-readiness-callback.md">Dedicated
 *   reference page for this callback</a>
 */
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
