'use strict';

const http = require('node:http');
const { performance } = require('node:perf_hooks');

// Promisified HTTP request over the built-in http module.
// Resolves { statusCode, headers, body } where body is the fully collected response string.
function request({ method = 'GET', path = '/', host = '127.0.0.1', port = 3000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ method, path, host, port }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Measure a single request's round-trip latency in milliseconds.
async function timedRequest(opts) {
  const start = performance.now();
  const res = await request(opts);
  return { ...res, latencyMs: performance.now() - start };
}

// Compute the p-th percentile (0..100) of a numeric sample array.
// Defensive: handles empty arrays (returns 0) and sorts a copy.
function percentile(samples, p) {
  if (!Array.isArray(samples) || samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const frac = rank - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

module.exports = { request, timedRequest, percentile };
