# hao-backprop-test
test project for backprop integration.

## Testing

This project ships with an automated test suite built entirely on the Node.js
built-in test runner (`node:test`) and assertion library (`node:assert`) — with
**zero external dependencies**. It covers functional, lifecycle, and performance
scenarios for the HTTP server in `server.js`.

### Prerequisites

- **Node.js v22.22.2** or compatible. The suite uses the built-in `node --test`
  runner (stable since Node.js 20) and the `--experimental-test-coverage` flag
  (available in Node.js 20+).
- **No installation step is required** — there are no third-party dependencies.
  (`npm install` is a no-op because the optional `package.json` declares zero
  dependencies.)
- **TCP port `3000` on `127.0.0.1` must be free** while the suite runs. The
  server binds a single hardcoded port, and the port-conflict test deliberately
  occupies and then releases it.

### Commands

Each task is shown in both its `npm` script form and the equivalent raw `node`
command:

| Purpose | npm script | Raw `node` command |
| --- | --- | --- |
| Functional + lifecycle suite | `npm test` | `node --test --test-concurrency=1 "test/**/*.test.js"` |
| Run with coverage | `npm run test:coverage` | `node --test --experimental-test-coverage --test-force-exit --test-concurrency=1 "test/**/*.test.js"` |
| Performance / load test | `npm run test:perf` | `node test/performance/load-test.js` |
| Run a single test file | — | `node --test test/server.test.js` |

The `"test/**/*.test.js"` glob — used identically by the `npm` scripts and the
raw commands — intentionally selects only the assertion suites (files ending in
`.test.js`). It deliberately avoids the bare `test/` directory positional, which
Node v22 rejects with a module-resolution error, and it prevents the runner from
accidentally executing helper, fixture, or performance files (such as
`test/performance/load-test.js`) as no-op tests.

#### Why `--test-concurrency=1`?

`server.js` binds the single hardcoded port `3000`. Serializing the test files
with `--test-concurrency=1` prevents `EADDRINUSE` races between suites that each
launch a server.

### Test layout

```text
test/
├── server.test.js          # functional + edge tests (in-process harness)
├── lifecycle.test.js       # startup, binding & port-conflict (child process)
├── performance/
│   └── load-test.js        # throughput, latency, error rate, stability
├── helpers/
│   ├── server-harness.js   # start/stop helpers
│   └── http-client.js      # promisified request + percentile()
└── fixtures/
    └── expected.js         # shared expected-value constants
```

- **`test/server.test.js`** — functional + edge tests (status `200`,
  `Content-Type: text/plain`, body `Hello, World!\n`, `Content-Length` 14, all
  HTTP methods, the `HEAD` empty-body case, and arbitrary paths/query strings)
  via an in-process `http.createServer` interception harness; yields real
  `server.js` coverage.
- **`test/lifecycle.test.js`** — black-box child-process tests for the startup
  log, loopback binding to `127.0.0.1:3000`, and the port-conflict failure
  (`EADDRINUSE` / non-zero exit).
- **`test/performance/load-test.js`** — throughput (req/s), latency percentiles
  (p50/p95/p99), error rate under concurrency, startup latency, and
  sustained-load stability.
- **`test/helpers/`** — shared `server-harness.js` (start/stop helpers) and
  `http-client.js` (promisified request helper + `percentile()`).
- **`test/fixtures/expected.js`** — shared expected-value constants (status,
  content type, body, host, port, startup-log string).

### Performance notes

The performance thresholds are **soft, environment-relative checks** —
illustrative of the host they run on, not contractual SLAs. The performance
script is run **separately** from the assertion suite (via `npm run test:perf`)
so its longer runtime and console report do not slow down or destabilize the
fast, deterministic functional tests.
