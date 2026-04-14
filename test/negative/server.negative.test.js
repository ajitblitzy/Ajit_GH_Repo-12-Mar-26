/**
 * Negative Flow and Error Condition Tests — server.js
 *
 * Validates failure modes, error conditions, and edge cases for the
 * zero-dependency Node.js HTTP server.  All tests use the black-box process
 * testing pattern because server.js has NO module.exports — the server is
 * spawned as a child process, real HTTP requests are sent, and responses are
 * asserted.
 *
 * Test Categories:
 *   1. EADDRINUSE — Port Conflict
 *   2. Oversized and Malformed Requests
 *   3. Client Disconnection Handling
 *   4. Process Signal Handling
 *   5. Rapid Connection Cycling
 *
 * @module test/negative/server.negative.test
 */

'use strict';

// ---------------------------------------------------------------------------
// Imports — Built-in modules + Shared helper
// ---------------------------------------------------------------------------

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const net = require('node:net');
const http = require('node:http');
const {
  spawnServer,
  waitForReady,
  stopServer,
  makeRequest,
  EXPECTED_STATUS,
  EXPECTED_CONTENT_TYPE,
  EXPECTED_BODY,
  DEFAULT_PORT,
  DEFAULT_HOSTNAME
} = require('../helpers/server-helper');

// ---------------------------------------------------------------------------
// Top-Level Test Suite
// ---------------------------------------------------------------------------

describe('Negative Flow Tests — server.js', () => {

  // =========================================================================
  // Category 1: EADDRINUSE — Port Conflict
  // =========================================================================

  describe('EADDRINUSE — Port Conflict', () => {

    it('should fail with EADDRINUSE when port 3000 is occupied', async () => {
      // Create a blocking TCP server that occupies port 3000
      const blocker = net.createServer();
      await new Promise((resolve) => {
        blocker.listen(DEFAULT_PORT, DEFAULT_HOSTNAME, resolve);
      });

      try {
        // Spawn server.js — it should fail because the port is taken
        const serverProc = spawnServer();
        let stderr = '';

        serverProc.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        // Wait for the server process to exit due to the port conflict
        const exitCode = await new Promise((resolve) => {
          serverProc.on('close', (code) => resolve(code));
        });

        // Assert: non-zero exit code indicates failure
        assert.strictEqual(exitCode, 1, 'Server should exit with code 1 on EADDRINUSE');
        // Assert: stderr contains the EADDRINUSE error identifier
        assert.match(stderr, /EADDRINUSE/, 'stderr should contain EADDRINUSE error message');
      } finally {
        // Cleanup: close the blocking TCP server regardless of test outcome
        await new Promise((resolve) => blocker.close(resolve));
      }
    });
  });

  // =========================================================================
  // Category 2: Oversized and Malformed Requests
  // =========================================================================

  describe('Oversized and Malformed Requests', () => {
    let serverProcess;

    before(async () => {
      serverProcess = spawnServer();
      await waitForReady(serverProcess);
    });

    after(async () => {
      await stopServer(serverProcess);
    });

    it('should handle request with extremely long URL path', async () => {
      // Generate a 10,000-character URL path — within Node.js default
      // maxHeaderSize (16,384 bytes) so the server should accept it
      const longPath = '/' + 'a'.repeat(10000);
      const response = await makeRequest({ path: longPath });

      // Server is route-agnostic — returns the same response for any path
      assert.strictEqual(response.statusCode, EXPECTED_STATUS,
        'Server should return 200 for long URL path');
      assert.strictEqual(response.body, EXPECTED_BODY,
        'Response body should match expected value for long URL path');

      // Verify server remains responsive after handling long path request
      const followUp = await makeRequest();
      assert.strictEqual(followUp.statusCode, EXPECTED_STATUS,
        'Server should still respond after processing long URL path');
    });

    it('should handle request with oversized headers', async () => {
      // Build an oversized header that exceeds Node.js default maxHeaderSize
      // (16,384 bytes). The server should reject the connection or return an
      // error status, but it MUST NOT crash.
      const oversizedResult = await new Promise((resolve) => {
        const req = http.request({
          hostname: DEFAULT_HOSTNAME,
          port: DEFAULT_PORT,
          path: '/',
          method: 'GET',
          headers: { 'X-Large-Header': 'x'.repeat(20000) }
        }, (res) => {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, body, error: null });
          });
        });

        req.on('error', (err) => {
          // Connection reset/refused is acceptable — server rejected oversized headers
          resolve({ statusCode: null, body: null, error: err.message });
        });

        req.end();
      });

      // Assert: whether the server responded or rejected, it produced a result
      assert.ok(
        oversizedResult.error !== null || oversizedResult.statusCode !== null,
        'Server should either respond or reject oversized header request'
      );

      // Key assertion: server is still alive and responsive after oversized request
      const followUp = await makeRequest();
      assert.strictEqual(followUp.statusCode, EXPECTED_STATUS,
        'Server should still respond normally after oversized header request');
      assert.strictEqual(followUp.body, EXPECTED_BODY,
        'Response body should match expected value after oversized header attack');
    });

    it('should handle request with large body payload', async () => {
      // Send a 1MB POST body — the server ignores request bodies entirely
      // and always returns the static "Hello, World!\n" response
      const largeBody = 'x'.repeat(1024 * 1024);
      const response = await makeRequest({
        method: 'POST',
        body: largeBody,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(Buffer.byteLength(largeBody))
        }
      });

      // Assert: server returns the standard response despite the large body
      assert.strictEqual(response.statusCode, EXPECTED_STATUS,
        'Server should return 200 even with a 1MB request body');
      assert.strictEqual(response.headers['content-type'], EXPECTED_CONTENT_TYPE,
        'Content-Type should remain text/plain after large body request');
      assert.strictEqual(response.body, EXPECTED_BODY,
        'Response body should be unaffected by large request body');

      // Confirm the server continues to operate normally
      const followUp = await makeRequest();
      assert.strictEqual(followUp.statusCode, EXPECTED_STATUS,
        'Server should remain responsive after processing large body');
    });
  });

  // =========================================================================
  // Category 3: Client Disconnection Handling
  // =========================================================================

  describe('Client Disconnection Handling', () => {
    let serverProcess;

    before(async () => {
      serverProcess = spawnServer();
      await waitForReady(serverProcess);
    });

    after(async () => {
      await stopServer(serverProcess);
    });

    it('should handle abrupt client disconnection gracefully', async () => {
      // Establish a raw TCP connection and send a partial HTTP request,
      // then immediately destroy the socket to simulate an abrupt disconnect
      await new Promise((resolve) => {
        const socket = net.connect(DEFAULT_PORT, DEFAULT_HOSTNAME);

        socket.on('connect', () => {
          // Send an incomplete HTTP request — missing the terminal \r\n
          socket.write('GET / HTTP/1.1\r\nHost: localhost\r\n');
          // Immediately destroy the connection before server can respond
          socket.destroy();
          resolve();
        });

        socket.on('error', () => {
          // Connection error is acceptable during abrupt disconnect
          resolve();
        });
      });

      // Allow the server time to process the disconnection event
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Verify the server survived the abrupt disconnection
      const response = await makeRequest();
      assert.strictEqual(response.statusCode, EXPECTED_STATUS,
        'Server should still respond after abrupt client disconnection');
      assert.strictEqual(response.body, EXPECTED_BODY,
        'Response body should be intact after abrupt client disconnection');
    });
  });

  // =========================================================================
  // Category 4: Process Signal Handling
  // =========================================================================

  describe('Process Signal Handling', () => {

    it('should terminate cleanly on SIGTERM signal', async () => {
      // Spawn a dedicated server instance for this signal test
      const serverProc = spawnServer();
      await waitForReady(serverProc);

      // Send SIGTERM and wait for the process to exit
      const { code, signal } = await new Promise((resolve) => {
        serverProc.on('close', (exitCode, exitSignal) => {
          resolve({ code: exitCode, signal: exitSignal });
        });
        serverProc.kill('SIGTERM');
      });

      // Assert: process exited and reports the correct termination signal
      assert.ok(serverProc.killed,
        'Server process should be marked as killed after SIGTERM');
      assert.strictEqual(signal, 'SIGTERM',
        'Exit signal should be SIGTERM');
    });

    it('should terminate on SIGINT signal', async () => {
      // Spawn a dedicated server instance for this signal test
      const serverProc = spawnServer();
      await waitForReady(serverProc);

      // Send SIGINT (equivalent to Ctrl+C) and wait for process exit
      const { code, signal } = await new Promise((resolve) => {
        serverProc.on('close', (exitCode, exitSignal) => {
          resolve({ code: exitCode, signal: exitSignal });
        });
        serverProc.kill('SIGINT');
      });

      // Assert: process exited and reports the correct termination signal
      assert.ok(serverProc.killed,
        'Server process should be marked as killed after SIGINT');
      assert.strictEqual(signal, 'SIGINT',
        'Exit signal should be SIGINT');
    });
  });

  // =========================================================================
  // Category 5: Rapid Connection Cycling
  // =========================================================================

  describe('Rapid Connection Cycling', () => {
    let serverProcess;

    before(async () => {
      serverProcess = spawnServer();
      await waitForReady(serverProcess);
    });

    after(async () => {
      await stopServer(serverProcess);
    });

    it('should handle rapid sequential connection open/close', async () => {
      // Open 50 TCP connections in rapid succession and immediately destroy
      // each one, simulating aggressive connection churn / slowloris patterns
      const connectionCount = 50;
      const connections = [];

      for (let i = 0; i < connectionCount; i++) {
        const socket = net.connect(DEFAULT_PORT, DEFAULT_HOSTNAME);
        connections.push(new Promise((resolve) => {
          socket.on('connect', () => {
            socket.destroy();
            resolve();
          });
          socket.on('error', () => {
            // Errors during rapid cycling are acceptable stress-test behavior
            resolve();
          });
        }));
      }

      await Promise.all(connections);

      // Stabilization wait — let the server recover from the burst
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Verify the server is still responsive after the connection storm
      const response = await makeRequest();
      assert.strictEqual(response.statusCode, EXPECTED_STATUS,
        'Server should remain responsive after 50 rapid connection cycles');
      assert.strictEqual(response.body, EXPECTED_BODY,
        'Response body should be intact after rapid connection cycling');
    });
  });
});
