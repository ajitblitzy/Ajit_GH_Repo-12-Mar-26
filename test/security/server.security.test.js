/**
 * Security Resilience Tests — server.js
 *
 * Validates the HTTP server's behavior against common HTTP attack vectors
 * including CRLF header injection, path traversal payloads, large request
 * bodies, oversized Content-Length headers, HTTP method abuse (TRACE/CONNECT),
 * rapid connection cycling (slowloris pattern), and information leakage.
 *
 * Testing approach: Black-box process pattern — the server is spawned as a
 * child process and tested via real HTTP requests and raw TCP sockets.
 * Raw sockets (node:net) are used where the http module would sanitize
 * malicious payloads before they reach the server.
 *
 * Dependencies: ONLY Node.js built-in modules (node:test, node:assert,
 * node:net) plus the shared test helper (../helpers/server-helper).
 * No external npm packages are used.
 */

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const net = require('node:net');
const {
  spawnServer,
  waitForReady,
  stopServer,
  makeRequest,
  EXPECTED_STATUS,
  EXPECTED_CONTENT_TYPE,
  EXPECTED_BODY
} = require('../helpers/server-helper');

// ---------------------------------------------------------------------------
// Internal Helper — Raw TCP Socket Request
// ---------------------------------------------------------------------------

/**
 * Sends raw data over a TCP socket to the server and returns the full
 * response as a string. Used for crafting malformed HTTP requests that
 * cannot be sent via the built-in http module (which sanitizes headers
 * and methods).
 *
 * @param {string} rawData - The raw HTTP request bytes to send.
 * @param {number} [timeout=3000] - Socket timeout in milliseconds.
 * @returns {Promise<string>} Resolves with the raw response string.
 */
const rawSocketRequest = (rawData, timeout = 3000) => {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = '';

    socket.setTimeout(timeout);

    socket.connect(3000, '127.0.0.1', () => {
      socket.write(rawData);
    });

    socket.on('data', (data) => {
      response += data.toString();
    });

    socket.on('end', () => {
      socket.destroy();
      resolve(response);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(response); // Resolve with whatever data was received
    });

    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });
  });
};

// ---------------------------------------------------------------------------
// Security Test Suite
// ---------------------------------------------------------------------------

describe('Security Tests — server.js', () => {
  let serverProcess;

  before(async () => {
    serverProcess = spawnServer();
    await waitForReady(serverProcess);
  });

  after(async () => {
    await stopServer(serverProcess);
  });

  // -------------------------------------------------------------------------
  // Test Case 1: CRLF Header Injection
  // -------------------------------------------------------------------------

  it('should not be vulnerable to CRLF header injection', async () => {
    // Craft a raw HTTP request with CRLF sequences in a header value
    // attempting to inject an additional "Injected-Header" into the response.
    const maliciousRequest =
      'GET / HTTP/1.1\r\n' +
      'Host: 127.0.0.1:3000\r\n' +
      'X-Test: value\r\nInjected-Header: malicious\r\n' +
      'Connection: close\r\n' +
      '\r\n';

    const response = await rawSocketRequest(maliciousRequest);

    // Server must respond (not crash)
    assert.ok(response.length > 0, 'Server should return a non-empty response');

    // Response status line should indicate HTTP 200
    assert.match(response, /HTTP\/1\.1 200/, 'Response should contain HTTP 200 status');

    // Response body should be the normal static response
    assert.ok(
      response.includes('Hello, World!'),
      'Response body should contain the expected Hello, World! text'
    );

    // The injected header value should NOT appear in the response headers
    // (i.e., the server should not reflect injected headers back)
    const headerSection = response.split('\r\n\r\n')[0] || '';
    assert.strictEqual(
      headerSection.includes('Injected-Header'),
      false,
      'Injected header should not appear in response headers'
    );
  });

  // -------------------------------------------------------------------------
  // Test Case 2: Path Traversal Attempts
  // -------------------------------------------------------------------------

  it('should handle path traversal attempts without exposing file system', async () => {
    const traversalPaths = [
      '/../../../etc/passwd',
      '/..%2F..%2F..%2Fetc%2Fpasswd',
      '/../../../server.js',
      '/./../../..'
    ];

    for (const traversalPath of traversalPaths) {
      const result = await makeRequest({ path: traversalPath });

      // Server should return the normal static response for all paths
      assert.strictEqual(
        result.statusCode,
        EXPECTED_STATUS,
        `Path traversal "${traversalPath}" should return status ${EXPECTED_STATUS}`
      );

      assert.ok(
        result.headers['content-type'].includes(EXPECTED_CONTENT_TYPE),
        `Path traversal "${traversalPath}" should return Content-Type ${EXPECTED_CONTENT_TYPE}`
      );

      assert.strictEqual(
        result.body,
        EXPECTED_BODY,
        `Path traversal "${traversalPath}" should return the expected body`
      );

      // Verify response does NOT contain file system content
      assert.strictEqual(
        result.body.includes('root:'),
        false,
        `Path traversal "${traversalPath}" should not expose /etc/passwd content`
      );

      assert.strictEqual(
        result.body.includes('const http'),
        false,
        `Path traversal "${traversalPath}" should not expose server.js source code`
      );
    }
  });

  // -------------------------------------------------------------------------
  // Test Case 3: Large Request Body
  // -------------------------------------------------------------------------

  it('should survive large request body without crashing', async () => {
    // Generate a 1MB request body
    const largeBody = 'x'.repeat(1024 * 1024);

    const result = await makeRequest({
      method: 'POST',
      body: largeBody,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(largeBody.length)
      }
    });

    // Server should respond normally despite the large body
    assert.strictEqual(
      result.statusCode,
      EXPECTED_STATUS,
      'Server should return status 200 after receiving large body'
    );

    assert.strictEqual(
      result.body,
      EXPECTED_BODY,
      'Server should return normal response body after receiving large body'
    );

    // Verify server is still responsive with a follow-up request
    const followUp = await makeRequest();

    assert.strictEqual(
      followUp.statusCode,
      EXPECTED_STATUS,
      'Server should remain responsive after large body request'
    );

    assert.strictEqual(
      followUp.body,
      EXPECTED_BODY,
      'Follow-up request should return normal response body'
    );
  });

  // -------------------------------------------------------------------------
  // Test Case 4: Oversized Content-Length Header
  // -------------------------------------------------------------------------

  it('should handle oversized Content-Length header gracefully', async () => {
    // Send a raw HTTP request claiming a massive Content-Length but providing
    // minimal body. Using raw sockets gives complete control over the wire
    // format and avoids the http module's own Content-Length enforcement.
    // The server may respond immediately or the connection may time out.
    // Either outcome is acceptable as long as the server does not crash.

    const oversizedRequest =
      'POST / HTTP/1.1\r\n' +
      'Host: 127.0.0.1:3000\r\n' +
      'Content-Length: 999999999\r\n' +
      'Connection: close\r\n' +
      '\r\n' +
      'tiny';

    let responseReceived = false;
    let errorOccurred = false;

    try {
      const response = await rawSocketRequest(oversizedRequest, 2000);
      if (response.length > 0) {
        // If the server responded, it should contain the normal response
        assert.match(response, /200/, 'Oversized Content-Length response should contain 200 status');
        responseReceived = true;
      } else {
        // Empty response is acceptable — server may be waiting for data
        responseReceived = true;
      }
    } catch (_err) {
      // Socket timeout, ECONNRESET, or other errors are acceptable
      // The key test is that the server didn't crash
      errorOccurred = true;
    }

    assert.ok(
      responseReceived || errorOccurred,
      'Oversized Content-Length request should be handled without server crash'
    );

    // The critical assertion: the server must still be alive and responsive
    const followUp = await makeRequest();

    assert.strictEqual(
      followUp.statusCode,
      EXPECTED_STATUS,
      'Server should remain responsive after oversized Content-Length request'
    );

    assert.strictEqual(
      followUp.body,
      EXPECTED_BODY,
      'Follow-up request should return normal response body'
    );
  });

  // -------------------------------------------------------------------------
  // Test Case 5: HTTP Method Abuse (TRACE and CONNECT)
  // -------------------------------------------------------------------------

  it('should respond consistently to all HTTP methods including TRACE and CONNECT', async () => {
    // Test TRACE via raw socket (http module may not handle it cleanly)
    const traceRequest =
      'TRACE / HTTP/1.1\r\n' +
      'Host: 127.0.0.1:3000\r\n' +
      'Connection: close\r\n' +
      '\r\n';

    const traceResponse = await rawSocketRequest(traceRequest);

    // Server should respond with 200 (method-agnostic behavior)
    assert.ok(traceResponse.length > 0, 'TRACE request should receive a response');
    assert.match(
      traceResponse,
      /HTTP\/1\.1 200/,
      'TRACE response should contain HTTP 200 status'
    );

    // TRACE should NOT echo the request back in the response body
    assert.strictEqual(
      traceResponse.includes('TRACE / HTTP'),
      false,
      'TRACE response should not echo the request back (message/http reflection)'
    );

    // Test CONNECT via raw socket.
    // CONNECT is special in HTTP — Node.js HTTP server emits a 'connect' event
    // instead of the 'request' event. Since server.js does not handle the
    // 'connect' event, no response is generated. The key assertion is that
    // the server does not crash and remains responsive afterwards.
    const connectRequest =
      'CONNECT 127.0.0.1:3000 HTTP/1.1\r\n' +
      'Host: 127.0.0.1:3000\r\n' +
      '\r\n';

    let connectHandled = false;
    try {
      const connectResponse = await rawSocketRequest(connectRequest, 1500);
      // Any response (including empty) is acceptable — the server didn't crash
      connectHandled = true;
      // If a response was received, it should not contain error details
      if (connectResponse.length > 0) {
        assert.strictEqual(
          connectResponse.includes('stack'),
          false,
          'CONNECT response should not contain stack traces'
        );
      }
    } catch (_err) {
      // Timeout or connection error is acceptable for CONNECT
      connectHandled = true;
    }
    assert.ok(connectHandled, 'CONNECT request should be handled without server crash');

    // Test PROPFIND via makeRequest (WebDAV method)
    const propfindResult = await makeRequest({ method: 'PROPFIND' });
    assert.strictEqual(
      propfindResult.statusCode,
      EXPECTED_STATUS,
      'PROPFIND request should return status 200'
    );
    assert.strictEqual(
      propfindResult.body,
      EXPECTED_BODY,
      'PROPFIND request should return normal response body'
    );

    // Test MKCOL via makeRequest (WebDAV method)
    const mkcolResult = await makeRequest({ method: 'MKCOL' });
    assert.strictEqual(
      mkcolResult.statusCode,
      EXPECTED_STATUS,
      'MKCOL request should return status 200'
    );
    assert.strictEqual(
      mkcolResult.body,
      EXPECTED_BODY,
      'MKCOL request should return normal response body'
    );
  });

  // -------------------------------------------------------------------------
  // Test Case 6: Rapid Connection Open/Close Cycling (Slowloris Pattern)
  // -------------------------------------------------------------------------

  it('should survive rapid connection open/close cycling (slowloris pattern)', async () => {
    const connectionCount = 50;

    // Open many TCP connections rapidly and destroy them immediately
    const connectionPromises = Array.from({ length: connectionCount }, () => {
      return new Promise((resolve) => {
        const socket = new net.Socket();

        socket.on('error', () => {
          // Connection errors (ECONNRESET, ECONNREFUSED) are expected
          // during rapid cycling — resolve silently
          socket.destroy();
          resolve();
        });

        socket.on('connect', () => {
          // Immediately destroy the connection without sending any data
          socket.destroy();
          resolve();
        });

        socket.setTimeout(1000, () => {
          socket.destroy();
          resolve();
        });

        socket.connect(3000, '127.0.0.1');
      });
    });

    // Wait for all rapid connections to complete or fail
    await Promise.allSettled(connectionPromises);

    // Allow a brief recovery period for the server
    await new Promise((resolve) => setTimeout(resolve, 200));

    // The critical assertion: server must still respond to normal requests
    const result = await makeRequest();

    assert.strictEqual(
      result.statusCode,
      EXPECTED_STATUS,
      'Server should remain responsive after rapid connection cycling'
    );

    assert.strictEqual(
      result.body,
      EXPECTED_BODY,
      'Server should return normal response after rapid connection cycling'
    );
  });

  // -------------------------------------------------------------------------
  // Test Case 7: Information Leakage in Response Headers
  // -------------------------------------------------------------------------

  it('should not leak server internals in response headers', async () => {
    // Make a normal GET request and inspect response headers
    const result = await makeRequest();

    // Verify expected Content-Type is present
    assert.ok(
      result.headers['content-type'].includes(EXPECTED_CONTENT_TYPE),
      `Response should include Content-Type: ${EXPECTED_CONTENT_TYPE}`
    );

    // No X-Powered-By header (would reveal framework information)
    assert.strictEqual(
      result.headers['x-powered-by'],
      undefined,
      'Response should not contain X-Powered-By header'
    );

    // No Server header with version info (Node.js does not add this by default)
    assert.strictEqual(
      result.headers['server'],
      undefined,
      'Response should not contain Server header'
    );

    // Response body should be exactly the expected body — no extra info
    assert.strictEqual(
      result.body,
      EXPECTED_BODY,
      'Response body should be exactly the expected value with no extra info'
    );

    // No stack traces or error objects in the response body
    assert.strictEqual(
      result.body.includes('Error'),
      false,
      'Response body should not contain error stack traces'
    );

    assert.strictEqual(
      result.body.includes('at '),
      false,
      'Response body should not contain stack trace frames'
    );

    // Verify a request to a nonexistent path does not produce different headers
    const nonexistentResult = await makeRequest({ path: '/nonexistent/deep/path' });

    assert.strictEqual(
      nonexistentResult.headers['x-powered-by'],
      undefined,
      'Nonexistent path should not reveal X-Powered-By header'
    );

    assert.strictEqual(
      nonexistentResult.headers['server'],
      undefined,
      'Nonexistent path should not reveal Server header'
    );

    assert.strictEqual(
      nonexistentResult.body,
      EXPECTED_BODY,
      'Nonexistent path should return same response body as root path'
    );

    // Compare header keys between root and nonexistent path — should be identical
    const rootHeaderKeys = Object.keys(result.headers).sort();
    const nonexistentHeaderKeys = Object.keys(nonexistentResult.headers).sort();

    assert.deepStrictEqual(
      rootHeaderKeys,
      nonexistentHeaderKeys,
      'Header keys should be identical for root and nonexistent paths'
    );
  });
});
