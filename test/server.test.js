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

  // The following three focused cases map one-to-one to AAP test IDs T-002, T-003,
  // and T-004 (Technical Spec Section 0.3.1). They assert each dimension of the GET
  // response contract independently — complementing (not replacing) the combined
  // high-density case above — giving granular, per-requirement traceability.
  it('T-002: GET / -> status code is exactly 200', async () => {
    const res = await request({ method: 'GET', path: '/', host: expected.host, port: expected.port });
    assert.equal(res.statusCode, expected.statusCode);
  });

  it('T-003: GET / -> Content-Type is exactly "text/plain" (no charset suffix)', async () => {
    const res = await request({ method: 'GET', path: '/', host: expected.host, port: expected.port });
    assert.equal(res.headers['content-type'], expected.contentType);
    // Precise contract: server sets a bare media type via res.setHeader('Content-Type',
    // 'text/plain') — there must be NO "; charset=..." parameter appended by the runtime.
    assert.equal(/charset/i.test(res.headers['content-type'] || ''), false);
  });

  it('T-004: GET / -> exact body "Hello, World!\\n" with Content-Length 14', async () => {
    const res = await request({ method: 'GET', path: '/', host: expected.host, port: expected.port });
    assert.equal(res.body, expected.body);
    assert.equal(res.body.endsWith('\n'), true);
    assert.equal(Number(res.headers['content-length']), expected.contentLength);
    assert.equal(Buffer.byteLength(res.body), expected.contentLength);
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
