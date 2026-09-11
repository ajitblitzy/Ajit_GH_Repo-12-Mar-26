# hao-backprop-test

test project for backprop integration.

## Overview

`hao-backprop-test` is an internal engineering fixture: a Node.js HTTP
server defined entirely in one source file, `server.js`, that answers
every request with one fixed plain-text greeting. It performs no routing
and no content negotiation, so every path and every HTTP method is
answered with the same `200` / `text/plain` response — `HEAD` being the
only variation, and that one introduced by the runtime rather than the
application (Source: `server.js:L6-L10`).
Within the backprop integration named above, this repository is only the
target endpoint: the integrating counterpart is hosted outside this
repository, and no backpropagation, machine-learning, or external-system
integration code, client, or credential exists here (Source:
`server.js:L1-L14`).

## Prerequisites

Node.js `>= 24 LTS`. The documented baseline is **Node.js 24.19.0**
("Krypton", published 2026-08-03), the release under which every
behavior and every example in this documentation set was verified.

| Line | Status | Recommendation |
| --- | --- | --- |
| 24.x | Active LTS, supported to 2028-04-30 | Documented baseline |
| 22.x | Maintenance LTS | Works; not preferred |
| 26.x | Current line, not LTS | Not recommended |
| 20.x | End of life 2026-04-30 | Unsupported |

The selection criterion is the Node.js project's own guidance that
applications should run only on an Active LTS or Maintenance LTS
release. Confirm the installed runtime with `node --version`.

Nothing else is required. There is **no install step and no build step**:
the repository has no `package.json`, no lockfile, and no third-party
dependencies, because the only import is the Node.js built-in `http`
module (Source: `server.js:L1`).

## Quick Start

Run the server from the repository root:

```bash
node server.js
```

There is no `npm start`, because the repository has no `package.json`;
`node server.js` is the only launch path. The process prints exactly one
line to stdout and then runs in the foreground indefinitely:

```text
Server running at http://127.0.0.1:3000/
```

The message is built at `server.js:L13` from the `hostname` and `port`
constants (Source: `server.js:L3-L4`, `server.js:L12-L14`). Stop the
server with `Ctrl+C`.

## Verify

With the server running, issue one request:

```bash
curl -i http://127.0.0.1:3000/
```

On Windows PowerShell, `curl` is an alias for `Invoke-WebRequest`; use
`curl.exe` there. The observed response:

```text
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Fri, 11 Sep 2026 11:20:32 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 14

Hello, World!
```

The `Date` value differs on each run; every other element is fixed.

| Element | Value |
| --- | --- |
| Status | `200` (Source: `server.js:L7`) |
| `Content-Type` | `text/plain`, no `charset` (Source: `server.js:L8`) |
| `Content-Length` | `14` |
| Body | `Hello, World!` plus one LF, 14 bytes (Source: `server.js:L9`) |

Header provenance matters to integrators: the application code sets only
`Content-Type`. Everything else in the response is supplied by the
Node.js runtime.

| Header | Set by |
| --- | --- |
| `Content-Type` | Application code (Source: `server.js:L8`) |
| `Content-Length` | Runtime, derived from the `res.end()` payload |
| `Date` | Runtime |
| `Connection`, `Keep-Alive` | Runtime |

## Project Structure

`server.js` is the whole service; everything under `docs/` explains it.

```text
.
├── README.md                  <- this file
├── server.js                  <- the entire service
└── docs/
    ├── README.md              <- documentation hub
    ├── getting-started.md
    ├── usage.md
    ├── configuration.md
    ├── troubleshooting.md
    ├── api-reference/
    │   ├── README.md
    │   ├── http-endpoint.md
    │   ├── module-bindings.md
    │   └── functions/
    │       ├── request-handler-callback.md
    │       └── listen-readiness-callback.md
    └── architecture/
        ├── overview.md
        └── request-lifecycle.md
```

## Documentation

Start at the documentation hub, [docs/README.md](./docs/README.md). The
set is routed by audience.

- **Operator** — install nothing, launch, verify, stop:
  [getting-started.md](./docs/getting-started.md)
- **Integrator** — call the service and rely on its contract:
  [usage.md](./docs/usage.md) and
  [http-endpoint.md](./docs/api-reference/http-endpoint.md)
- **Maintainer** — every binding and both callbacks, line by line:
  [api-reference/README.md](./docs/api-reference/README.md),
  [module-bindings.md](./docs/api-reference/module-bindings.md), and the
  two dedicated function pages, [Request Handler Callback][fn-request]
  and [Listen Readiness Callback][fn-listen]
- **Reviewer** — component boundary, bootstrap order, request lifecycle:
  [architecture/overview.md](./docs/architecture/overview.md) and
  [request-lifecycle.md](./docs/architecture/request-lifecycle.md)
- **Changing the host or port**:
  [configuration.md](./docs/configuration.md)
- **Diagnosing a failure**:
  [troubleshooting.md](./docs/troubleshooting.md)

## Features

Feature identifiers are those of the upstream technical specification.

- **F-001 HTTP Server Listener** (Critical) — creates the server and
  binds it to `127.0.0.1:3000` (Source: `server.js:L3-L4`,
  `server.js:L6`, `server.js:L12`).
- **F-002 Uniform HTTP Response Handler** (Critical) — returns the
  identical `200` / `text/plain` / 14-byte response to every request.
  Implemented by the Request Handler Callback (Source:
  `server.js:L6-L10`).
- **F-003 Startup Readiness Logging** (Medium) — emits one stdout line
  when the bind succeeds, and never runs if the bind fails. Implemented
  by the Listen Readiness Callback (Source: `server.js:L12-L14`).

## Limitations

Each item below is a property of the current source, not a transient
state, and each was confirmed against a running instance. Public or
production deployment is not a supported use case.

- **Loopback only.** The host is the IPv4 loopback literal `127.0.0.1`,
  so the service is unreachable from another host or container, and a
  request to a non-loopback address of the same machine fails to connect
  at all (Source: `server.js:L3`).
- **No routing.** Every path returns the same response, including
  `/favicon.ico`, which browsers request automatically. There is no 404
  path and no 405 path. GET, POST, PUT, PATCH, DELETE and OPTIONS all
  return `200` with the 14-byte body; HEAD returns `200` with a
  zero-byte body because the runtime suppresses bodies for HEAD, not
  because the application special-cases it (Source: `server.js:L6-L10`).
- **No content negotiation.** A request sending `Accept: text/html`
  still receives `text/plain` (Source: `server.js:L8`).
- **No configuration.** The host and port are hardcoded with no
  `process.env` fallback, so changing either means editing the source.
  There is no configuration file and no environment variable (Source:
  `server.js:L3-L4`).
- **No graceful shutdown.** No signal handler and no `server.close()`
  call exist, so stopping the process — `Ctrl+C`, or `SIGTERM` on a
  POSIX host — ends it immediately, with no connection draining
  (Source: `server.js:L1-L14`).
- **A port collision terminates the process.** A second instance exits
  with code 1, raising `EADDRINUSE` through an unhandled `'error'` event
  because no `'error'` listener is registered. The message is
  `Error: listen EADDRINUSE: address already in use 127.0.0.1:3000`
  (Source: `server.js:L1-L14`).
- **Not importable.** The module declares no `module.exports`, so
  `require('./server')` yields no handle — it returns an empty object and
  silently starts a server as a side effect of loading (Source:
  `server.js:L1-L14`).

## Documentation Baseline

Every source locator in this file, and across `docs/`, refers to the
repository layout at baseline commit `1484182`. JSDoc comment blocks
added to `server.js` after that commit shift its physical line positions
while adding no statement, so locators are cited against the baseline
rather than against the annotated file.

[fn-request]: ./docs/api-reference/functions/request-handler-callback.md
[fn-listen]: ./docs/api-reference/functions/listen-readiness-callback.md
