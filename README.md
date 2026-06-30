# hao-backprop-test
test project for backprop integration.

## Testing

This project ships with an automated test suite built entirely on the Node.js
built-in test runner (`node:test`) with **zero external dependencies**. It
covers functional, lifecycle, and performance scenarios for the `server.js`
HTTP server.

### Prerequisites

- **Node.js v22.22.2** or compatible. The suite relies on the built-in
  `node --test` runner and the `--experimental-test-coverage` flag, both stable
  in Node.js 20+.
- **No installation step is required** — there are no third-party
  dependencies. (`npm install` is a no-op because the optional `package.json`
  declares zero dependencies.)
- **TCP port `3000` on `127.0.0.1` must be free** when running the suite. The
  server binds a single hardcoded port; the port-conflict test deliberately
  occupies and then releases it.

### Commands

Each task can be run via its npm script or the equivalent raw `node` command:

| Task | npm script | Raw `node` command |
|------|------------|--------------------|
| Functional + lifecycle suite | `npm test` | `node --test --test-concurrency=1 'test/**/*.test.js'` |
| With coverage | `npm run test:coverage` | `node --test --experimental-test-coverage --test-force-exit --test-concurrency=1 'test/**/*.test.js'` |
| Performance / load test | `npm run test:perf` | `node test/performance/load-test.js` |

**Why a quoted glob and not a bare directory?** The commands above pass the
quoted pattern `'test/**/*.test.js'` to the runner. On Node.js 22 a bare
directory positional — for example `node --test test/` — is resolved as a
single module entry point rather than a test-discovery root, so it fails with
`Error: Cannot find module …/test` (`MODULE_NOT_FOUND`). The glob matches the
suite's `*.test.js` files explicitly and runs all of them, so prefer the
`npm test` / `npm run test:coverage` scripts above (which already use this
form).

Run a single test file directly:

```bash
node --test test/server.test.js
```

### Concurrency

The `--test-concurrency=1` flag serializes test files. Because `server.js`
binds the single hardcoded port `3000`, running server-starting suites in
parallel would trigger `EADDRINUSE` races; serializing them keeps every suite
independent and deterministic.

### Test layout

```
test/
├── server.test.js          # functional + edge tests (in-process harness)
├── lifecycle.test.js        # startup, binding & port-conflict (child process)
├── performance/
│   └── load-test.js         # throughput, latency, error rate, stability
├── helpers/
│   ├── server-harness.js    # server start/stop helpers
│   └── http-client.js       # promisified request + percentile()
└── fixtures/
    └── expected.js          # shared expected-value constants
```

- `test/server.test.js` — functional + edge tests (status `200`,
  `Content-Type: text/plain`, body `Hello, World!\n`, `Content-Length` 14, all
  HTTP methods, HEAD empty-body, arbitrary paths/queries) via an in-process
  `http.createServer` interception harness; yields real `server.js` coverage.
- `test/lifecycle.test.js` — black-box child-process tests for the startup log,
  loopback binding to `127.0.0.1:3000`, and the port-conflict failure
  (`EADDRINUSE` / non-zero exit).
- `test/performance/load-test.js` — throughput (req/s), latency percentiles
  (p50/p95/p99), error rate under concurrency, startup latency, and
  sustained-load stability.
- `test/helpers/` — shared `server-harness.js` (start/stop helpers) and
  `http-client.js` (promisified request + `percentile()`).
- `test/fixtures/expected.js` — shared expected-value constants (status,
  content type, body, host, port, startup-log string).

### Performance notes

Performance thresholds are **soft, environment-relative checks** — the reported
numbers are illustrative of the host machine, not contractual SLAs. The
performance script is run separately from the assertion suite
(`npm run test:perf`) so that its longer runtime and console report do not
interfere with the fast, deterministic functional tests.
