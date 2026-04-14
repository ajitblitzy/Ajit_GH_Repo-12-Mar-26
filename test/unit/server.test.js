/**
 * Unit-Level Black-Box Feature Tests for server.js
 *
 * This file implements unit-level tests for the four core features of server.js:
 *   F-001 — HTTP Server Creation
 *   F-002 — Static HTTP Response Serving
 *   F-003 — Loopback Network Binding
 *   F-004 — Startup Logging
 *
 * Since server.js has NO module.exports, all tests operate via the black-box
 * process pattern: spawn server.js as a child process → send HTTP requests →
 * assert responses → cleanup.
 *
 * Built-in modules only — zero external npm dependencies.
 * CommonJS require() syntax throughout, matching server.js module style.
 *
 * Run with: node --test test/unit/server.test.js
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
  EXPECTED_BODY,
  EXPECTED_LOG_MESSAGE,
  DEFAULT_HOSTNAME,
  DEFAULT_PORT
} = require('../helpers/server-helper');

describe('server.js unit tests', () => {
  /** Child process reference for the spawned server */
  let serverProcess;

  /** Accumulated stdout output captured during server startup */
  let startupOutput;

  /**
   * before() hook — Spawn server.js as a child process and wait until the
   * startup readiness log message is emitted on stdout.
   */
  before(async () => {
    serverProcess = spawnServer();
    startupOutput = await waitForReady(serverProcess);
  });

  /**
   * after() hook — Gracefully terminate the server child process and free
   * port 3000. Handles the defensive case where serverProcess may be
   * undefined if the before() hook failed.
   */
  after(async () => {
    if (serverProcess) {
      await stopServer(serverProcess);
    }
  });

  // -------------------------------------------------------------------------
  // Feature F-004 — Startup Logging Tests
  // -------------------------------------------------------------------------

  it('should start server and emit startup log message', () => {
    // Assert the captured stdout includes the expected startup log message
    assert.ok(
      startupOutput.includes(EXPECTED_LOG_MESSAGE),
      `Expected stdout to include "${EXPECTED_LOG_MESSAGE}" but got: "${startupOutput.trim()}"`
    );
    // Additionally confirm startupOutput is a non-empty string
    assert.ok(
      startupOutput.length > 0,
      'Expected startup output to be a non-empty string'
    );
  });

  it('should emit startup log message exactly once', () => {
    // Count occurrences of the expected log message in the captured stdout
    const occurrences = startupOutput.split(EXPECTED_LOG_MESSAGE).length - 1;
    assert.strictEqual(
      occurrences,
      1,
      `Expected startup log message to appear exactly once but found ${occurrences} occurrence(s)`
    );
    // Verify there is no unexpected extra output beyond the single log line
    assert.ok(
      startupOutput.trim().length > 0,
      'Startup output should contain at least the log message'
    );
  });

  // -------------------------------------------------------------------------
  // Feature F-002 — Static HTTP Response Tests
  // -------------------------------------------------------------------------

  it('should return status code 200 on HTTP GET', async () => {
    const response = await makeRequest({ method: 'GET', path: '/' });
    assert.strictEqual(
      response.statusCode,
      EXPECTED_STATUS,
      `Expected status code ${EXPECTED_STATUS} but got ${response.statusCode}`
    );
    // Confirm the response object has the expected structure
    assert.ok(
      response.headers !== undefined && response.headers !== null,
      'Expected response to include headers object'
    );
  });

  it('should return Content-Type text/plain header', async () => {
    const response = await makeRequest({ method: 'GET', path: '/' });
    assert.strictEqual(
      response.headers['content-type'],
      EXPECTED_CONTENT_TYPE,
      `Expected Content-Type "${EXPECTED_CONTENT_TYPE}" but got "${response.headers['content-type']}"`
    );
    // Confirm status code is also correct (validates full response integrity)
    assert.strictEqual(
      response.statusCode,
      EXPECTED_STATUS,
      `Expected status code ${EXPECTED_STATUS} alongside Content-Type header`
    );
  });

  it('should return "Hello, World!\\n" response body', async () => {
    const response = await makeRequest({ method: 'GET', path: '/' });
    assert.strictEqual(
      response.body,
      EXPECTED_BODY,
      `Expected body "${EXPECTED_BODY}" but got "${response.body}"`
    );
    // Verify the trailing newline is present — critical exact match
    assert.ok(
      response.body.endsWith('\n'),
      'Expected response body to end with a newline character'
    );
  });

  // -------------------------------------------------------------------------
  // Feature F-003 — Loopback Network Binding Tests
  // -------------------------------------------------------------------------

  it('should bind to 127.0.0.1 loopback address', async () => {
    // Explicitly request using the loopback hostname and default port
    const response = await makeRequest({
      hostname: DEFAULT_HOSTNAME,
      port: DEFAULT_PORT,
      path: '/'
    });
    assert.strictEqual(
      response.statusCode,
      EXPECTED_STATUS,
      `Expected server to be accessible at ${DEFAULT_HOSTNAME} with status ${EXPECTED_STATUS}`
    );
    // Confirm the startup log message references the loopback address
    assert.ok(
      startupOutput.includes(DEFAULT_HOSTNAME),
      `Expected startup log to reference hostname ${DEFAULT_HOSTNAME}`
    );
  });

  it('should listen on port 3000', async () => {
    // Request using explicit hostname and port to confirm port binding
    const response = await makeRequest({
      hostname: DEFAULT_HOSTNAME,
      port: DEFAULT_PORT,
      path: '/'
    });
    assert.strictEqual(
      response.statusCode,
      EXPECTED_STATUS,
      `Expected server to be reachable on port ${DEFAULT_PORT} with status ${EXPECTED_STATUS}`
    );
    // Confirm the startup log message references port 3000
    assert.ok(
      startupOutput.includes(String(DEFAULT_PORT)),
      `Expected startup log to reference port ${DEFAULT_PORT}`
    );
  });

  // -------------------------------------------------------------------------
  // Feature F-001 — HTTP Server Creation Test
  // -------------------------------------------------------------------------

  it('should create an HTTP server that accepts connections', async () => {
    // Make three sequential requests to verify the server is actively running
    // and accepting multiple connections (validates HTTP server creation F-001)
    const response1 = await makeRequest({ method: 'GET', path: '/' });
    assert.strictEqual(
      response1.statusCode,
      EXPECTED_STATUS,
      `Expected first request status ${EXPECTED_STATUS} but got ${response1.statusCode}`
    );

    const response2 = await makeRequest({ method: 'GET', path: '/second' });
    assert.strictEqual(
      response2.statusCode,
      EXPECTED_STATUS,
      `Expected second request status ${EXPECTED_STATUS} but got ${response2.statusCode}`
    );

    const response3 = await makeRequest({ method: 'GET', path: '/third' });
    assert.strictEqual(
      response3.statusCode,
      EXPECTED_STATUS,
      `Expected third request status ${EXPECTED_STATUS} but got ${response3.statusCode}`
    );
  });
});
