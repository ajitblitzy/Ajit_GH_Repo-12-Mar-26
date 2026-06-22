'use strict';

const { performance } = require('node:perf_hooks');
const { startServerProcess, stopServerProcess } = require('../helpers/server-harness');
const { request, percentile } = require('../helpers/http-client');
const expected = require('../fixtures/expected');

const CONCURRENCY = Number(process.env.CONCURRENCY || 50);
const TOTAL_REQUESTS = Number(process.env.TOTAL_REQUESTS || 2000);

function driveLoad() {
  const latencies = [];
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
            const dt = performance.now() - t0;
            if (res.statusCode === expected.statusCode && res.body === expected.body) latencies.push(dt);
            else errors += 1;
          })
          .catch(() => { errors += 1; })
          .finally(() => {
            inFlight -= 1; completed += 1;
            if (completed === TOTAL_REQUESTS) resolve({ latencies, errors, completed, runMs: performance.now() - runStart });
            else launchMore();
          });
      }
    };
    launchMore();
  });
}

async function main() {
  console.log('--- hao-backprop-test performance / load test ---');
  console.log(`concurrency=${CONCURRENCY} totalRequests=${TOTAL_REQUESTS}`);
  const spawnStart = performance.now();
  const handle = await startServerProcess();
  await request({ method: 'GET', path: '/', host: expected.host, port: expected.port });
  const startupLatencyMs = performance.now() - spawnStart;
  const { latencies, errors, completed, runMs } = await driveLoad();
  await stopServerProcess(handle.child);
  const throughput = (completed / runMs) * 1000;
  const errorRate = completed > 0 ? errors / completed : 0;
  const stable = errors === 0;
  console.log(`requests=${completed} errors=${errors} (${(errorRate * 100).toFixed(2)}%) duration=${runMs.toFixed(1)}ms`);
  console.log(`throughput=${throughput.toFixed(1)} req/s  startupLatency=${startupLatencyMs.toFixed(1)}ms`);
  console.log(`p50=${percentile(latencies,50).toFixed(3)}ms p95=${percentile(latencies,95).toFixed(3)}ms p99=${percentile(latencies,99).toFixed(3)}ms`);
  console.log(`stability=${stable ? 'PASS' : 'FAIL'}`);
  if (errors > 0) { console.error(`FAILURE: ${errors} errored.`); process.exit(1); }
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
