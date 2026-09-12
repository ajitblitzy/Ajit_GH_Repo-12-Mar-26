# HTTP endpoint reference

This page is the wire-level contract for the one HTTP endpoint this
repository exposes. It states the status code, the observed response headers
with the provenance of each one and the conditions under which each appears,
and the byte-exact response body, so that an integrator can tell precisely
what may be relied upon and what is merely the runtime's doing. One header
is a contract this repository states; the rest are the runtime's output,
and some of them vary or are absent altogether. Every claim below carries
a `server.js` locator or was observed against a live instance. The
contract is the observable effect of the **Request Handler Callback**;
that function is documented in its own right on the
[Request Handler Callback reference](./functions/request-handler-callback.md).

## Contents

- [How to read the locators on this page](#how-to-read-the-locators-on-this-page)
- [Endpoint summary](#endpoint-summary)
- [Request: what is accepted, and what is ignored](#request-what-is-accepted-and-what-is-ignored)
- [Requests the runtime answers itself](#requests-the-runtime-answers-itself)
- [Response status](#response-status)
- [Response headers](#response-headers)
- [Response body](#response-body)
- [Responses this service never produces](#responses-this-service-never-produces)
- [Method behavior](#method-behavior)
- [Path behavior](#path-behavior)
- [No content negotiation](#no-content-negotiation)
- [Worked examples](#worked-examples)
- [Produced by the Request Handler Callback](#produced-by-the-request-handler-callback)
- [Source and traceability](#source-and-traceability)
- [Related documentation](#related-documentation)

## How to read the locators on this page

Every `server.js` citation here is anchored to **baseline commit `1484182`**,
the layout of that file before documentation comments were added to it.
JSDoc blocks now sit above the declarations and shift the physical line
numbers in a checkout; the citations are deliberately not renumbered, so one
locator means the same thing on every page in this set.

Citations are single lines or ranges — `server.js:L7`, `server.js:L6-L10` —
and never a total line count. The upstream specification calls the file
"15 lines" because it counts the trailing newline, while the file carries 14
content lines; citing a range sidesteps that ambiguity.

The observed values on this page were recorded under Node.js 24.19.0
(Active LTS "Krypton"), the patch these observations came from rather than
the version to pin to; [getting started](../getting-started.md) owns the
full support table and the patch-currency requirement.

## Endpoint summary

| Property   | Value                                  | Source             |
| ---------- | -------------------------------------- | ------------------ |
| Scheme     | `http` — plaintext, no TLS             | `server.js:L1`     |
| Host       | `127.0.0.1`, the IPv4 loopback         | `server.js:L3`     |
| Port       | `3000`                                 | `server.js:L4`     |
| Base URL   | `http://127.0.0.1:3000/`               | `server.js:L3-L4`  |
| Path space | The entire URL space                   | `server.js:L6-L10` |
| Method set | GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD | `server.js:L6-L10` |
| Media type | `text/plain`, no `charset`             | `server.js:L8`     |
| Status     | `200` on every dispatch                | `server.js:L7`     |

The table states the contract for an **ordinary request** — one the
Node.js runtime parses and then dispatches by emitting the server's
`'request'` event. That is the only event this repository listens for: the
single `http.createServer(...)` call registers the **Request Handler
Callback** as the `'request'` listener, and registers no listener for any
other event. `Source: server.js:L6`. Some client input is answered by the
runtime before it could become a `'request'` event, and the table above
does not describe those cases; [Requests the runtime answers
itself](#requests-the-runtime-answers-itself) lists the ones that were
measured.

Every URL is the same endpoint, for one structural reason: exactly one
request listener is registered on the server, and that listener contains no
routing — no path comparison, no method dispatch, no branching of any kind —
so the whole URL space resolves to a single handler.
`Source: server.js:L6-L10`.

The method set is the seven methods observed against a live instance rather
than a claim of universality. The listener never reads `req.method`
`Source: server.js:L6-L10`, so every method it is handed is answered the
same way — the per-method figures are in
[Method behavior](#method-behavior) — but `CONNECT` is the counter-example
that keeps the row honest: it never reaches the listener at all, because the
runtime delivers `CONNECT` through its separate `connect` event and this
file registers no listener for that event `Source: server.js:L1-L14`. The
runtime's own answers are tabulated in
[Requests the runtime answers itself](#requests-the-runtime-answers-itself).

There is no domain-specific request or response schema to satisfy. The
response body is a fixed greeting string, not a computed or negotiated
payload `Source: server.js:L9`, and this repository holds no client, SDK or
credential for any external system. Where the endpoint's role needs stating,
it is the target endpoint of an integration whose counterpart lives outside
this repository — nothing more.

The bind address is the loopback literal, so the endpoint is reachable only
from the machine the process runs on. A client on another host or in another
container does not receive an HTTP error; the connection fails to establish
at all, which was observed as curl status `000` with exit code 7.
`Source: server.js:L3`. The
[troubleshooting guide](../troubleshooting.md) covers that symptom as it is
met in practice, and [configuration](../configuration.md) covers what
changing the literal would mean.

## Request: what is accepted, and what is ignored

Of every request that reaches the **Request Handler Callback**, everything
is accepted and everything is ignored. The callback imposes no requirement
on the request: no required header, no required media type, no required
query parameter, no authentication and no request schema.

That scope is the whole of this section. Reaching the callback takes a
syntactically valid ordinary HTTP request, because the runtime emits the
`request` event only for one; the shapes it answers itself instead are
tabulated in
[Requests the runtime answers itself](#requests-the-runtime-answers-itself).

| Request element | Accepted | Read by application code |
| --------------- | -------- | ------------------------ |
| Method          | Any      | No                       |
| Path            | Any      | No                       |
| Query string    | Any      | No                       |
| Headers         | Any      | No                       |
| Body            | Any      | No                       |

The reason is visible in the handler's parameter list: its first parameter,
`req`, is bound and then never used. The three statements in the body assign
a status, set one header, and end the response — none of them reads the
request. `Source: server.js:L6-L10`.

That is mechanically provable rather than a reading of intent. The count has
to remove the whole documentation-comment spans rather than every line that
begins with a comment marker: the file's JSDoc blocks close on the same line
as the code they document, so a line filter would discard
`*/(req, res) => {` and take the handler's own signature with it.

```bash
node -e 'const src = require("node:fs").readFileSync("server.js", "utf8");
const code = src.replace(/\/\*[\s\S]*?\*\//g, "");
console.log((code.match(/req\.url/g) || []).length);'
```

Observed output, with exit status `0` so the check is safe under `set -e`,
and the same output for `req.method` and `req.headers` when the pattern is
substituted:

```text
0
```

Two consequences follow for a client. There is no validation to fail in the
handler, so an unexpected request is not rejected by it — the request is
answered exactly like any other. And because the handler never touches the
request stream, the request body is never read or observed by application
code. The bytes are not left on the wire for that reason: because the
application never consumed the request, the Node.js runtime drains and
discards whatever was unread once the response has finished. Draining is
the runtime's work, not an omission. `Source: server.js:L6-L10`.

## Requests the runtime answers itself

"Not read by application code" and "accepted at the wire level" are two
different claims, and this is where they come apart. Application code
ignores everything it is given `Source: server.js:L6-L10`; the Node.js
runtime decides what it is given. Some request shapes the runtime answers
itself, before the `request` event is emitted — so the **Request Handler
Callback** never runs, and the client never receives the greeting. Nothing
in this repository asks for that handling or configures it
`Source: server.js:L1-L14`; it belongs to the runtime, and every row below
was observed against a live instance under Node.js 24.19.0 with requests
written directly to the socket.

| Request as sent                   | Observed response                     |
| --------------------------------- | ------------------------------------- |
| `HTTP/1.1` request with no `Host` | `400 Bad Request`, then closed        |
| Malformed request line            | `400 Bad Request`, then closed        |
| Unrecognised method token         | `400 Bad Request`, then closed        |
| Header field over the maximum     | `431 Request Header Fields Too Large` |
| `Expect: 999-unsupported`         | `417 Expectation Failed`, kept alive  |
| Header block never terminated     | `408 Request Timeout`, then closed    |
| `CONNECT`                         | No response at all; closed            |

Each row, with the detail that matters for telling it apart from the
documented contract:

- The `Host` requirement is **`HTTP/1.1`-specific**, not universal.
  `GET / HTTP/1.1` with no `Host` header was answered `400 Bad Request` with
  `Connection: close` and no greeting. The same request sent as
  `GET / HTTP/1.0`, where `Host` is not mandatory, reached the callback and
  was answered `200` with `Content-Type: text/plain` and the 14-byte body.
- A malformed request line — the literal bytes `THIS IS NOT HTTP` — was
  answered `400 Bad Request` with `Connection: close` and a zero-byte body.
- An unrecognised method token — `FROBNICATE / HTTP/1.1` with a `Host`
  header — was answered `400 Bad Request` with `Connection: close` and a
  zero-byte body. The runtime rejects the token; no line of this file is
  reached. `Source: server.js:L1-L14`.
- One header field of 20,000 bytes, above the runtime's default maximum
  header size, was answered `431 Request Header Fields Too Large` with
  `Connection: close` and a zero-byte body.
- A `POST` carrying `Expect: 999-unsupported` was answered
  `417 Expectation Failed`, and this is the one runtime answer observed to
  keep the connection alive: it arrived with `Connection: keep-alive` and
  `Keep-Alive: timeout=5` rather than `Connection: close`.
- A header block held open without its terminating blank line was answered
  `408 Request Timeout` with `Connection: close`. The threshold that decides
  it is a runtime timeout setting, and nothing in this file sets it
  `Source: server.js:L1-L14`, so no figure for it is quoted here as though
  it were part of the contract.
- `CONNECT 127.0.0.1:443 HTTP/1.1` with a `Host` header received **zero
  bytes** and the connection was closed — not a status, silence. `CONNECT`
  is delivered through the server's separate `connect` event, and this file
  registers no listener for it `Source: server.js:L1-L14`.

None of those responses comes from `server.js`, and that is how to recognise
one: not a single one carried `Content-Type: text/plain`, and not a single
one carried the 14-byte greeting. For an ordinary request nothing about the
documented contract changes — `GET /any/path HTTP/1.1` with a `Host` header
was answered `200`, `Content-Type: text/plain`, `Content-Length: 14` and
`Hello, World!\n` on the same instance, as
[Worked examples](#worked-examples) records.

Two request shapes that look as though they belong in that table do not, and
both were checked rather than assumed. `Expect: 100-continue` is answered by
the runtime with `100 Continue` on its own — no `'checkContinue'` listener
is registered either — and the request is then dispatched as an ordinary
`'request'` and answered `200`. An upgrade request, carrying
`Connection: Upgrade` and `Upgrade: websocket`, is also dispatched as an
ordinary `'request'` and answered `200`, because no `'upgrade'` listener is
registered for the runtime to hand it to. `Source: server.js:L1-L14`.

## Response status

The status is always `200` on every request that reaches the handler. It is
assigned as the handler's first statement, unconditionally, before anything
about the request could be considered. `Source: server.js:L7`.

No other status originates in application code. There is no second status
assignment anywhere in the file, and no code path that could reach one:
`res.statusCode = 200` is the only assignment, and the handler has no
branches. `Source: server.js:L6-L10`. Across every method and path recorded
on this page, the only status observed was `200`.

### Statuses the runtime produces on its own

A status other than `200` therefore does not come from this repository. It
comes from the runtime, on input the runtime answers itself rather than
dispatching as a `'request'` event — the handler never runs, and no line of
`server.js` participates. `Source: server.js:L1-L14`. Every such case
measured under Node.js 24.19.0 is tabulated once, under [Requests the
runtime answers itself](#requests-the-runtime-answers-itself), together with
the two request shapes that look as though they belong there and were
measured not to.

## Response headers

There is no single invariant header set to state here, so the exchange
below is labelled for exactly what it is: the **observed default HTTP/1.1
keep-alive exchange** — a root `GET` issued by `curl` over a fresh
connection under Node.js 24.19.0, with the headers in the order they were
received. It is one branch of the runtime's output rather than the
endpoint's fixed header set.

```http
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Fri, 11 Sep 2026 13:27:06 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 14

Hello, World!
```

Five headers in that exchange, and the application-set one arrives first,
ahead of the headers the runtime adds. That ordering was observed rather
than specified anywhere in the source.

The provenance of each header is the single most consequential distinction
on this page, because it separates what this repository states from what the
Node.js runtime happens to provide around it:

| Header                     | Set by                       | Source         |
| -------------------------- | ---------------------------- | -------------- |
| `Content-Type: text/plain` | Application code, always set | `server.js:L8` |
| `Date`                     | Node runtime, per response   | n/a            |
| `Connection`               | Node runtime, conditional    | n/a            |
| `Keep-Alive`               | Node runtime, conditional    | n/a            |
| `Content-Length`           | Node runtime, derived        | `server.js:L9` |

Four details in that table are easy to get wrong from a reading of the
source alone:

- `Content-Type` is exactly `text/plain`, with **no `charset` parameter**.
  The call passes the bare media type and nothing else, and header
  inspection confirms no parameter is appended. `Source: server.js:L8`.
- `Content-Type` is the **only** header application code sets, and the only
  one present unconditionally. There is a single `res.setHeader(...)` call
  in the file. `Source: server.js:L8`.
- `Content-Length: 14` is **derived** by the runtime from the payload handed
  to `res.end(...)`, not declared in code. The value follows from the body
  `Source: server.js:L9`, but no statement sets the header — and the
  runtime does not always emit it at all.
- `Date` is generated by the runtime, and its value is time-dependent rather
  than fixed. Its shape is `Date: <HTTP-date>` — the format defined by
  RFC 9110, which is what current Node.js documentation points to. HTTP-date
  has one-second resolution, so the value **may repeat**: successive
  responses issued within the same second were observed carrying the
  identical `Date`. It is therefore not a literal to match, and the value
  shown in the fence above is one observed instance.

### Which of those headers vary, and with what

`Connection` and the optional `Keep-Alive` are chosen by the runtime from
the HTTP version, the request's own connection state and the response
framing; `Content-Length` depends on whether there is a body to measure and
on whether the framing needs one. None of that is expressed in `server.js`,
which sets a single header and nothing else. `Source: server.js:L8`. Four
exchanges against this endpoint were measured under Node.js 24.19.0 — the
second is an HTTP/1.1 request that itself sent `Connection: close`:

| Exchange         | `Connection` | `Keep-Alive` | `Content-Length` |
| ---------------- | ------------ | ------------ | ---------------- |
| HTTP/1.1 default | `keep-alive` | `timeout=5`  | `14`             |
| HTTP/1.1 `close` | `close`      | absent       | `14`             |
| HTTP/1.0         | `close`      | absent       | absent           |
| HTTP/1.1 `HEAD`  | `keep-alive` | `timeout=5`  | absent           |

The status was `200` and `Content-Type` was `text/plain` in all four. On
HTTP/1.0 the body is framed by the connection close rather than by a
length, which is why no `Content-Length` appears; on `HEAD` there is no
body to measure, which [Method behavior](#method-behavior) covers in full.

For an integrator, the practical reading is that one header —
`Content-Type: text/plain` — is a contract this repository states, and
everything else is runtime behavior that a runtime upgrade could
legitimately change, and that two of those headers may not be present at
all. No header beyond those five appeared in any of the four exchanges:
there is no `Server`, `ETag`, `Cache-Control`, `X-Powered-By` or CORS
header among them.

### Security-control and CORS headers that are absent

That broad observation — no header beyond those five — is worth making
specific for the security-control families a reviewer looks for by name,
because "no other header appeared" and "no `X-Frame-Options`" read very
differently in a review. This subsection is informational: it records
what is absent from the four exchanges measured above and what the
absence means for a client, and it proposes adding nothing. The
control-family framing is the one a reviewer may know as CWE-693, cited
here for context only.

The `Observed` column is the number of headers of that family seen
across all four exchanges tabulated above — every one of them zero:

| Control family              | Observed | What it would have controlled |
| --------------------------- | -------- | ----------------------------- |
| `X-Content-Type-Options`    | 0        | MIME-type sniffing opt-out    |
| `X-Frame-Options`           | 0        | Framing, i.e. clickjacking    |
| `Content-Security-Policy`   | 0        | Content and `frame-ancestors` |
| `Strict-Transport-Security` | 0        | HTTPS-only transport          |
| `Access-Control-Allow-*`    | 0        | Cross-origin access grants    |

- Clickjacking protection is absent by either route a browser would
  accept: no `X-Frame-Options` header, and no `Content-Security-Policy`
  carrying `frame-ancestors`. The response therefore reaches a client
  with no framing instruction attached to it.
- With no `X-Content-Type-Options: nosniff`, nothing in the response
  asks a client to refrain from content-type sniffing. The declared type
  is `text/plain`, and the client's own sniffing policy decides what
  follows from that.
- The `Access-Control-Allow-*` count is the explicit one: **zero**
  headers of that family in any observed response — no
  `Access-Control-Allow-Origin`, `-Methods`, `-Headers` or
  `-Credentials`, and no `Vary: Origin`. No cross-origin grant of any
  kind is expressed, so a browser applies its own same-origin rules
  unmodified.

Three facts fix the provenance of every zero in that table:

- Application code sets exactly one response header,
  `Content-Type: text/plain`, through the file's single
  `res.setHeader(...)` call. No other `res.setHeader(...)` call exists
  in the file, so no header of any family above can originate there.
  `Source: server.js:L8`.
- Node.js 24.19.0 added none of these controls on its own. In the four
  exchanges tabulated above, the only headers observed were
  `Content-Type`, `Date`, `Connection`, `Keep-Alive` and
  `Content-Length`.
- Nothing in the file configures, negotiates or opts out of any of them.
  There is no middleware, no header policy and no branch that could emit
  one. `Source: server.js:L1-L14`.

Their absence is acceptable only because this is a loopback-bound,
plaintext, unauthenticated local engineering fixture that is not deployed
publicly `Source: server.js:L3` — not because the controls are
unnecessary in general. One of them would have no effect on this origin
even if it were set: `Strict-Transport-Security` is defined for HTTPS
responses and is ignored when it arrives over plaintext `http://`, which
is the only scheme this endpoint speaks `Source: server.js:L1`. The other
four would each change what a browser does with this response.

Setting any of these headers would mean a new `res.setHeader(...)` call
in `server.js` — an executable change, and out of scope for a
documentation engagement — so this page documents the absence rather than
closing it. Whoever wanted one would have to set it in application code,
or terminate the connection behind a proxy that sets it; nothing in this
repository does either.

## Response body

The handler's final statement hands the same payload to `res.end(...)` on
every invocation: the fixed string `Hello, World!` followed by a single line
feed. `Source: server.js:L9`. The table below describes that payload, which
is invariant at the application level.

| Property    | Value                                                         |
| ----------- | ------------------------------------------------------------- |
| Content     | `Hello, World!\n`                                             |
| Length      | 14 bytes: 13 printable characters plus one LF                 |
| Encoding    | No `charset` is declared; the bytes are US-ASCII              |
| Line ending | One LF (`0x0A`); no CR and no second newline                  |
| Variability | Identical bytes on every response with a body; none for HEAD  |
| HEAD body   | Zero bytes and no `Content-Length`, suppressed by the runtime |

Content, length, encoding and line ending describe the payload the
**Request Handler Callback** hands to `res.end(...)`
`Source: server.js:L9`. The variability and `HEAD body` rows describe
something different: the response that actually reaches the client. That is
why the variability row is scoped rather than absolute, and why the
`HEAD body` row is attributed to the runtime rather than to this file.
The 14 bytes reach the client on every ordinary request dispatched as a
`'request'` event other than a `HEAD` request. A `HEAD` response is the one
observed exception: status `200`, a zero-byte body, and **no
`Content-Length` header at all**. Application code runs unchanged and still
passes the same 14 bytes, because it never reads `req.method`
`Source: server.js:L6-L10`; the suppression happens in the runtime. The
observed responses are in
[Method behavior](#method-behavior) and [Example D](#example-d--head).

A trailing newline is easy to lose in a terminal, so the length is worth
confirming rather than trusting:

```bash
curl -s http://127.0.0.1:3000/ | od -c
```

```text
0000000   H   e   l   l   o   ,       W   o   r   l   d   !  \n
0000016
```

The dump terminates at octal offset `0000016`, which is 14 in decimal: the
body ends immediately after the LF with no trailing content of any kind. The
byte sequence read back from the response was
`72 101 108 108 111 44 32 87 111 114 108 100 33 10`.
`Source: server.js:L9`.

## Responses this service never produces

These absences are as much a part of the contract as the response itself,
and they are stated here as facts about the current design rather than as
gaps:

| Response          | Produced | Why not                                  |
| ----------------- | -------- | ---------------------------------------- |
| `404 Not Found`   | No       | No routing exists, so no path misses     |
| `405 Not Allowed` | No       | No method dispatch exists                |
| `5xx` from code   | No       | No error path exists in the handler      |
| Redirect (`3xx`)  | No       | `200` is unconditional at `server.js:L7` |
| Error body        | No       | No error response is ever constructed    |

- **No `404`.** No path produces one, including `/favicon.ico`, which
  browsers request on their own initiative and which a reader would expect
  to miss. Every path reaches the same handler and receives the same 200
  response. `Source: server.js:L6-L10`.
- **No `405`.** No method produces one. Method dispatch would require
  reading `req.method`, and nothing in the file reads it.
  `Source: server.js:L6-L10`.
- **No `5xx` originating in application code.** The handler contains no
  `try`/`catch` — the comment-stripped count for `try` and for `catch` is
  `0` — and no error branch, because it has no branches at all. The three
  statements run in order, and the last of them calls `res.end(...)`, which
  returns synchronously and marks the outgoing message ended. That is where
  the application's part stops: it has no continuation, and no `'finish'`,
  `'close'` or error listener on the response anywhere in the file. Stream
  finishing, transmission on the socket and the runtime's own cleanup all
  happen after the callback has returned, asynchronously and unobserved by
  any code here — so there is no error path in application code, rather
  than no possibility of a later failure. `Source: server.js:L6-L10`.
- **No `3xx` redirect.** The reason is the status, not the headers:
  `res.statusCode = 200` is assigned unconditionally
  `Source: server.js:L7`, and the handler has no branch that could reach a
  second assignment `Source: server.js:L6-L10`, so no redirect status is
  ever sent. No `Location` header is set either — the one
  `res.setHeader(...)` call sets `Content-Type` `Source: server.js:L8` —
  but that is a secondary remark rather than the reason, since a redirect is
  determined by the status code and not every `3xx` status carries
  `Location`.
- **No error body to document.** Since application code constructs no error
  response, there is no error payload, no error code vocabulary and no
  error schema to specify. Saying so is the honest specification; anything
  else would be invented.

A client that nevertheless sees a non-200 result is seeing something other
than this file at work — one of the runtime's own answers tabulated in
[Requests the runtime answers itself](#requests-the-runtime-answers-itself),
or a transport-level failure such as the loopback refusal described in
[Endpoint summary](#endpoint-summary), which is a connection failure with no
HTTP status at all.

## Method behavior

| Method                                 | Status | Body size   |
| -------------------------------------- | ------ | ----------- |
| GET, POST, PUT, PATCH, DELETE, OPTIONS | `200`  | 14 bytes    |
| HEAD                                   | `200`  | **0 bytes** |

Each row was observed with one request per method, the `-X` value being the
only thing that changed between runs:

```bash
curl -o /dev/null -s -X POST \
  -w '%{http_code} %{content_type} %{size_download}\n' http://127.0.0.1:3000/
```

Observed output for that request, and for `GET`, `PUT`, `PATCH`, `DELETE`
and `OPTIONS` in the same form:

```text
200 text/plain 14
```

Observed output for `HEAD`:

```text
200 text/plain 0
```

`HEAD` is the only row that differs, and the difference is not written in
application code. The **Request Handler Callback** cannot special-case a
method, because it never reads `req.method`; it runs identically and still
calls `res.end('Hello, World!\n')`. The Node.js runtime suppresses the body
on the way out for a `HEAD` request. `Source: server.js:L6-L10`.

The observed `HEAD` response also carries **no `Content-Length` header at
all** — the runtime omits it, having no body to measure. It is not
`Content-Length: 14` with an empty body; the header is absent. The four
headers that remain are `Content-Type`, `Date`, `Connection` and
`Keep-Alive`, shown in [Example D](#example-d--head).

## Path behavior

| Path                    | Observed            |
| ----------------------- | ------------------- |
| `/`                     | `200 text/plain 14` |
| `/any/path`             | `200 text/plain 14` |
| `/does/not/exist`       | `200 text/plain 14` |
| `/favicon.ico`          | `200 text/plain 14` |
| `/index.html`           | `200 text/plain 14` |
| `/x?q=1&a=2`            | `200 text/plain 14` |
| `/api/v1/users?x=1&y=2` | `200 text/plain 14` |

Each figure is `%{http_code} %{content_type} %{size_download}` as reported
by curl. The list is illustrative rather than exhaustive by construction:
with no routing, one handler answers the entire URL space, so any path a
client invents behaves the same way. `Source: server.js:L6-L10`.

Two rows are worth singling out. `/favicon.ico` matters because a browser
requests it without being asked to, and receives the greeting rather than
the `404` a reader expects. `/x?q=1&a=2` matters because it shows that a
query string changes nothing — it is part of `req.url`, which is never
read.

## No content negotiation

A request advertising `Accept: text/html,application/xhtml+xml` was answered
`200 text/plain 14` — the same status, the same media type and the same 14
bytes as any other request. `Accept` is a request header, and no request
header is read. `Source: server.js:L6-L10`.

The [usage guide](../usage.md) owns the fuller treatment of this from the
caller's side, including what it means when the endpoint is opened in a
browser.

## Worked examples

Every output below was observed against a live instance under Node.js
24.19.0. Start the service from the repository root first:

```bash
node server.js
```

There is no `npm start` to reach for, because the repository has no
`package.json`; [getting started](../getting-started.md) covers the launch
and the readiness line it prints. The four examples below are the cases
whose behavior differs in observable detail — and in three of the four, the
observable detail is that nothing differs at all. In every response block,
the `Date` value is the runtime-generated timestamp described in
[Response headers](#response-headers) and is not a literal to match.

### Example A — root GET

```bash
curl -i http://127.0.0.1:3000/
```

Observed response:

```http
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Fri, 11 Sep 2026 13:27:06 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 14

Hello, World!
```

This is the reference response, and everything the endpoint states as a
contract is in that block: the status `Source: server.js:L7`, the one
application-set header `Source: server.js:L8`, and the 14-byte body
`Source: server.js:L9`. The `Connection` and `Keep-Alive` lines are the
runtime's default HTTP/1.1 choice rather than part of that contract; see
[Which of those headers vary, and with
what](#which-of-those-headers-vary-and-with-what).

### Example B — an arbitrary deep path

```bash
curl -i http://127.0.0.1:3000/does/not/exist
```

Observed response:

```http
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Fri, 11 Sep 2026 13:27:30 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 14

Hello, World!
```

Identical to Example A apart from the runtime-generated `Date`: the same
`200`, the same `text/plain`, the same 14 bytes. A path that exists
nowhere in the source is not a miss, because there is nothing for it to
miss. `Source: server.js:L6-L10`.

### Example C — a non-GET method, with a query string and a body

This one request exercises three ignored inputs at once: a method other
than `GET`, a query string, and a request body with its own media type.

```bash
curl -i -X POST -H 'Content-Type: application/json' \
  -d '{"a":1}' 'http://127.0.0.1:3000/api?q=1'
```

Observed response:

```http
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Fri, 11 Sep 2026 13:27:30 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 14

Hello, World!
```

The reference response again. The method, the query string, the request
`Content-Type` and the JSON body were all ignored: no statement in the
handler reads any of them. `Source: server.js:L6-L10`. The JSON body was
not left on the wire, though — having gone unconsumed by the application,
it was drained and discarded by the runtime once the response had finished.

### Example D — HEAD

```bash
curl -sI http://127.0.0.1:3000/
```

Observed response:

```http
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Fri, 11 Sep 2026 13:27:23 GMT
Connection: keep-alive
Keep-Alive: timeout=5
```

Four headers, status `200`, and a zero-byte body. Note what is missing:
`Content-Length` does not appear at all, because the runtime has no body to
measure. The application code ran unchanged and still handed
`Hello, World!\n` to `res.end(...)`; the suppression happened in the
runtime. `Source: server.js:L6-L10`.

## Produced by the Request Handler Callback

This contract is produced entirely by one function: the **Request Handler
Callback**, the anonymous arrow function registered as the sole argument to
`http.createServer(...)` at `server.js:L6` and invoked for the server's
`request` event. Its three statements are the status
`Source: server.js:L7`, the header `Source: server.js:L8` and the body
`Source: server.js:L9`.

A reader who has the contract and now wants the function — its signature,
its parameters, its statement-by-statement behavior and what it deliberately
ignores — should continue to the
[Request Handler Callback reference](./functions/request-handler-callback.md).
The endpoint is reachable in the first place because the socket is bound by
`server.listen(port, hostname, callback)` at `server.js:L12`, whose third
argument is the **Listen Readiness Callback**; the bindings and both call
sites are documented in [module bindings](./module-bindings.md).

## Source and traceability

| Attribute        | Value                                           |
| ---------------- | ----------------------------------------------- |
| Source           | `server.js:L6-L10`                              |
| Supporting lines | `server.js:L3`, `server.js:L4`, `server.js:L12` |
| Baseline commit  | `1484182`                                       |
| Implements       | F-002 Uniform HTTP Response Handler (Critical)  |
| Exposed by       | F-001 HTTP Server Listener (Critical)           |
| Upstream section | §2.1.2 for F-002; §2.1 for the feature catalog  |
| Runtime observed | Node.js 24.19.0 (Active LTS "Krypton")          |

F-002 Uniform HTTP Response Handler is the feature this contract is the
observable face of: one status, one header, one body, for every request the
**Request Handler Callback** is handed.
F-001 HTTP Server Listener is what makes the contract reachable — the server
creation at `server.js:L6` and the bind at `server.js:L12`. No other feature
identifier applies to this page.

The conventions used here — source locators on every claim, tables for
contracts, stable role names for the two callbacks — are established by this
documentation set rather than inherited from the repository, which carried no
documentation structure to imitate before it.

## Related documentation

- [Documentation hub](../README.md) — the index for this documentation set.
- [API reference index](./README.md) — the parent index, with the full
  inventory of documented units.
- [Request Handler Callback](./functions/request-handler-callback.md) — the
  function that produces this contract, documented on its own page.
- [Module bindings](./module-bindings.md) — `http`, `hostname`, `port` and
  `server`, plus the `http.createServer(...)` and `server.listen(...)` call
  sites.
- [Usage](../usage.md) — client examples from the caller's side, the browser
  case, and what not to do with this file.
- [Getting started](../getting-started.md) — prerequisites, the launch
  command, and first verification of this contract.
- [Configuration](../configuration.md) — the hardcoded host and port behind
  the base URL, and what changes if either is edited.
- [Troubleshooting](../troubleshooting.md) — the loopback refusal, the
  uniform response, and the other behaviors that surprise readers first.
- [Request lifecycle](../architecture/request-lifecycle.md) — the end-to-end
  path a request takes to produce this response.
