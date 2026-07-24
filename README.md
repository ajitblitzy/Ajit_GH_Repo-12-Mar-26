# hao-backprop-test

`hao-backprop-test` is a test project for backprop integration (`Source: README.md:L1-L2`), implemented as a minimal, single-file Node.js HTTP service (`Source: server.js:L1-L14`).

## What it is

`hao-backprop-test` is a minimal HTTP service implemented entirely in `server.js`, using only the Node.js standard-library `http` module with zero third-party dependencies (`Source: server.js:L1`). On startup it binds an HTTP listener to host `127.0.0.1` (`Source: server.js:L3`) and port `3000` (`Source: server.js:L4`) via `server.listen(port, hostname, callback)` (`Source: server.js:L12`).

The service is single-process, stateless, and event-driven: it is built around a single request-handler callback (`Source: server.js:L6`) and a one-time `listen` (listening) callback (`Source: server.js:L12`), and the handler holds no state, returning a fixed response on every request (`Source: server.js:L6-L10`). It exposes exactly one HTTP interface — the listener bound at `127.0.0.1:3000` (`Source: server.js:L12`) — and has no user interface.

## Quick start

**Prerequisites:** any maintained Node.js LTS runtime, and a free loopback TCP port `3000` (`Source: server.js:L3-L4`).

Run the service from the repository root:

```sh
node server.js
```

On a successful bind, the process prints exactly one readiness line to stdout (`Source: server.js:L13`):

```text
Server running at http://127.0.0.1:3000/
```

Verify the response from a second terminal:

```sh
curl http://127.0.0.1:3000/
```

This returns the body `Hello, World!` followed by a single newline byte (`Source: server.js:L9`).

## Response contract

The request handler never inspects the incoming `req` object, so every request receives the same deterministic response (`Source: server.js:L6-L10`):

| Aspect | Value | Source |
|--------|-------|--------|
| Status code | `200` | `server.js:L7` |
| `Content-Type` header | `text/plain` | `server.js:L8` |
| Response body | `Hello, World!\n` | `server.js:L9` |

The response body is the text `Hello, World!` followed by a single trailing line-feed byte (the `\n` is one newline byte, 14 bytes total) (`Source: server.js:L9`).

There is **no routing**: because `req` is never read, any HTTP method and any path reach the same handler code and produce the same application response above (`Source: server.js:L6-L10`). For the complete wire-level contract — including the headers Node's `http` module adds automatically and its method/protocol handling — see the [API reference](docs/api-reference.md).

## Documentation

- [Documentation index](docs/index.md) — landing page & table of contents
- [Getting started](docs/getting-started.md) — prerequisites, run, verify, stop
- [Architecture](docs/architecture.md) — design overview & Mermaid diagrams
- [Functionality reference](docs/functionality.md) — F-001 / F-002 / F-003, configuration, limitations
- [API reference](docs/api-reference.md) — HTTP endpoint behavior & response contract

## Limitations

- **Loopback-only.** The listener binds the loopback address `127.0.0.1`, so the service is reachable only from the local host and is not exposed on external network interfaces (`Source: server.js:L3`).
- **Unhandled bind failure.** No `error` listener is attached to the server, so a failed bind — for example when port `3000` is already in use (`EADDRINUSE`) — is unhandled and terminates the process (`Source: server.js:L1-L14`). See the [functionality reference](docs/functionality.md) for full detail.
