'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServerInProcess, closeInProcess } = require('./helpers/server-harness');
const { request } = require('./helpers/http-client');
const expected = require('./fixtures/expected');

// NOTE: server.js has a linear, branch-free request handler — there are NO
// error cases at the handler level, so none are asserted here (documented intentionally).
describe('server.js request handler (in-process interception harness)', () => {
  let server;

  before(async () => {
    server = await startServerInProcess();
  });

  after(async () => {
    await closeInProcess(server);
  });

  it('GET / -> 200, text/plain, exact body, Content-Length 14', async () => {
    const res = await request({ method: 'GET', path: '/', host: expected.host, port: expected.port });
    assert.equal(res.statusCode, expected.statusCode);
    assert.equal(res.headers['content-type'], expected.contentType);
    assert.equal(res.body, expected.body);
    assert.equal(Number(res.headers['content-length']), expected.contentLength);
  });

  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
    it(`${method} / -> identical response (method-agnostic)`, async () => {
      const res = await request({ method, path: '/', host: expected.host, port: expected.port });
      assert.equal(res.statusCode, expected.statusCode);
      assert.equal(res.headers['content-type'], expected.contentType);
      assert.equal(res.body, expected.body);
      assert.equal(Number(res.headers['content-length']), expected.contentLength);
    });
  }

  it('HEAD / -> 200 + headers present but EMPTY body (Node strips body for HEAD)', async () => {
    const res = await request({ method: 'HEAD', path: '/', host: expected.host, port: expected.port });
    assert.equal(res.statusCode, expected.statusCode);
    assert.equal(res.headers['content-type'], expected.contentType);
    assert.equal(res.body, '');
  });

  const paths = ['/', '/foo', '/a/b/c?x=1', `/${'x'.repeat(2000)}`];
  for (const p of paths) {
    it(`path "${p.slice(0, 16)}..." -> identical response (route-agnostic)`, async () => {
      const res = await request({ method: 'GET', path: p, host: expected.host, port: expected.port });
      assert.equal(res.statusCode, expected.statusCode);
      assert.equal(res.headers['content-type'], expected.contentType);
      assert.equal(res.body, expected.body);
      assert.equal(Number(res.headers['content-length']), expected.contentLength);
    });
  }

  it('body is byte-exact including the trailing newline', async () => {
    const res = await request({ method: 'GET', path: '/', host: expected.host, port: expected.port });
    assert.equal(res.body, expected.body);
    assert.equal(res.body.endsWith('\n'), true);
    assert.equal(Buffer.byteLength(res.body), expected.contentLength);
  });
});
