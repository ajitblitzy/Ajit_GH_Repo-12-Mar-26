# hao-backprop-test
test project for backprop integration.

## Prerequisites

- [Node.js](https://nodejs.org/) `>=18`. The built-in `node:test` runner used by
  the test suite is stable from Node 20; the project is verified on Node v22.
- **Zero external dependencies** - the server uses only Node.js built-in modules,
  so there is nothing to `npm install`.

## Running the server

Start the server with npm:

```bash
npm start
```

Or run it directly with Node:

```bash
node server.js
```

By default the server listens on `http://127.0.0.1:3000/` and responds to **any**
HTTP method and **any** path with status `200` and the plain-text body
`Hello, World!`.

## Testing

Run the test suite with npm:

```bash
npm test
```

This runs `node --test`, which auto-discovers test files under `test/`. The tests
are black-box contract tests built on Node's built-in `node:test` and `node:assert`
modules; they assert that the HTTP response contract (status, headers, and body)
is preserved.

## Environment variables

All of the following are optional. Their defaults reproduce the original behavior
exactly.

| Variable | Default | Description |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Network interface to bind. |
| `PORT` | `3000` | TCP port to listen on. |
| `WEB_CONCURRENCY` | unset (single process) | When set to a value greater than `1`, the server forks that many `cluster` worker processes for multi-core throughput. Unset, or a value of `1` or less, runs a single process. Clustering changes only throughput, never the per-response behavior. |

For example, to run on port `8080`:

```bash
PORT=8080 npm start
```
