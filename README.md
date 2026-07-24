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

Both commands are equivalent: `npm start` simply invokes `node server.js` (the
`scripts.start` entry in `package.json`). The server listens on
`http://127.0.0.1:3000/` (loopback only) and responds to every request with
`200 OK`, `Content-Type: text/plain`, and the body `Hello, World!`.

### Stopping the server

The server installs `SIGTERM`/`SIGINT` handlers that call `server.close()` for a
clean, deterministic shutdown that releases port 3000.

- **Interactive terminal:** press `Ctrl-C`. The signal is delivered to the whole
  foreground process group, so the server shuts down cleanly.
- **Direct `node server.js`:** send `SIGTERM` or `SIGINT` to the Node process
  (e.g. `kill -TERM <node_pid>`); it shuts down cleanly and releases the port.
- **`npm start` under a process manager:** signal the whole **process group**,
  not the `npm` process alone. When `npm start` runs, the process tree is
  `npm -> sh -> node`, and `npm` does **not** forward a single-PID termination
  signal to the `node` child. Sending `SIGTERM`/`SIGINT` to only the `npm` PID
  therefore orphans the server and leaves port 3000 held (risking `EADDRINUSE`
  on the next start). Instead, terminate the group — for example
  `kill -TERM -<pgid>`, systemd `KillMode=control-group`, or `docker stop` —
  or run `node server.js` directly as the managed process. Group termination and
  direct invocation both shut the server down cleanly and release the port.

## Security

The service applies behavior-preserving hardening in `server.js` (the HTTP
status, content type, body, bind address, and startup log are unchanged):

- **Security response headers** set natively via `res.setHeader` (no framework
  or middleware — the zero-dependency posture is preserved):
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'`,
  `Referrer-Policy: no-referrer`, and `Cross-Origin-Resource-Policy: same-origin`.
- **Connection timeouts** to mitigate slow-request (Slowloris) resource
  exhaustion: `headersTimeout`, `requestTimeout`, and `timeout` are bounded, and
  `keepAliveTimeout` is pinned to `5000` ms (preserving the observed
  `Keep-Alive: timeout=5` response header).
- **Process resilience:** a `server.on('error')` handler converts faults such as
  `EADDRINUSE` into a controlled, logged exit instead of an uncaught crash, and
  `SIGTERM`/`SIGINT` handlers perform a graceful shutdown via `server.close()`.
- **Loopback-only binding** to `127.0.0.1` is retained as the primary structural
  network control.

### Supply-chain governance

- `package.json` declares an **empty** dependency set and pins the Node engine
  range, and a committed `package-lock.json` makes `npm audit` runnable. With no
  third-party dependencies, `npm audit` reports zero vulnerabilities.

      npm audit

### Out of scope

TLS/HTTPS termination, authentication, authorization, CORS, and rate limiting
are intentionally out of scope for this service and are documented as accepted
residual risks (mitigated in part by the loopback-only bind).
