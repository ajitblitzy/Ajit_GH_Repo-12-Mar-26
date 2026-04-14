/**
 * Integration Tests — HTTP Protocol Behavior
 *
 * Validates end-to-end HTTP request-response behavior across all standard
 * HTTP methods (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS), various URL
 * paths, query strings, and custom request headers.
 *
 * The server under test (server.js) is a route-agnostic handler that returns
 * the SAME response (status 200, Content-Type text/plain, body "Hello, World!\n")
 * regardless of HTTP method, URL path, query string, or request headers.
 *
 * Testing Pattern:
 * - Black-box process testing — server.js is spawned as a child process
 * - Shared helper module provides lifecycle management and HTTP utilities
 * - Server is spawned ONCE in before() and stopped in after() for efficiency
 * - All assertions use node:assert strict methods
 *
 * Execution:
 *   node --test test/integration/server.integration.test.js
 *
 * @module test/integration/server.integration.test
 */

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const {
  spawnServer,
  waitForReady,
  stopServer,
  makeRequest,
  EXPECTED_STATUS,
  EXPECTED_CONTENT_TYPE,
  EXPECTED_BODY
} = require('../helpers/server-helper');

describe('Integration Tests - HTTP Protocol Behavior', () => {
  /**
   * Holds the spawned server child process reference.
   * Initialised in the before() hook, terminated in the after() hook.
   */
  let server;

  // --------------------------------------------------------------------------
  // Lifecycle Hooks — spawn once, tear down once
  // --------------------------------------------------------------------------

  before(async () => {
    server = spawnServer();
    await waitForReady(server);
  });

  after(async () => {
    await stopServer(server);
  });

  // --------------------------------------------------------------------------
  // Phase 3: HTTP Method Coverage (7 tests)
  // Verifies the server returns identical responses for all standard methods.
  // --------------------------------------------------------------------------

  it('should return identical response for GET request', async () => {
    const response = await makeRequest({ method: 'GET', path: '/' });

    assert.strictEqual(response.statusCode, EXPECTED_STATUS,
      `Expected status ${EXPECTED_STATUS}, got ${response.statusCode}`);
    assert.ok(response.headers['content-type'].includes(EXPECTED_CONTENT_TYPE),
      `Expected Content-Type to include "${EXPECTED_CONTENT_TYPE}", got "${response.headers['content-type']}"`);
    assert.strictEqual(response.body, EXPECTED_BODY,
      `Expected body "${EXPECTED_BODY}", got "${response.body}"`);
  });

  it('should return identical response for POST request', async () => {
    const response = await makeRequest({ method: 'POST', path: '/' });

    assert.strictEqual(response.statusCode, EXPECTED_STATUS,
      `Expected status ${EXPECTED_STATUS}, got ${response.statusCode}`);
    assert.ok(response.headers['content-type'].includes(EXPECTED_CONTENT_TYPE),
      `Expected Content-Type to include "${EXPECTED_CONTENT_TYPE}", got "${response.headers['content-type']}"`);
    assert.strictEqual(response.body, EXPECTED_BODY,
      `Expected body "${EXPECTED_BODY}", got "${response.body}"`);
  });

  it('should return identical response for PUT request', async () => {
    const response = await makeRequest({ method: 'PUT', path: '/' });

    assert.strictEqual(response.statusCode, EXPECTED_STATUS,
      `Expected status ${EXPECTED_STATUS}, got ${response.statusCode}`);
    assert.ok(response.headers['content-type'].includes(EXPECTED_CONTENT_TYPE),
      `Expected Content-Type to include "${EXPECTED_CONTENT_TYPE}", got "${response.headers['content-type']}"`);
    assert.strictEqual(response.body, EXPECTED_BODY,
      `Expected body "${EXPECTED_BODY}", got "${response.body}"`);
  });

  it('should return identical response for DELETE request', async () => {
    const response = await makeRequest({ method: 'DELETE', path: '/' });

    assert.strictEqual(response.statusCode, EXPECTED_STATUS,
      `Expected status ${EXPECTED_STATUS}, got ${response.statusCode}`);
    assert.ok(response.headers['content-type'].includes(EXPECTED_CONTENT_TYPE),
      `Expected Content-Type to include "${EXPECTED_CONTENT_TYPE}", got "${response.headers['content-type']}"`);
    assert.strictEqual(response.body, EXPECTED_BODY,
      `Expected body "${EXPECTED_BODY}", got "${response.body}"`);
  });

  it('should return identical response for PATCH request', async () => {
    const response = await makeRequest({ method: 'PATCH', path: '/' });

    assert.strictEqual(response.statusCode, EXPECTED_STATUS,
      `Expected status ${EXPECTED_STATUS}, got ${response.statusCode}`);
    assert.ok(response.headers['content-type'].includes(EXPECTED_CONTENT_TYPE),
      `Expected Content-Type to include "${EXPECTED_CONTENT_TYPE}", got "${response.headers['content-type']}"`);
    assert.strictEqual(response.body, EXPECTED_BODY,
      `Expected body "${EXPECTED_BODY}", got "${response.body}"`);
  });

  it('should return correct headers for HEAD request', async () => {
    const response = await makeRequest({ method: 'HEAD', path: '/' });

    // HEAD requests receive status and headers but NO body per HTTP/1.1 spec
    assert.strictEqual(response.statusCode, EXPECTED_STATUS,
      `Expected status ${EXPECTED_STATUS}, got ${response.statusCode}`);
    assert.ok(response.headers['content-type'].includes(EXPECTED_CONTENT_TYPE),
      `Expected Content-Type to include "${EXPECTED_CONTENT_TYPE}", got "${response.headers['content-type']}"`);
    assert.strictEqual(response.body, '',
      'HEAD request should return empty body per HTTP/1.1 specification');
  });

  it('should respond to OPTIONS request', async () => {
    const response = await makeRequest({ method: 'OPTIONS', path: '/' });

    assert.strictEqual(response.statusCode, EXPECTED_STATUS,
      `Expected status ${EXPECTED_STATUS}, got ${response.statusCode}`);
    assert.ok(response.headers['content-type'].includes(EXPECTED_CONTENT_TYPE),
      `Expected Content-Type to include "${EXPECTED_CONTENT_TYPE}", got "${response.headers['content-type']}"`);
    assert.strictEqual(response.body, EXPECTED_BODY,
      `Expected body "${EXPECTED_BODY}", got "${response.body}"`);
  });

  // --------------------------------------------------------------------------
  // Phase 4: URL Path Variation (2 tests)
  // Verifies the server responds identically regardless of URL path.
  // --------------------------------------------------------------------------

  it('should return same response for /any/path URL', async () => {
    // Test with a simple path
    const response = await makeRequest({ method: 'GET', path: '/any/path' });

    assert.strictEqual(response.statusCode, EXPECTED_STATUS,
      `Expected status ${EXPECTED_STATUS} for /any/path, got ${response.statusCode}`);
    assert.ok(response.headers['content-type'].includes(EXPECTED_CONTENT_TYPE),
      `Expected Content-Type to include "${EXPECTED_CONTENT_TYPE}" for /any/path`);
    assert.strictEqual(response.body, EXPECTED_BODY,
      `Expected body "${EXPECTED_BODY}" for /any/path, got "${response.body}"`);

    // Bonus: deeply nested path to confirm route-agnostic behavior
    const deepResponse = await makeRequest({ method: 'GET', path: '/with/deep/nesting/levels' });

    assert.strictEqual(deepResponse.statusCode, EXPECTED_STATUS,
      `Expected status ${EXPECTED_STATUS} for deeply nested path`);
    assert.ok(deepResponse.headers['content-type'].includes(EXPECTED_CONTENT_TYPE),
      'Expected correct Content-Type for deeply nested path');
    assert.strictEqual(deepResponse.body, EXPECTED_BODY,
      'Expected correct body for deeply nested path');
  });

  it('should return same response for URL with query parameters', async () => {
    const response = await makeRequest({ method: 'GET', path: '/?key=value&foo=bar' });

    assert.strictEqual(response.statusCode, EXPECTED_STATUS,
      `Expected status ${EXPECTED_STATUS} for URL with query parameters`);
    assert.ok(response.headers['content-type'].includes(EXPECTED_CONTENT_TYPE),
      `Expected Content-Type to include "${EXPECTED_CONTENT_TYPE}" for URL with query parameters`);
    assert.strictEqual(response.body, EXPECTED_BODY,
      `Expected body "${EXPECTED_BODY}" for URL with query parameters`);
  });

  // --------------------------------------------------------------------------
  // Phase 5: Behavioral Consistency (2 tests)
  // Verifies the server handles repeated and custom-header requests correctly.
  // --------------------------------------------------------------------------

  it('should handle multiple sequential requests consistently', async () => {
    const requestCount = 10;

    for (let i = 0; i < requestCount; i++) {
      const response = await makeRequest({ method: 'GET', path: '/' });

      assert.strictEqual(response.statusCode, EXPECTED_STATUS,
        `Request ${i + 1}/${requestCount}: expected status ${EXPECTED_STATUS}, got ${response.statusCode}`);
      assert.ok(response.headers['content-type'].includes(EXPECTED_CONTENT_TYPE),
        `Request ${i + 1}/${requestCount}: expected Content-Type to include "${EXPECTED_CONTENT_TYPE}"`);
      assert.strictEqual(response.body, EXPECTED_BODY,
        `Request ${i + 1}/${requestCount}: expected body "${EXPECTED_BODY}", got "${response.body}"`);
    }
  });

  it('should handle request with custom headers', async () => {
    const response = await makeRequest({
      method: 'GET',
      path: '/',
      headers: {
        'X-Custom-Header': 'test-value',
        'Accept': 'application/json',
        'Authorization': 'Bearer fake-token'
      }
    });

    assert.strictEqual(response.statusCode, EXPECTED_STATUS,
      `Expected status ${EXPECTED_STATUS} with custom headers, got ${response.statusCode}`);
    assert.ok(response.headers['content-type'].includes(EXPECTED_CONTENT_TYPE),
      `Expected Content-Type to include "${EXPECTED_CONTENT_TYPE}" with custom headers`);
    assert.strictEqual(response.body, EXPECTED_BODY,
      `Expected body "${EXPECTED_BODY}" with custom headers, got "${response.body}"`);
  });
});
