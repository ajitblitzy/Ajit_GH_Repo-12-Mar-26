/**
 * Performance Benchmark Tests — server.js
 *
 * Measures and baselines the HTTP server's throughput, response latency,
 * and concurrent-connection handling capacity under varying load profiles
 * using the autocannon programmatic API.
 *
 * Test target: server.js — a 14-line, zero-dependency Node.js HTTP server
 * at 127.0.0.1:3000 returning "Hello, World!\n" for all requests.
 *
 * NOTE — Performance thresholds are baselines, not SLAs (per AAP §0.10.1).
 * Assertion failure messages reflect this by describing "baseline threshold"
 * rather than "SLA violation".
 *
 * Execution:
 *   node --test test/performance/server.performance.test.js
 *   npm run test:performance
 *
 * IMPORTANT: Run separately from other test categories to avoid resource
 * contention that could skew benchmark results.
 */

'use strict';

// ---------------------------------------------------------------------------
// Module Imports (CommonJS require — per AAP §0.10.1)
// ---------------------------------------------------------------------------

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const autocannon = require('autocannon');
const { spawnServer, waitForReady, stopServer } = require('../helpers/server-helper');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base URL matching server.js hardcoded hostname (line 3) and port (line 4) */
const SERVER_URL = 'http://127.0.0.1:3000';

// ---------------------------------------------------------------------------
// Helper — Promise-based autocannon wrapper
// ---------------------------------------------------------------------------

/**
 * Runs an autocannon benchmark against the server and returns the result
 * object containing latency histograms, throughput metrics, and error counts.
 *
 * @param {Object} options - autocannon configuration overrides. At minimum
 *   the caller should provide `connections` and `duration`.
 * @returns {Promise<Object>} Resolves with the autocannon result object.
 *   Key properties used in assertions:
 *     - result.latency.average  (ms)
 *     - result.latency.p97_5    (ms — 97.5th percentile)
 *     - result.latency.p99      (ms — 99th percentile)
 *     - result.requests.average (req/sec)
 *     - result.requests.total   (count)
 *     - result.errors           (count)
 *     - result.non2xx           (count)
 */
const runBenchmark = (options) => {
  return new Promise((resolve, reject) => {
    const instance = autocannon({
      url: SERVER_URL,
      ...options
    }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });

    // Suppress progress bar output so it does not pollute test runner output
    autocannon.track(instance, { renderProgressBar: false });
  });
};

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('Performance Benchmarks', () => {
  let serverProcess;

  // Spawn server.js as a child process before any benchmarks run
  before(async () => {
    serverProcess = spawnServer();
    await waitForReady(serverProcess);
  });

  // Cleanly terminate the server process after all benchmarks complete
  after(async () => {
    if (serverProcess) {
      await stopServer(serverProcess);
    }
  });

  // -------------------------------------------------------------------------
  // Test Case 1 — Light load latency baseline
  // -------------------------------------------------------------------------

  it('should handle 10 concurrent connections with average latency under 10ms', { timeout: 30000 }, async () => {
    const result = await runBenchmark({
      connections: 10,
      duration: 5
    });

    // Average latency should remain under 10ms for a trivial static response
    assert.ok(
      result.latency.average < 10,
      `Average latency ${result.latency.average}ms exceeds 10ms baseline threshold`
    );

    // Zero connection/network errors expected under light load
    assert.strictEqual(
      result.errors, 0,
      `Expected zero errors but got ${result.errors}`
    );
  });

  // -------------------------------------------------------------------------
  // Test Case 2 — Minimum throughput baseline
  // -------------------------------------------------------------------------

  it('should achieve minimum throughput of 1000 req/sec', { timeout: 30000 }, async () => {
    const result = await runBenchmark({
      connections: 10,
      duration: 5
    });

    const requestsPerSec = result.requests.average;

    // A static-response server should comfortably exceed 1000 req/sec
    assert.ok(
      requestsPerSec > 1000,
      `Throughput ${requestsPerSec} req/sec is below 1000 req/sec baseline threshold`
    );

    // Sanity check: requests were actually sent and processed
    assert.ok(
      result.requests.total > 0,
      'Expected non-zero total requests'
    );
  });

  // -------------------------------------------------------------------------
  // Test Case 3 — Heavy load error resilience
  // -------------------------------------------------------------------------

  it('should produce zero errors under 100-connection load', { timeout: 30000 }, async () => {
    const result = await runBenchmark({
      connections: 100,
      duration: 5
    });

    // Zero network/connection errors under heavy concurrent load
    assert.strictEqual(
      result.errors, 0,
      `Expected zero errors under 100-connection load but got ${result.errors}`
    );

    // All responses should be 2xx status codes
    assert.strictEqual(
      result.non2xx, 0,
      `Expected zero non-2xx responses but got ${result.non2xx}`
    );
  });

  // -------------------------------------------------------------------------
  // Test Case 4 — Tail latency at moderate load
  // -------------------------------------------------------------------------

  it('should maintain p99 latency under 50ms at moderate load', { timeout: 30000 }, async () => {
    const result = await runBenchmark({
      connections: 50,
      duration: 5
    });

    // p99 latency should stay under 50ms for a static-response server
    assert.ok(
      result.latency.p99 < 50,
      `P99 latency ${result.latency.p99}ms exceeds 50ms baseline threshold`
    );

    // p97.5 latency should also be well within tolerance (autocannon uses p97_5)
    assert.ok(
      result.latency.p97_5 < 50,
      `P97.5 latency ${result.latency.p97_5}ms exceeds 50ms baseline threshold`
    );
  });

  // -------------------------------------------------------------------------
  // Test Case 5 — Sustained load without degradation
  // -------------------------------------------------------------------------

  it('should handle sustained 10-second benchmark without degradation', { timeout: 60000 }, async () => {
    const result = await runBenchmark({
      connections: 10,
      duration: 10
    });

    // Zero errors during the extended sustained period
    assert.strictEqual(
      result.errors, 0,
      `Expected zero errors during sustained load but got ${result.errors}`
    );

    // Throughput should remain above the 1000 req/sec baseline
    assert.ok(
      result.requests.average > 1000,
      `Sustained throughput ${result.requests.average} req/sec below 1000 req/sec baseline threshold`
    );

    // Average latency should stay stable under sustained load
    assert.ok(
      result.latency.average < 10,
      `Sustained average latency ${result.latency.average}ms exceeds 10ms baseline threshold`
    );
  });
});
