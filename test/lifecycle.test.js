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
      const result = await second.exited();
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, /EADDRINUSE/);
    } finally {
      await stopServerProcess(handle.child);
    }
  });
});
