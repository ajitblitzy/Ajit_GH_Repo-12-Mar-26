# hao-backprop-test

test project for backprop integration.

## Prerequisites

- Node.js 22.x. The supported range is pinned via `engines.node` to
  `>=22.0.0 <23.0.0` in `package.json` (verified against v22.23.1). No
  third-party dependencies are required — the service uses only the Node.js
  core `http` module.

## Running

Start the server with npm:

    npm start

Or run it directly with Node.js:

    node server.js

Both commands start the same service: `npm start` invokes `node server.js` (the
`scripts.start` entry in `package.json`). The server binds to
`http://127.0.0.1:3000/` (loopback only).

An ordinary `GET` request — in fact any request delivered to the Node.js
`request` handler — receives `200 OK` with `Content-Type: text/plain` and a
response body of exactly `Hello, World!\n` (the string `Hello, World!` followed
by a single newline: 14 bytes, sent as `Content-Length: 14`). This response is
uniform and independent of method and path: `GET`, `POST`, `OPTIONS`, an
arbitrary path, and an `Upgrade` request (this service registers no `upgrade`
listener, so such requests fall through to the ordinary handler) all receive it.
Following HTTP semantics, a `HEAD` request returns the same `200` status and the
same headers but no response body (and no `Content-Length` header).

A few requests are handled by Node.js *before* the request handler runs, so they
do not receive the `200` body. These are protocol-level behaviors, not
application routing:

- A `CONNECT` request is not delivered to the request handler (there is no
  `connect` listener); no HTTP response is returned and the connection is closed.
- An HTTP/1.1 request with no `Host` header receives Node's `400 Bad Request`.
- A request whose `Expect` header is not `100-continue` receives Node's
  `417 Expectation Failed`.

The automatic `400` and `417` responses still carry the five security headers
described in the Security section below; the `CONNECT` case returns no response
at all.

### Stopping the server

`server.js` installs `SIGTERM`/`SIGINT` handlers that close the listening server
via `server.close()` and release port 3000. A signal that arrives during the
brief startup window — after `server.listen()` is called but before the server
has finished binding — is recorded and honored (before the readiness line is
logged) the moment the server reaches the listening state, so an early signal is
never lost, no false "running" message is emitted for a server about to close,
and the server does not remain listening after a shutdown was requested. Because
parser-error sockets are destroyed once their response has been flushed, even a
malformed or half-open connection is released deterministically and cannot hold
the port open or stall this shutdown.

- **Interactive terminal:** press `Ctrl-C`. The signal reaches the foreground
  Node process, which shuts down cleanly and releases the port.
- **Direct `node server.js`:** send `SIGTERM` or `SIGINT` to the Node process
  (e.g. `kill -TERM <node_pid>`); it shuts down cleanly and releases the port.
- **`npm start`:** `npm start` is **not** a single-process signal boundary. Its
  process tree is `npm -> sh -> node`, and npm does **not** forward a single-PID
  `SIGTERM`/`SIGINT` to the `node` child. Sending a signal to the `npm` PID alone
  therefore leaves the `node` server running and port 3000 held (risking
  `EADDRINUSE` on the next start). For a clean, deterministic shutdown, either
  run `node server.js` directly as the managed process and signal that Node PID,
  or signal the whole process group of the `npm start` tree. (This npm behavior
  was verified locally with npm 11.x; single-PID `npm` signal forwarding is not
  provided.)

## Security

`server.js` applies behavior-preserving hardening: the HTTP status, content
type, response body, bind address, startup log line, and the observed
`Keep-Alive: timeout=5` response header are all unchanged. The service uses only
the Node.js core `http` module — no framework or middleware is added, so the
zero-dependency posture is preserved.

The list below maps each identified vulnerability or hardening gap to the
remediation applied in `server.js`.

- **MIME-type sniffing** — a client reinterpreting the `text/plain` body as
  another content type. Remediation: `X-Content-Type-Options: nosniff`.
- **Clickjacking / frame embedding** — the response being framed by a hostile
  page. Remediation: `X-Frame-Options: DENY` together with the response
  `Content-Security-Policy` directive `frame-ancestors 'none'`.
- **Unconstrained resource and base-URI loading** — no restriction on what a
  rendering context may load or use as a base URI. Remediation: the response
  `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'`.
- **Referrer leakage** — the request URL leaking to other origins via the
  `Referer` header. Remediation: `Referrer-Policy: no-referrer`.
- **Cross-origin embedding of the response** — the response being loaded as a
  subresource by another origin. Remediation:
  `Cross-Origin-Resource-Policy: same-origin`.

  All five headers come from a single, immutable policy object defined once in
  `server.js`. They are applied natively (via `res.setHeader`) through a small
  `http.ServerResponse` subclass whose `writeHead` injects any missing header at
  the moment headers are written. Because this is the single point every response
  object passes through, the headers appear not only on the normal `200` but also
  on Node's automatic `ServerResponse` responses — the `400` for a missing `Host`
  header and the `417` for an unsupported `Expect` value — which never reach the
  request handler. The `200`/`text/plain`/`Hello, World!\n` contract, and the
  exact header order (`Content-Type` first, then the five security headers),
  are unchanged.

- **Slow-request (Slowloris) resource exhaustion** — unbounded header, request,
  and idle times letting a client hold connections open indefinitely.
  Remediation: explicit timeouts on the server instance —
  `headersTimeout = 10000` ms, `requestTimeout = 30000` ms, `timeout = 30000` ms,
  and `keepAliveTimeout = 5000` ms. `keepAliveTimeout` is pinned to `5000` ms
  specifically so the observed `Keep-Alive: timeout=5` response header is
  preserved; the other bounds are large enough never to affect the fast
  localhost happy path.
- **Unhandled server errors crashing the process** — for example a bind failure
  such as `EADDRINUSE`. Remediation: a `server.on('error')` handler logs a
  clear message and converts the fault into a controlled exit (exit code 1)
  instead of an uncaught-exception crash.
- **Sensitive detail disclosure in error logs** — printing a raw `Error` emits
  its full stack and internal execution frames. Remediation: operational errors
  are logged as safe structured fields (`code`, `message`, `syscall`, `address`,
  `port`) only, never the full stack; the clear `EADDRINUSE` message is retained.
- **Nondeterministic lifecycle / lingering port** — the process not releasing
  port 3000 on termination. Remediation: `SIGTERM`/`SIGINT` handlers perform a
  graceful shutdown via `server.close()`, including the startup-window
  coordination described under "Stopping the server" above.
- **Node-generated responses bypassing the hardened headers** — some responses
  never reach the request handler. Automatic `ServerResponse` responses (the
  `400` for a missing `Host` header and the `417` for an unsupported `Expect`
  value) are hardened by the `ServerResponse` header mechanism described above.
  Raw parser/timeout responses that Node writes directly to the socket — a
  malformed request (`400`), oversized headers (`431`), chunk-extension overflow
  (`413`), or a request timeout (`408`) — are hardened by a
  `server.on('clientError')` handler that emits the same five security headers
  (plus `Connection: close`) from the same single policy object. Every response
  path is therefore hardened with no duplicated header definitions.
- **HTTP response desynchronization on the error path (CWE-444)** — a
  `clientError` (for example an invalid chunked body or a request-body timeout)
  can fire after the normal `200` response for the same connection has already
  started, which would otherwise append a second status line to a single request.
  Remediation: the `clientError` handler emits a fixed error response only when
  no response has begun on the socket; if a response has already started, or the
  socket is no longer writable, it destroys the socket instead of writing a
  second response.
- **Malformed half-open socket retention / shutdown stall (CWE-400, CWE-772)** —
  ending a parser-error response with `socket.end()` alone leaves a malicious
  half-open (`allowHalfOpen`) peer writable and retains the server socket handle,
  which can prevent a timely `SIGTERM` shutdown. Remediation: after the fixed
  error response has flushed, the socket is explicitly destroyed, deterministically
  releasing the handle while still delivering the complete response.
- **Missing supply-chain governance** — no manifest, engine pin, or audit
  baseline. Remediation: a `package.json` manifest pins the Node engine range
  and declares an explicitly empty dependency set (see below).
- **Loopback-only binding** to `127.0.0.1` is retained as the primary
  structural network control (the service is not reachable off-host).

### Supply-chain governance

`package.json` declares an **empty** dependency set and pins the Node engine
range, so there is no third-party attack surface. No lockfile is committed — none
is required while the dependency set is empty.

Because no lockfile is present, run the audit in manifest-only mode:

    npm audit --package-lock=false

This reports zero vulnerabilities without creating a lockfile. Note that a plain
`npm audit` (without the flag) fails with `ENOLOCK` under npm 11.x, because the
default audit path requires an existing lockfile; the `--package-lock=false`
form audits the manifest directly and is the supported command for this
zero-dependency, no-lockfile project.

### Out of scope

TLS/HTTPS termination, authentication, authorization, CORS, and rate limiting
are intentionally out of scope for this service and are documented as accepted
residual risks (mitigated in part by the loopback-only bind).
