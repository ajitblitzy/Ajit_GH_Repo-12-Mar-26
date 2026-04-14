# hao-backprop-test
test project for backprop integration.

## Project Overview

`server.js` is a minimal, zero-dependency Node.js HTTP server that binds to `127.0.0.1:3000` and responds to every request with a plain-text `Hello, World!\n` message. It uses only the built-in `node:http` module, returns HTTP 200 with `Content-Type: text/plain` for all methods and paths, and logs its listening URL to stdout on startup.

## Testing

This project includes a comprehensive, multi-layered test suite covering unit, integration, negative flow, performance, and security testing. All tests use the **black-box process testing pattern** — `server.js` is spawned as a child process, HTTP requests are issued against it, and responses are asserted.

### Prerequisites

- **Node.js v20 or later** — the test suite uses the built-in `node:test` runner and `node:assert` module, both stable in Node.js 20+
- Run `npm install` to install devDependencies (`autocannon` is required for performance benchmarks)

### Test Structure

```
test/
├── helpers/
│   └── server-helper.js              # Shared test lifecycle utilities
├── unit/
│   └── server.test.js                # Unit-level feature tests (F-001 — F-004)
├── integration/
│   └── server.integration.test.js    # HTTP method/path integration tests
├── negative/
│   └── server.negative.test.js       # Error condition & failure mode tests
├── performance/
│   └── server.performance.test.js    # autocannon performance benchmarks
└── security/
    └── server.security.test.js       # Security resilience tests
```

| Directory | Description |
|---|---|
| `test/helpers/` | Shared utilities for server spawn/ready/stop lifecycle and HTTP request helpers |
| `test/unit/` | Verifies core features: server creation, response status/headers/body, startup logging |
| `test/integration/` | Validates HTTP method coverage (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS) and URL path variations |
| `test/negative/` | Tests failure modes: port conflicts (EADDRINUSE), oversized headers, abrupt disconnections, signal handling |
| `test/performance/` | Benchmarks throughput, latency percentiles (p50/p95/p99), and concurrent connection capacity |
| `test/security/` | Checks resilience against CRLF header injection, path traversal, large payloads, and connection cycling |

### Available Test Commands

Run tests using the npm scripts defined in `package.json`:

| Command | Purpose |
|---|---|
| `npm test` | Run all tests using `node --test` |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run test:negative` | Run negative flow tests only |
| `npm run test:performance` | Run performance benchmarks only |
| `npm run test:security` | Run security tests only |
| `npm run test:coverage` | Run all tests with V8 code coverage reporting |
| `npm run test:all` | Run the complete test suite from `test/` |

### Direct Node.js Execution

Tests can also be run directly without npm scripts:

```bash
# Run all test files
node --test test/

# Run a single specific test file
node --test test/unit/server.test.js

# Run with built-in V8 code coverage
node --test --experimental-test-coverage test/

# Run sequentially to prevent port conflicts
node --test --test-concurrency=1 test/

# Run with spec-style output
node --test --test-reporter spec test/

# Run with TAP output format
node --test --test-reporter tap test/

# Debug mode
node --inspect --test test/unit/server.test.js
```

### Pre-Test Verification

Before running the test suite, verify that port 3000 is not already in use:

```bash
lsof -i :3000 || echo "Port 3000 is available"
```

### Important Notes

- **Port 3000 must be available** before running tests — `server.js` binds to a hardcoded `127.0.0.1:3000`
- **Use `--test-concurrency=1`** when running the full suite to avoid `EADDRINUSE` conflicts between test files that spawn server processes
- **Performance tests should be run separately** from other test categories to avoid resource contention affecting benchmark accuracy
- **All tests except performance use zero external dependencies** — only Node.js built-in modules (`node:test`, `node:assert`, `node:http`, `node:child_process`, `node:net`)
- **`autocannon`** (installed as a devDependency) is required only for `test/performance/server.performance.test.js`
- Tests use **CommonJS `require()` syntax** consistent with the `server.js` module system
