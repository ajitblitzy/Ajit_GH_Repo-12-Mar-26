# hao-backprop-test
test project for backprop integration.

A minimal, zero-dependency Node.js HTTP server built on the Node.js core `http`
module. By default it responds to every request with a fixed plain-text body.

## Prerequisites

- **Node.js `>=18`** is the only requirement. The built-in `node:test` runner
  used by the test suite is stable from Node 20; the project is verified on
  Node v22.
- **Zero external dependencies.** There is nothing to install — `npm install`
  is effectively a no-op because the manifest declares empty `dependencies` and
  `devDependencies`.

## Running the server

```bash
npm start
```

This runs `node server.js`. You can also run the file directly:

```bash
node server.js
```

By default the server listens on `http://127.0.0.1:3000/` and responds to **any**
HTTP method and **any** path with status `200` and the plain-text body
`Hello, World!`.

## Testing

```bash
npm test
```

This runs `node --test`, which auto-discovers the test files under `test/`.
The suite consists of black-box contract tests written with Node's built-in
`node:test` and `node:assert` modules; they assert that the HTTP response
contract (status code, headers, and body) is preserved exactly.

## Environment variables

All variables are optional. Their defaults reproduce the original behavior
exactly, so the default run is unchanged.

| Variable          | Default                  | Description                                                                                                                                                                                              |
| ----------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HOST`            | `127.0.0.1`              | Network interface to bind.                                                                                                                                                                                |
| `PORT`            | `3000`                   | Port to listen on.                                                                                                                                                                                        |
| `WEB_CONCURRENCY` | unset (single process)   | When set to a value greater than `1`, the server forks that many `cluster` worker processes for multi-core throughput. Unset or `<= 1` runs a single process. Clustering changes **only** throughput — never the per-response behavior. |

Example — start the server on a different port:

```bash
PORT=8080 npm start
```
