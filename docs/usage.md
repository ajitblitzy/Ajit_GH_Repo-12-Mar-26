# Usage

This page answers the integrator's question: what exactly does this service
return, and what may I rely on? It describes the service as it stands. It
does not propose changing it, and none of the behaviour below should be read
as a defect awaiting a fix.

Every `server.js` citation here is anchored to baseline commit `1484182` —
the layout of the file before documentation comments were added — and cites
line ranges rather than a total line count, so the references stay accurate
as comment blocks shift physical line numbers.

One thing to set aside before starting. The project name and the root
[README](../README.md) mention backprop integration, but nothing in this
repository performs backpropagation, machine learning, or any outbound call
whatsoever. Its role is narrower: it is the *target endpoint* that an
integration hosted outside this repository can point at.
`Source: server.js:L1-L14`.

Start the service before working through the examples — see
[Getting started](./getting-started.md). Every example below was executed
against a live instance under Node.js 24.19.0, and the output shown is the
output that was observed.

## Contents

- [The one endpoint](#the-one-endpoint-and-why-every-url-is-that-endpoint)
- [Making a request with curl](#making-a-request-with-curl)
- [Making a request from Node.js](#making-a-request-from-nodejs)
- [Opening it in a browser](#opening-it-in-a-browser)
- [Method behavior](#method-behavior)
- [Path behavior](#path-behavior)
- [No content negotiation](#no-content-negotiation)
- [What you must not do](#what-you-must-not-do-requireserver)
- [Related documentation](#related-documentation)

## The one endpoint, and why every URL is that endpoint

The service listens on `http://127.0.0.1:3000/`
(`Source: server.js:L3-L4`, `server.js:L12`) and registers exactly one
request listener, the **Request Handler Callback**. There is no routing
layer of any kind, so the entire URL space behaves as a single endpoint.
`Source: server.js:L6-L10`.

That follows from one omission: the `req` argument is never read. Nothing in
the callback touches `req.url`, `req.method`, `req.headers`, or the request
body, and the body is never consumed or drained — searching the source for
each of `req.url`, `req.method`, and `req.headers` returns zero matches.
With the request never inspected, there is nothing to route on, nothing to
parse, nothing to branch on, and nothing to negotiate.
`Source: server.js:L6-L10`.

This deserves stating plainly and early, because the default assumption for
an HTTP server is that routing exists. Here it does not: `/`, a deep path, a
misspelled path, and a path with a query string are the same request as far
as this service is concerned.

Three unconditional statements produce the whole response contract:

| Property       | Value                                     | Source         |
| -------------- | ----------------------------------------- | -------------- |
| Status code    | `200`                                     | `server.js:L7` |
| `Content-Type` | `text/plain`, with no `charset` parameter | `server.js:L8` |
| Response body  | `Hello, World!\n` (14 bytes)              | `server.js:L9` |

Those 14 bytes are 13 printable characters plus one trailing LF.
`Source: server.js:L9`. For the full wire-level specification, including the
responses this service never produces, see the
[HTTP endpoint reference](./api-reference/http-endpoint.md); for the
function that produces it, see its
[callback reference](./api-reference/functions/request-handler-callback.md).

## Making a request with curl

```bash
curl -i http://127.0.0.1:3000/
```

Observed response:

```http
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Fri, 11 Sep 2026 11:19:08 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 14

Hello, World!
```

The `Date` value differs on every request. Everything else is fixed.

Only one of those headers comes from application code, and the distinction
matters: it separates what this repository states from what the runtime
happens to provide around it.

| Header                     | Set by                | Source         |
| -------------------------- | --------------------- | -------------- |
| `Content-Type: text/plain` | Application code      | `server.js:L8` |
| `Date`                     | Node runtime          | n/a            |
| `Connection: keep-alive`   | Node runtime          | n/a            |
| `Keep-Alive: timeout=5`    | Node runtime          | n/a            |
| `Content-Length: 14`       | Node runtime, derived | `server.js:L9` |

`Content-Type` is the only header the application sets
(`Source: server.js:L8`). `Content-Length` is derived by the runtime from
the `res.end()` payload rather than declared in code
(`Source: server.js:L9`), and the remaining three are injected by the
runtime. An integrator should treat those four as runtime behaviour, not as
a contract this repository states.

The body length is worth confirming rather than trusting, because a trailing
newline is easy to lose in a terminal:

```bash
curl -s http://127.0.0.1:3000/ | od -c
```

```text
0000000   H   e   l   l   o   ,       W   o   r   l   d   !  \n
0000016
```

The final octal offset `0000016` is decimal 14, so the response body ends
immediately after the LF with no trailing content of any kind.
`Source: server.js:L9`.

## Making a request from Node.js

A client needs nothing beyond the Node.js standard library, which matches
the service's own shape — its sole import is the built-in `http` module and
the repository has no `package.json` and no third-party dependencies.
`Source: server.js:L1`.

Save the following as `client.js` somewhere outside this repository and run
it with `node client.js` while the service is listening:

```js
const http = require('http');
http.get('http://127.0.0.1:3000/', (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(res.statusCode, res.headers['content-type']);
    console.log(JSON.stringify(body));
  });
});
```

Observed output:

```text
200 text/plain
"Hello, World!\n"
```

The body arrives as a stream, so it is collected across `data` events and
read on `end`. `JSON.stringify` is used deliberately for the printout: it
renders the trailing newline as a visible `\n` instead of letting the
terminal absorb it. `Source: server.js:L9`.

## Opening it in a browser

Navigating to `http://127.0.0.1:3000/` shows the plain-text greeting and
nothing else. The service sets `Content-Type: text/plain` rather than
`text/html` (`Source: server.js:L8`), so there is no markup for the browser
to parse: it presents the 14 bytes as text, with no rendered markup and no
DOM to inspect. There is no page title, no stylesheet, and no favicon.

The response is unchanged under browser-style request headers. A request
carrying a Chrome-identical `User-Agent` together with
`Accept: text/html,application/xhtml+xml,...` returned the same `200`,
the same `text/plain`, and the same 14 bytes as a bare `curl` request.

Browsers also request `/favicon.ico` on their own initiative, without being
asked to. That request receives the greeting as well — `200`, `text/plain`,
14 bytes — rather than a `404`, because the path is never examined.
`Source: server.js:L6-L10`.

No screenshot accompanies this section, and none will be added. The service
renders plain text rather than a visual interface, so an image would show
nothing that the paragraphs above do not already state, and this
documentation set contains no image assets at all.

## Method behavior

Every method reaches the same Request Handler Callback, so every method
receives the same answer. Observed against a live instance:

| Method   | Status | `Content-Type` | Body size   |
| -------- | ------ | -------------- | ----------- |
| GET      | 200    | `text/plain`   | 14 bytes    |
| POST     | 200    | `text/plain`   | 14 bytes    |
| PUT      | 200    | `text/plain`   | 14 bytes    |
| PATCH    | 200    | `text/plain`   | 14 bytes    |
| DELETE   | 200    | `text/plain`   | 14 bytes    |
| OPTIONS  | 200    | `text/plain`   | 14 bytes    |
| **HEAD** | 200    | `text/plain`   | **0 bytes** |

`HEAD` is the only row that differs, and the reason is worth being precise
about: the Node.js runtime suppresses response bodies for `HEAD` requests
automatically. The application does not special-case the method — it cannot,
because it never reads `req.method`. The Request Handler Callback runs
identically and still calls `res.end('Hello, World!\n')`; the runtime drops
the body on the way out and omits `Content-Length` from the `HEAD` response
entirely. `Source: server.js:L6-L10`.

There is no `405` path. A rejected method does not exist here, because no
method is examined and therefore none can be refused.

Any row can be re-measured the way the table was built:

```bash
curl -s -o /dev/null -X POST -w '%{http_code} %{size_download}\n' http://127.0.0.1:3000/
```

```text
200 14
```

## Path behavior

The path is never read either, so this table is just as uniform:

| Path              | Status | `Content-Type` | Body size |
| ----------------- | ------ | -------------- | --------- |
| `/`               | 200    | `text/plain`   | 14 bytes  |
| `/any/path`       | 200    | `text/plain`   | 14 bytes  |
| `/does/not/exist` | 200    | `text/plain`   | 14 bytes  |
| `/favicon.ico`    | 200    | `text/plain`   | 14 bytes  |
| `/x?q=1&a=2`      | 200    | `text/plain`   | 14 bytes  |

There is no `404` path, and no `5xx` originating in application code: the
callback is three unconditional statements with no branching and no error
handling, so it has no failure of its own to report.
`Source: server.js:L6-L10`.

Query strings are never parsed, and neither are request headers or request
bodies. A `POST` to `/api?q=1` carrying `Content-Type: application/json` and
the body `{"a":1}` returns `200`, `text/plain`, and the same 14 bytes — the
path, the query string, the request content type, and the payload are all
ignored together.

A caller that needs to tell one path or one client from another cannot get
that distinction from the response, because every response is identical; it
has to live in the client or in something placed in front of this service.
See [Configuration](./configuration.md) for the two values that can be
changed, and [Troubleshooting](./troubleshooting.md) if uniform responses
are not what you expected.

## No content negotiation

```bash
curl -s -o /dev/null \
  -H 'Accept: text/html,application/xhtml+xml' \
  -w '%{http_code} %{content_type}\n' \
  http://127.0.0.1:3000/
```

```text
200 text/plain
```

An `Accept` header asking for HTML still yields `text/plain`. Negotiation
would mean reading `req.headers`, and the Request Handler Callback never
does, so `text/plain` is the only media type this service can produce.
`Source: server.js:L6-L10`. The same reasoning covers every other request
header: none is read, so none can influence what the callback emits.

## What you must not do: `require('./server')`

`server.js` is a program, not a module. It never assigns to
`module.exports` — searching the source for `module.exports` returns zero
matches — and the module body executes on load, so requiring the file binds
the socket as a side effect. `Source: server.js:L1-L14`.

Requiring it was tried directly. Three things happened, in this order:

1. The call returned an empty object: `typeof` was `object`,
   `JSON.stringify` produced `{}`, and it had zero own keys. There is no
   server handle, no port accessor, and no way to stop what was just
   started.
2. Loading printed `Server running at http://127.0.0.1:3000/`, the readiness
   line written by the **Listen Readiness Callback**
   (`Source: server.js:L12-L14`). The socket was bound purely as a side
   effect of the `require` call.
3. The requiring process then never exited. The live server holds the event
   loop open indefinitely, so the process had to be terminated from outside.

If something is already listening on the port, requiring the file is worse
than unhelpful. The bind fails, the `'error'` event has no listener anywhere
in the file, and the requiring process terminates with exit code 1 after
reporting:

```text
Error: listen EADDRINUSE: address already in use 127.0.0.1:3000
```

That was observed as well. See [Troubleshooting](./troubleshooting.md) for
the same failure encountered the ordinary way.

None of this is a defect to patch — it is simply what a program without
exports does when it is imported. Run the file as a program:

```bash
node server.js
```

and then talk to it over HTTP using the examples above. There is no
`npm start` to reach for, because the repository has no `package.json`.

## Related documentation

- [Documentation hub](./README.md) — the index for this documentation set.
- [Getting started](./getting-started.md) — prerequisites, launching the
  service, and confirming that it is up.
- [HTTP endpoint reference](./api-reference/http-endpoint.md) — the full
  wire-level response contract.
- [Callback reference](./api-reference/functions/request-handler-callback.md)
  — the Request Handler Callback that produces every response on this page.
- [Configuration](./configuration.md) — the two hardcoded values, and what
  changes when you edit them.
- [Troubleshooting](./troubleshooting.md) — port collisions, loopback-only
  reachability, and the rest of the surprises.
