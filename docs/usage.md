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
output that was observed. Every one of those examples targets the loopback
address `127.0.0.1`, so read
[the security boundary](#the-security-boundary-these-examples-assume)
below before adapting any of them to another host.

**Verification environment.** Every status, header, byte count, message and
exit status quoted on this page was measured by running this repository's
`server.js` on **Friday, September 11, 2026** under **Node.js v24.19.0**
(Active LTS) on **Windows** (`Microsoft Windows NT 10.0.26100.0`). Two
kinds of claim appear below and they carry different weight: a statement
labelled `Source: server.js:Lx` is a property of the source and holds
wherever the file runs, while a quoted value is evidence from that one
runtime on that one platform rather than a guarantee for every other. Two
such details are known to vary — the stack-frame line numbers inside a
Node.js error trace move with the runtime version, and the numeric `errno`
printed alongside `EADDRINUSE` is platform-specific.

## Contents

- [The security boundary](#the-security-boundary-these-examples-assume)
- [The one endpoint](#the-one-endpoint-and-why-every-url-is-that-endpoint)
- [Making a request with curl](#making-a-request-with-curl)
- [Making a request from Node.js](#making-a-request-from-nodejs)
- [Opening it in a browser](#opening-it-in-a-browser)
- [Method behavior](#method-behavior)
- [Path behavior](#path-behavior)
- [No content negotiation](#no-content-negotiation)
- [What you must not do](#what-you-must-not-do-requireserver)
- [Related documentation](#related-documentation)

## The security boundary these examples assume

Every example on this page targets `127.0.0.1:3000`, and that is not
incidental. The host is the IPv4 loopback literal, so the loopback bind is
the only network boundary this service has: it is unreachable from another
host or container, and a request to a non-loopback address of the same
machine does not connect at all. `Source: server.js:L3`.

Nothing else stands between a caller and the response, and the specifics
are worth having before any example below is copied:

- **Plain HTTP, no TLS.** The only module loaded is `http`, so there is no
  TLS, no certificate, no key and no HTTPS listener. Everything exchanged
  with the service travels in clear text, readable by anything able to
  observe that traffic. `Source: server.js:L1`.
- **No authentication, no authorization, no access control of any kind.**
  No credential is read, no session or token exists, no authorization
  check is performed, and the request object is never inspected — so every
  caller that can reach the socket receives the identical response.
  `Source: server.js:L6-L10`.
- **An internal engineering fixture.** Public or production deployment is
  not a supported use case.

That matters most at the moment an example is adapted. Changing the host
literal to a reachable address removes the only boundary there is and adds
nothing in its place: every peer that can route to the new address becomes
a caller, in clear text and unauthenticated. The controls a remote service
would need are executable changes to the program, and they lie outside this
documentation, which describes the service as it stands rather than
proposing a different one. [Configuration](./configuration.md) records what
editing the host literal actually does, and
[Troubleshooting](./troubleshooting.md) covers the reachability symptom
that usually prompts the edit in the first place.

## The one endpoint, and why every URL is that endpoint

The service listens on `http://127.0.0.1:3000/`
(`Source: server.js:L3-L4`, `server.js:L12`) and registers exactly one
request listener, the **Request Handler Callback** — the listener for the
server's `'request'` event, and for nothing else. `Source: server.js:L6`.
There is no routing layer of any kind, so for every request the runtime
dispatches as a `'request'` event the entire URL space behaves as a single
endpoint. `Source: server.js:L6-L10`. A few kinds of client input are
answered by the runtime before they could become a `'request'` event, and
those never reach the callback at all; [Method
behavior](#method-behavior) lists the ones that were measured.

That follows from one omission: the `req` argument is never read. Nothing in
the callback touches `req.url`, `req.method`, `req.headers`, or the request
body — searching the source for each of `req.url`, `req.method`, and
`req.headers` returns zero matches. With the request never inspected, there
is nothing to route on, nothing to parse, nothing to branch on, and nothing
to negotiate. `Source: server.js:L6-L10`. The unread body is not left on
the wire, though: because the application never consumed the request, the
Node.js runtime drains and discards whatever was unread once the response
has finished. That draining is the runtime's work, not the callback's.

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

Observed response — this is the default HTTP/1.1 keep-alive exchange as
`curl` performs it, recorded under Node.js 24.19.0:

```http
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Fri, 11 Sep 2026 11:19:08 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 14

Hello, World!
```

That header block is a single observed response — the default `curl` GET
above, under Node.js 24.19.0 — and not a per-request guarantee. This
repository states only three of its properties: the `200` status
(`Source: server.js:L7`), `Content-Type: text/plain` with no `charset`
parameter (`Source: server.js:L8`), and the 14-byte `Hello, World!\n`
payload handed to `res.end(...)` (`Source: server.js:L9`). The remaining
fields belong to the runtime and are not fixed: `Date` is generated by the
runtime per response and moves with the clock, though it is not unique per
request — the field carries one-second resolution, so requests answered
within the same second repeat the same value, and ten back-to-back
requests and eight concurrent requests were each observed sharing a single
`Date`; `Connection` and `Keep-Alive` report how the runtime is handling
the connection and vary with the protocol version and the request's
connection semantics, an HTTP/1.0 request to the same endpoint being
answered with `Connection: close`, no `Keep-Alive` and no
`Content-Length` at all, and an HTTP/1.1 request that itself sent
`Connection: close` being answered with `Connection: close` and no
`Keep-Alive`; and `Content-Length: 14` is runtime-derived, so it is
absent altogether from a `HEAD` response, as
[Method behavior](#method-behavior) records.

Only one of those headers comes from application code, and the distinction
matters: it separates what this repository states from what the runtime
happens to provide around it.

| Header                     | Set by                | Source         |
| -------------------------- | --------------------- | -------------- |
| `Content-Type: text/plain` | Application code      | `server.js:L8` |
| `Date`                     | Node runtime          | n/a            |
| `Connection`               | Node runtime, varies  | n/a            |
| `Keep-Alive`               | Node runtime, varies  | n/a            |
| `Content-Length: 14`       | Node runtime, derived | `server.js:L9` |

`Content-Type` is the only header the application sets, and the only one
present on every response the Request Handler Callback produces
(`Source: server.js:L8`). That scope matters: a response the runtime
generates without invoking the callback — the `417` and `400` cases under
[Method behavior](#method-behavior) — carries `Date`, a `Connection` line
and `Transfer-Encoding`, and no `Content-Type` at all, measured under
Node.js 24.19.0. `Content-Length` is derived by the runtime from the
`res.end()` payload rather than declared in code
(`Source: server.js:L9`), and the remaining three are the runtime's own. An
integrator should treat those four as runtime behaviour rather than a
contract this repository states — and should not assume any of them is
always there, since `Content-Length` is absent from a `HEAD` response and
from an HTTP/1.0 response.

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

// Bound the exchange: a stalled or hostile listener must not hang the client.
const TIMEOUT_MS = 5000;
// The documented contract: this service answers with exactly 14 bytes.
const EXPECTED_BYTES = 14;
// An outer resource bound, independent of the contract above.
const MAX_BYTES = 64 * 1024;

const req = http.get('http://127.0.0.1:3000/', (res) => {
  const type = res.headers['content-type'];
  const declared = Number(res.headers['content-length']);
  let rejected = null;

  // One rejection path: it records the reason, stops the transfer, and is
  // what the 'end' handler consults before reporting anything as success.
  const reject = (reason) => {
    rejected = reason;
    console.error(`rejected: ${reason}`);
    res.destroy();
  };

  // Check the contract before reading a byte.
  if (res.statusCode !== 200 || type !== 'text/plain') {
    reject(`status ${res.statusCode}, content-type ${type}`);
    return;
  }
  if (Number.isFinite(declared) && declared !== EXPECTED_BYTES) {
    reject(`declared ${declared} bytes, expected ${EXPECTED_BYTES}`);
    return;
  }

  let body = '';
  let bytes = 0;
  res.setEncoding('utf8');
  res.on('error', (err) => console.error(`response failed: ${err.message}`));
  res.on('data', (chunk) => {
    if (rejected) return;
    bytes += Buffer.byteLength(chunk, 'utf8');
    if (bytes > MAX_BYTES) {
      reject(`body exceeded ${MAX_BYTES} bytes`);
      return;
    }
    body += chunk;
  });
  res.on('end', () => {
    if (rejected) return;
    if (bytes !== EXPECTED_BYTES) {
      reject(`received ${bytes} bytes, expected ${EXPECTED_BYTES}`);
      return;
    }
    console.log(res.statusCode, type);
    console.log(JSON.stringify(body));
  });
});

// Keep the request: it is the only handle that can abort the exchange, and
// without an 'error' listener a refused connection is an uncaught exception.
req.setTimeout(TIMEOUT_MS, () => {
  console.error(`no response within ${TIMEOUT_MS} ms; aborting`);
  req.destroy();
});
req.on('error', (err) => console.error(`request failed: ${err.message}`));
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

The rest of the snippet is there for the reader's sake rather than this
service's, and the distinction is worth being explicit about. This service
always answers `200`, `text/plain`, 14 bytes (`Source: server.js:L7-L9`),
so none of the guards below will ever fire against it. They matter because
an example gets copied and pointed somewhere else — at another endpoint, or
at whatever happens to be holding port 3000 — and at that moment an
unguarded client hangs, throws, or buffers without limit:

- The request object returned by `http.get` is retained rather than
  discarded. It is the only handle that can abort the exchange, and it is
  where the request's own failures are delivered: with no `'error'`
  listener on it, a refused connection is an uncaught exception that ends
  the process instead of a message.
- `req.setTimeout` bounds the wait and destroys the request when it
  expires, so a listener that accepts the connection and never answers
  cannot hold the client open indefinitely.
- The status and `Content-Type` are checked against the documented
  contract before a single byte is read, and so is the declared
  `Content-Length`: it must equal the 14 bytes this service sends
  (`Source: server.js:L9`), which refuses a short body and an
  over-declared one alike. A response that fails the check is destroyed
  unread, which releases the socket rather than draining an unknown
  payload.
- `EXPECTED_BYTES` and `MAX_BYTES` are deliberately separate. The first
  is the contract — exactly what this endpoint is documented to return.
  The second is a resource bound that holds whatever the response claims,
  and it is what stops a chunked reply, which declares no length at all,
  from growing without limit.
- Rejection is recorded rather than merely logged. Every failure path
  goes through one `reject` helper that stores the reason and destroys
  the response, and both the `data` and `end` handlers consult that state
  before doing anything further — so a response cut off mid-stream can
  never be printed as a success, and `end` re-checks the final byte count
  against the contract before reporting anything at all.
- The response stream carries its own `'error'` listener, because a
  connection that fails mid-body emits there rather than on the request.

Those paths were exercised rather than assumed, under the environment named
at the top of this page. Against the live service the snippet printed the
two stdout lines shown above and nothing on stderr. Every other case was
produced by pointing it at a purpose-built local listener — the point being
that a copied client meets these, not that this service produces them:

- **Nothing listening** — stderr
  `request failed: connect ECONNREFUSED 127.0.0.1:3000`.
- **Accepts the connection and never answers** — stderr
  `no response within 5000 ms; aborting`, then `request failed: socket
  hang up` as the destroyed socket unwound.
- **Answers `200` but with `text/html`** — stderr
  `rejected: status 200, content-type text/html`.
- **Declares 3 bytes and sends `bad`** — stderr
  `rejected: declared 3 bytes, expected 14`, before any byte was read.
- **Declares 100000 bytes** — stderr
  `rejected: declared 100000 bytes, expected 14`, likewise before reading.
- **Chunked, 80 KiB, no declared length** — stderr
  `rejected: body exceeded 65536 bytes`, at the chunk that crossed the cap.
- **Chunked, 3 bytes, no declared length** — stderr
  `rejected: received 3 bytes, expected 14`, from the final count on `end`.

Every one of those cases printed nothing at all on stdout and exited with
status `0`: a rejected response is reported, never presented as a result.
The timeout case took the expected five seconds; the rest returned
immediately. A chunked reply carrying the correct 14 bytes and no declared
length was accepted and printed normally, so the contract check rejects
what is wrong rather than merely what is unfamiliar.

## Opening it in a browser

Navigating to `http://127.0.0.1:3000/` shows the plain-text greeting and
nothing else. The service sets `Content-Type: text/plain` rather than
`text/html` (`Source: server.js:L8`), so the response carries no HTML
markup of the service's own: the browser displays the 14 bytes as plain
text instead of rendering a page from them. There is no page title, no
stylesheet, and no favicon.

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

Each of the seven ordinary request methods verified below is dispatched by
the runtime as a `'request'` event and reaches the same Request Handler
Callback on every path, and that callback has no branch that could tell one
method from another, so each of them receives the same answer. The table is
scoped to those seven methods rather than to every HTTP method, because
`CONNECT` is dispatched elsewhere — see the note that follows the table.
Observed against a live instance under Node.js 24.19.0:

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
entirely. `Source: server.js:L6-L10`. So the payload the callback supplies
is the same on all seven rows, while the bytes on the wire are 14 on six of
them and none at all on `HEAD`.

There is no `405` path. A rejected method does not exist here, because no
method is examined by the callback and therefore none can be refused by it.

`CONNECT` is the one method outside the table, and the reason is dispatch
rather than any decision made in application code: Node.js routes a
`CONNECT` request to the server's separate `'connect'` event instead of the
`'request'` event that the Request Handler Callback is registered for
(`Source: server.js:L6-L10`). No listener for that event exists anywhere in
the file, so the request is not answered at all. Verified against a live
instance under Node.js 24.19.0: a raw `CONNECT 127.0.0.1:3000 HTTP/1.1`
request received zero bytes and the connection closed with no status line,
and `curl -X CONNECT` reported an HTTP status of `000` with curl exit
status 52, while a control `GET` on the same instance returned
`HTTP/1.1 200 OK` with the usual 14 bytes.

An upgrade request is a separate case, and it does not behave like
`CONNECT`. Node.js diverts a request to the server's `'upgrade'` event only
when the server elects that path, and by default that election is
`listenerCount('upgrade') > 0`. This file adds no `'upgrade'` listener, so
the election fails and the request stays on the ordinary path — it reaches
the Request Handler Callback like any other request, and no protocol switch
takes place. `Source: server.js:L1-L10`. Observed under the same
Node.js 24.19.0 instance: a `GET` carrying `Connection: Upgrade`,
`Upgrade: websocket`, and the
`Sec-WebSocket-Key`/`Sec-WebSocket-Version` handshake headers was answered
with the ordinary greeting — `200`, `text/plain`, 14 bytes — and a bare
`Connection: Upgrade` plus `Upgrade: websocket` behaved identically.

Any row can be re-measured the way the table was built:

```bash
curl -s -o /dev/null -X POST -w '%{http_code} %{size_download}\n' http://127.0.0.1:3000/
```

```text
200 14
```

Those seven rows are the methods that reach the callback. Some client input
never becomes a `'request'` event at all, and is answered by the runtime
with the callback never running — nothing in `server.js` participates,
because it registers a listener for `'request'` and for nothing else.
`Source: server.js:L1-L14`. Observed under Node.js 24.19.0: a `CONNECT`
request had its socket closed with no HTTP response of any kind; an
unsupported `Expect` value was answered `417 Expectation Failed`; an
HTTP/1.1 request with no `Host` header and a request using an unrecognised
method token were each answered `400 Bad Request`; and request headers
beyond the runtime's limit were answered
`431 Request Header Fields Too Large`.

Two cases do not belong in that list, and both were checked rather than
assumed. `Expect: 100-continue` is answered by the runtime with
`100 Continue` on its own, and the request is then delivered to the
callback as an ordinary one. An upgrade request, carrying
`Connection: Upgrade` and `Upgrade: websocket`, is delivered as an ordinary
request too, because no `'upgrade'` listener is registered for the runtime
to hand it to. Both received the ordinary `200` and the same 14 bytes as
the table above.

## Path behavior

The path is never read by the callback either, so this table is just as
uniform:

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

Query strings are never parsed by the callback, and neither are request
headers or request bodies. A `POST` to `/api?q=1` carrying
`Content-Type: application/json` and the body `{"a":1}` returns `200`,
`text/plain`, and the same 14 bytes — the path, the query string, the
request content type, and the payload are all ignored together. The unread
JSON body is drained and discarded by the runtime once the response has
finished.

A caller that needs to tell one path or one client from another cannot get
that distinction from the response, because every dispatched request is
answered with the same status, the same media type and the same payload.
What differs is not the caller's doing: the per-request `Date`, the
runtime's conditional `Connection` and `Keep-Alive` output, and the body on
a `HEAD` request, which the runtime suppresses. The distinction therefore
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
header: none is read by the callback, so none can influence what the
callback emits. It does not follow that no header matters at all — `Host`
and `Expect` are read by the runtime, which can answer on its own before
the callback is ever reached, as [Method behavior](#method-behavior)
records.

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
   line written by the
   [**Listen Readiness Callback**](./api-reference/functions/listen-readiness-callback.md)
   (`Source: server.js:L12-L14`). The socket was bound purely as a side
   effect of the `require` call.
3. The requiring process then never exited. The live server holds the event
   loop open indefinitely, so the process had to be terminated from outside.

If something is already listening on the port, requiring the file is worse
than unhelpful. The bind fails, the `'error'` event has no listener anywhere
in the file, and the runtime tears the requiring process down rather than
handing the failure back to whatever called `require`.
`Source: server.js:L1-L14`.

What that failure settles and what it does not are different things. The
`EADDRINUSE` condition is the stable part — it is what Node.js reports for
an occupied port, and it arrives carrying the `address` and `port` fields
that name exactly what could not be bound. The exit status and the exact
stderr text are runtime and platform presentation rather than a property of
this repository.

**Observed** under the environment named at the top of this page: the
requiring process wrote nothing at all to stdout, exited with status `1`,
and the runtime — not the application — printed an unhandled-`'error'`
trace to stderr whose first error line was:

```text
Error: listen EADDRINUSE: address already in use 127.0.0.1:3000
```

Match on `code: 'EADDRINUSE'` together with the `address` and `port` fields
it carries, rather than on the exit status or on the stack frames: the frame
line numbers move with the runtime version, and the numeric `errno` printed
alongside the code is platform-specific. See
[Troubleshooting](./troubleshooting.md) for the full trace, and for the same
failure encountered the ordinary way.

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
- [Listen Readiness Callback reference](./api-reference/functions/listen-readiness-callback.md)
  — the other callback in the file: the readiness line printed once the
  socket is bound (`Source: server.js:L12-L14`).
- [Configuration](./configuration.md) — the two hardcoded values, and what
  changes when you edit them.
- [Troubleshooting](./troubleshooting.md) — port collisions, loopback-only
  reachability, and the rest of the surprises.
