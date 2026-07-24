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

An ordinary `GET` request — in fact any non-`HEAD` request — receives `200 OK`
with `Content-Type: text/plain` and a response body of exactly `Hello, World!\n`
(the string `Hello, World!` followed by a single newline: 14 bytes, sent as
`Content-Length: 14`). Following HTTP semantics, a `HEAD` request returns the
same `200` status and the same headers but no response body (and no
`Content-Length` header).

### Stopping the server

`server.js` installs `SIGTERM`/`SIGINT` handlers that close the listening server
via `server.close()` and release port 3000. A signal that arrives during the
brief startup window — after `server.listen()` is called but before the server
has finished binding — is recorded and honored the moment the server reaches the
listening state, so an early signal is never lost and the server does not remain
listening after a shutdown was requested.

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

  All five headers are set natively via `res.setHeader` before the body is
  written; the `200`/`text/plain`/`Hello, World!\n` contract is unchanged.

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
- **Nondeterministic lifecycle / lingering port** — the process not releasing
  port 3000 on termination. Remediation: `SIGTERM`/`SIGINT` handlers perform a
  graceful shutdown via `server.close()`, including the startup-window
  coordination described under "Stopping the server" above.
- **Parser/timeout responses bypassing the hardened headers** — malformed
  requests, oversized headers, or request timeouts are answered by Node before
  the request handler runs. Remediation: a `server.on('clientError')` handler
  emits the same five security headers (plus `Connection: close`) on those
  fixed, no-body responses (e.g. `400`, `408`, `413`, `431`).
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
