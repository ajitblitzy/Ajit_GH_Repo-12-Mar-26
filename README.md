# hao-backprop-test

test project for backprop integration.

`hao-backprop-test` is a minimal, zero-dependency Node.js HTTP server used as a test scaffold. `Source: server.js:L1, README.md:L1-L3`. Its request handler never inspects the HTTP method or URL path, so it answers every request the same way: `GET`, `POST`, `PUT`, and `DELETE` all return the identical `Hello, World!` body, while a `HEAD` request returns the same `200` status and `text/plain` content type with no body, per standard HTTP semantics. `Source: server.js:L6-L10`

This README is the entry point: read the 30-second [Quick Start](#quick-start) below, then dive into the [Documentation](#documentation) index for depth.

## Prerequisites

The only requirement is a working **Node.js** installation (any modern LTS release).

No package installation step is needed. The project has zero third-party dependencies and uses only the Node.js built-in `http` module, so once Node.js is available you are ready to run it. `Source: server.js:L1`

## Quick Start

From the project root (the folder that contains `server.js`), start the server with a single command:

```bash
node server.js
```

This starts the HTTP server and binds it to the **host** `127.0.0.1` and **port** `3000`. `Source: server.js:L3-L4, server.js:L12-L14`

## Expected Output

On **startup**, the server prints the following line to the console:

```
Server running at http://127.0.0.1:3000/
```

`Source: server.js:L12-L14`

With the server running, open `http://127.0.0.1:3000/` in a browser — or send a request with `curl`:

```bash
curl http://127.0.0.1:3000/
```

Either way, the **response** is the plain-text body `Hello, World!`: `Source: server.js:L9`

```
Hello, World!
```

The **request handler** never inspects the request method or URL path, so the handler itself is route-agnostic and method-agnostic. In practice, `GET`, `POST`, `PUT`, and `DELETE` requests all return this identical response, including a `Content-Length: 14` header. A `HEAD` request runs the same handler and returns the same `200` status and `text/plain` content type, but — per standard HTTP semantics — with no response body and no `Content-Length` header. `Source: server.js:L6-L10`

To stop the server, press **Ctrl+C** in the terminal where it is running.

## Documentation

Detailed documentation lives in the `docs/` tree, split by audience.

### Technical documentation (for engineers)

- [Architecture](docs/technical/architecture.md) — system overview, the two-component model, the zero-dependency rationale, and a component diagram.
- [Server Reference](docs/technical/server-reference.md) — line-by-line functional reference of `server.js`, with request-lifecycle and startup diagrams.
- [Configuration](docs/technical/configuration.md) — the **host** and **port** constants reference and how to change them.

### User guide (for end users)

- [Getting Started](docs/user-guide/getting-started.md) — prerequisites, how to run the server, the access URL, expected output, and how to stop it.
- [Troubleshooting](docs/user-guide/troubleshooting.md) — common issues and fixes.
