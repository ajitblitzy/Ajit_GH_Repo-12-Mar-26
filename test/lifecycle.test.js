'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  startServerProcess,
  stopServerProcess,
  spawnServerRaw,
} = require('./helpers/server-harness');
const { request } = require('./helpers/http-client');
const expected = require('./fixtures/expected');

describe('server.js lifecycle (black-box child-process harness)', () => {
  it('emits the exact startup log on stdout', async () => {
    const handle = await startServerProcess();
    try {
      assert.ok(
        handle.getStdout().includes(expected.startupLog),
        `stdout should contain "${expected.startupLog}"`,
      );
    } finally {
      await stopServerProcess(handle.child);
    }
  });

  it('binds 127.0.0.1:3000 and answers a loopback request with 200', async () => {
    const handle = await startServerProcess();
    try {
      const res = await request({ method: 'GET', path: '/', host: expected.host, port: expected.port });
      assert.equal(res.statusCode, expected.statusCode);
      assert.equal(res.body, expected.body);
    } finally {
      await stopServerProcess(handle.child);
    }
  });

  it('a second instance on occupied port 3000 fails (EADDRINUSE / non-zero exit)', async () => {
    const handle = await startServerProcess();
    try {
      const second = spawnServerRaw();
      let timeoutTimer;
      try {
        // Race the expected natural exit against a short timeout so that a regressed
        // negative path (a second instance that unexpectedly stays alive) fails fast
        // instead of hanging the suite and orphaning a process holding port 3000.
        const result = await Promise.race([
          second.exited(),
          new Promise((_, reject) => {
            timeoutTimer = setTimeout(
              () => reject(new Error('Second instance did not exit within 5000ms (expected EADDRINUSE failure)')),
              5000,
            );
          }),
        ]);
        assert.notEqual(result.code, 0);
        assert.match(result.stderr, /EADDRINUSE/);
      } finally {
        // Clear the timer (avoids a late unhandled rejection / event-loop leak when the
        // child exits first) and guarantee the secondary child is reaped even if it lingers.
        clearTimeout(timeoutTimer);
        await stopServerProcess(second.child);
      }
    } finally {
      await stopServerProcess(handle.child);
    }
  });
});
