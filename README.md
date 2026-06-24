# hao-backprop-test

test project for backprop integration.

`hao-backprop-test` is a minimal, single-file HTTP server built on the Node.js standard library (Source: server.js:L1). This README is the entry point: follow the Quick Start to run it in under a minute, then browse the [Documentation](#documentation) for the full technical and user references.

## Prerequisites

The only requirement is a working **Node.js** installation (any modern LTS release). There is **no package installation step** — you do not need to run `npm install`. The project has zero third-party dependencies and uses only the Node.js built-in `http` module, so Node.js on its own is enough to run it (Source: server.js:L1).

## Quick Start

From the repository root, start the server with a single command:

```bash
node server.js
```

This starts the HTTP server, which binds to host `127.0.0.1` and port `3000` and keeps running until you stop it with `Ctrl+C` (Source: server.js:L12-L14).

## Expected Output

On startup, the server prints the following line to the console (Source: server.js:L12-L14):

```
Server running at http://127.0.0.1:3000/
```

Once it is running, open `http://127.0.0.1:3000/` in a browser — or send a request with `curl`:

```bash
curl http://127.0.0.1:3000/
```

Either way, the server returns the plain-text response body (Source: server.js:L9):

```
Hello, World!
```

The single request handler always sets a `200` status, a `text/plain` content type, and the same body. The server is **route-agnostic** and **method-agnostic**: every request — any HTTP method, any URL path — receives this identical response. There is no routing, no method handling, and no exported JavaScript API (Source: server.js:L6-L10).

## Documentation

Full documentation lives under the [`docs/`](docs/) directory, split by audience. All links below are relative and resolve on common Git hosts and in local Markdown viewers with no build step.

### Technical documentation (for engineers)

- [Architecture](docs/technical/architecture.md) — system overview, the two-component model, the zero-dependency rationale, and a component diagram.
- [Server Reference](docs/technical/server-reference.md) — a line-by-line functional reference of `server.js`, with request-lifecycle and startup diagrams.
- [Configuration](docs/technical/configuration.md) — the `hostname` and `port` constants reference and how to change them.

### User guide (for end users)

- [Getting Started](docs/user-guide/getting-started.md) — prerequisites, how to run the server, the access URL, the expected output, and how to stop it.
- [Troubleshooting](docs/user-guide/troubleshooting.md) — common issues and how to fix them.
