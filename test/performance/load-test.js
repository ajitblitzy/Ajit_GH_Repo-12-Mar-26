'use strict';

const { performance } = require('node:perf_hooks');
const { startServerProcess, stopServerProcess } = require('../helpers/server-harness');
const { request, percentile } = require('../helpers/http-client');
const expected = require('../fixtures/expected');

// Load size (env-configurable). CONCURRENCY caps the number of in-flight requests;
// TOTAL_REQUESTS is how many are issued in total.
const CONCURRENCY = Number(process.env.CONCURRENCY || 50);
const TOTAL_REQUESTS = Number(process.env.TOTAL_REQUESTS || 2000);

// Soft, environment-relative error tolerance (env-configurable). The AAP frames
// performance thresholds as soft/environment-relative rather than contractual SLAs,
// so a single transient request failure on a constrained/CI host should not force a
// hard failure. Defaults are strict (0) — preserving zero-tolerance behavior — while
// allowing operators to loosen the threshold. The run fails only when the observed
// error count exceeds MAX_ERRORS OR the observed error rate exceeds MAX_ERROR_RATE.
const MAX_ERRORS = Number(process.env.MAX_ERRORS || 0);
const MAX_ERROR_RATE = Number(process.env.MAX_ERROR_RATE || 0);

// Validate the env-configurable run parameters up front so an invalid value fails
// fast with a clear diagnostic instead of, e.g., a zero/NaN CONCURRENCY or
// TOTAL_REQUESTS causing driveLoad() to launch no requests and never resolve (hang).
function validateConfig() {
  const positiveInt = (name, value) => {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Invalid ${name}=${value}: must be a positive integer.`);
    }
  };
  positiveInt('CONCURRENCY', CONCURRENCY);
  positiveInt('TOTAL_REQUESTS', TOTAL_REQUESTS);
  if (!Number.isInteger(MAX_ERRORS) || MAX_ERRORS < 0) {
    throw new Error(`Invalid MAX_ERRORS=${MAX_ERRORS}: must be a non-negative integer.`);
  }
  if (!Number.isFinite(MAX_ERROR_RATE) || MAX_ERROR_RATE < 0 || MAX_ERROR_RATE > 1) {
    throw new Error(`Invalid MAX_ERROR_RATE=${MAX_ERROR_RATE}: must be a number between 0 and 1 (inclusive).`);
  }
}

function driveLoad() {
  const latencies = [];
  let successes = 0;
  let errors = 0;
  let issued = 0;
  let completed = 0;
  let inFlight = 0;
  return new Promise((resolve) => {
    const runStart = performance.now();
    const launchMore = () => {
      while (inFlight < CONCURRENCY && issued < TOTAL_REQUESTS) {
        issued += 1; inFlight += 1;
        const t0 = performance.now();
        request({ method: 'GET', path: '/', host: expected.host, port: expected.port })
          .then((res) => {
            // Record the round-trip latency for EVERY completed HTTP response BEFORE
            // success/error classification, so p50/p95/p99 reflect true per-request
            // latency across all responses (not only the contract-matching ones).
            latencies.push(performance.now() - t0);
            if (res.statusCode === expected.statusCode && res.body === expected.body) successes += 1;
            else errors += 1;
          })
          // A connection-level failure is NOT a completed HTTP response, so it
          // contributes an error but no latency sample.
          .catch(() => { errors += 1; })
          .finally(() => {
            inFlight -= 1; completed += 1;
            if (completed === TOTAL_REQUESTS) {
              resolve({ latencies, successes, errors, completed, runMs: performance.now() - runStart });
            } else {
              launchMore();
            }
          });
      }
    };
    launchMore();
  });
}

async function main() {
  // Fail fast on invalid configuration BEFORE spawning the server.
  validateConfig();
  console.log('--- hao-backprop-test performance / load test ---');
  console.log(`concurrency=${CONCURRENCY} totalRequests=${TOTAL_REQUESTS} maxErrors=${MAX_ERRORS} maxErrorRate=${MAX_ERROR_RATE}`);
  const spawnStart = performance.now();
  const handle = await startServerProcess();
  let result;
  // Guarantee the spawned server child is ALWAYS reaped — even if the warm-up
  // request, driveLoad(), or any later step throws — so the run can never orphan a
  // `node server.js` process holding port 3000 (test isolation / resource safety).
  try {
    // Startup latency = time from spawn to the FIRST successful, contract-compliant
    // response. Validate the warm-up so a regressed SUT (wrong status/body) cannot be
    // silently counted as a successful startup.
    const warmup = await request({ method: 'GET', path: '/', host: expected.host, port: expected.port });
    const startupLatencyMs = performance.now() - spawnStart;
    if (warmup.statusCode !== expected.statusCode || warmup.body !== expected.body) {
      throw new Error(
        `Warm-up request did not meet the contract: statusCode=${warmup.statusCode} `
        + `body=${JSON.stringify(warmup.body)} (expected statusCode=${expected.statusCode} `
        + `body=${JSON.stringify(expected.body)}).`,
      );
    }
    const load = await driveLoad();
    result = { startupLatencyMs, ...load };
  } finally {
    await stopServerProcess(handle.child);
  }

  // Report metrics and decide pass/fail ONLY after server cleanup is guaranteed above.
  const { startupLatencyMs, latencies, successes, errors, completed, runMs } = result;
  const throughput = (completed / runMs) * 1000;
  const errorRate = completed > 0 ? errors / completed : 0;
  // Soft, environment-relative verdict: stable iff the observed errors stay within
  // BOTH the absolute (MAX_ERRORS) and rate (MAX_ERROR_RATE) tolerances.
  const withinTolerance = errors <= MAX_ERRORS && errorRate <= MAX_ERROR_RATE;
  console.log(`requests=${completed} ok=${successes} errors=${errors} (${(errorRate * 100).toFixed(2)}%) duration=${runMs.toFixed(1)}ms`);
  console.log(`throughput=${throughput.toFixed(1)} req/s  startupLatency=${startupLatencyMs.toFixed(1)}ms`);
  console.log(`p50=${percentile(latencies,50).toFixed(3)}ms p95=${percentile(latencies,95).toFixed(3)}ms p99=${percentile(latencies,99).toFixed(3)}ms`);
  console.log(`stability=${withinTolerance ? 'PASS' : 'FAIL'}`);
  if (!withinTolerance) {
    console.error(`FAILURE: ${errors} error(s) (rate ${(errorRate * 100).toFixed(2)}%) exceeded tolerance (MAX_ERRORS=${MAX_ERRORS}, MAX_ERROR_RATE=${MAX_ERROR_RATE}).`);
    process.exit(1);
  }
  console.log('PERF OK');
}

// Run ONLY when executed directly (e.g. `node test/performance/load-test.js`).
// The extra NODE_TEST_CONTEXT check defends against accidental pickup by
// `node --test` default discovery (which sets NODE_TEST_CONTEXT='child-v8' and
// runs files as main) so the heavy load run never executes inside the assertion
// suite. The primary protection is running the suite via the 'test/**/*.test.js'
// glob, which excludes this non-*.test.js file entirely.
if (require.main === module && !process.env.NODE_TEST_CONTEXT) {
  main().catch((err) => { console.error('Performance harness crashed:', err); process.exit(1); });
} else {
  module.exports = { main, driveLoad };
}
