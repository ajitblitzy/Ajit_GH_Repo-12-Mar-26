# hao-backprop-test

test project for backprop integration.

`hao-backprop-test` is a minimal, zero-dependency Node.js HTTP server used as a test scaffold. It returns the same static plain-text `Hello, World!` response to every request — for any HTTP method and any URL path. `Source: server.js:L6-L10`

This README is the entry point: read the 30-second [Quick Start](#quick-start) below, then dive into the [Documentation](#documentation) index for depth.

## Prerequisites

The only requirement is a working **Node.js** installation (any modern LTS release).

No package installation step is needed — there is no `npm install` to run. The project has zero third-party dependencies and uses only the Node.js built-in `http` module, so once Node.js is available you are ready to run it. `Source: server.js:L1`

## Quick Start

From the project root (the folder that contains `server.js`), start the server with a single command:

```bash
node server.js
```

This starts the HTTP server and binds it to the **host** `127.0.0.1` and **port** `3000`. `Source: server.js:L12-L14`

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

The **request handler** never inspects the request method or URL path, so every request returns this identical response — the server is route-agnostic and method-agnostic. `Source: server.js:L6-L10`

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
