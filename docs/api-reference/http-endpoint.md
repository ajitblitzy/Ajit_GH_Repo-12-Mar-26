# HTTP endpoint reference

This page is the wire-level contract for the one HTTP endpoint this
repository exposes. It states the status code, the complete response header
set with the provenance of each header, and the byte-exact response body, so
that an integrator can tell precisely what may be relied upon and what is
merely the runtime's doing. Every claim below carries a `server.js` locator
or was observed against a live instance. The contract is the observable
effect of the **Request Handler Callback**; that function is documented in
its own right on the
[Request Handler Callback reference](./functions/request-handler-callback.md).

## Contents

- [How to read the locators on this page](#how-to-read-the-locators-on-this-page)
- [Endpoint summary](#endpoint-summary)
- [Request: what is accepted, and what is ignored](#request-what-is-accepted-and-what-is-ignored)
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
(Active LTS "Krypton"), the documented baseline runtime;
[getting started](../getting-started.md) owns the full support table.

## Endpoint summary

| Property   | Value                          | Source             |
| ---------- | ------------------------------ | ------------------ |
| Scheme     | `http` — plaintext, no TLS     | `server.js:L1`     |
| Host       | `127.0.0.1`, the IPv4 loopback | `server.js:L3`     |
| Port       | `3000`                         | `server.js:L4`     |
| Base URL   | `http://127.0.0.1:3000/`       | `server.js:L3-L4`  |
| Path space | The entire URL space           | `server.js:L6-L10` |
| Method set | Every method                   | `server.js:L6-L10` |
| Media type | `text/plain`, no `charset`     | `server.js:L8`     |
| Status     | `200`, unconditionally         | `server.js:L7`     |

Every URL is the same endpoint, for one structural reason: exactly one
request listener is registered on the server, and that listener contains no
routing — no path comparison, no method dispatch, no branching of any kind —
so the whole URL space resolves to a single handler.
`Source: server.js:L6-L10`.

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

Everything is accepted, and everything is ignored. The endpoint imposes no
requirement on the request: no required header, no required media type, no
required query parameter, no authentication and no request schema.

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

That is mechanically provable rather than a reading of intent. Stripping the
documentation-comment lines first gives a count that describes what
executes:

```bash
grep -v -E '^[[:space:]]*(/\*|\*)' server.js | grep -c -F "req.url"
```

Observed output, and the observed output for `req.method` and `req.headers`
in the same form:

```text
0
```

Two consequences follow for a client. There is no validation to fail, so a
malformed or unexpected request is not rejected — it is answered exactly
like any other. And because the handler never touches the request stream,
the request body is never consumed or drained; it is simply left unread
while the response is written. `Source: server.js:L6-L10`.

## Response status

The status is always `200`. It is assigned as the handler's first statement,
unconditionally, before anything about the request could be considered.
`Source: server.js:L7`.

No other status originates in application code. There is no second status
assignment anywhere in the file, and no code path that could reach one:
`res.statusCode = 200` is the only assignment, and the handler has no
branches. `Source: server.js:L6-L10`. Across every method and path recorded
on this page, the only status observed was `200`.

## Response headers

The observed response to a root `GET`, in the order the headers were
received:

```http
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Fri, 11 Sep 2026 13:27:06 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 14

Hello, World!
```

Five headers, and the application-set one arrives first, ahead of the
headers the runtime adds. That ordering was observed rather than specified
anywhere in the source.

The provenance of each header is the single most consequential distinction
on this page, because it separates what this repository states from what the
Node.js runtime happens to provide around it:

| Header                     | Set by                 | Source         |
| -------------------------- | ---------------------- | -------------- |
| `Content-Type: text/plain` | Application code       | `server.js:L8` |
| `Date`                     | Node runtime, injected | n/a            |
| `Connection: keep-alive`   | Node runtime, injected | n/a            |
| `Keep-Alive: timeout=5`    | Node runtime, injected | n/a            |
| `Content-Length: 14`       | Node runtime, derived  | `server.js:L9` |

Four details in that table are easy to get wrong from a reading of the
source alone:

- `Content-Type` is exactly `text/plain`, with **no `charset` parameter**.
  The call passes the bare media type and nothing else, and header
  inspection confirms no parameter is appended. `Source: server.js:L8`.
- `Content-Type` is the **only** header application code sets. There is a
  single `res.setHeader(...)` call in the file. `Source: server.js:L8`.
- `Content-Length: 14` is **derived** by the runtime from the payload handed
  to `res.end(...)`, not declared in code. The value follows from the body
  `Source: server.js:L9`, but no statement sets the header.
- `Date` carries a per-request timestamp. Its shape is
  `Date: <RFC 7231 timestamp>` and its value differs on every response, so
  it is not a literal to match. The value shown in the fence above is one
  observed instance.

For an integrator, the practical reading is that one header —
`Content-Type: text/plain` — is a contract this repository states, and the
other four are runtime behavior that a runtime upgrade could legitimately
change. No other header was observed: the set above is complete, with no
`Server`, `ETag`, `Cache-Control`, `X-Powered-By` or CORS header among them.

## Response body

The body is the fixed string `Hello, World!` followed by a single line feed,
passed to `res.end(...)` as the handler's final statement.
`Source: server.js:L9`.

| Property    | Value                                               |
| ----------- | --------------------------------------------------- |
| Content     | `Hello, World!\n`                                   |
| Length      | 14 bytes: 13 printable characters plus one LF       |
| Encoding    | No `charset` is declared; the bytes are US-ASCII    |
| Line ending | One LF (`0x0A`); no CR and no second newline        |
| Variability | Identical bytes on every response, without exception|

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

| Response          | Produced | Why not                               |
| ----------------- | -------- | ------------------------------------- |
| `404 Not Found`   | No       | No routing exists, so no path misses  |
| `405 Not Allowed` | No       | No method dispatch exists             |
| `5xx` from code   | No       | No error path exists in the handler   |
| Redirect (`3xx`)  | No       | No `Location` header is ever set      |
| Error body        | No       | No error response is ever constructed |

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
  statements run in order and the response is completed synchronously
  within the callback. `Source: server.js:L6-L10`.
- **No error body to document.** Since application code constructs no error
  response, there is no error payload, no error code vocabulary and no
  error schema to specify. Saying so is the honest specification; anything
  else would be invented.

A client that nevertheless sees a non-200 result is seeing something other
than this file at work — the runtime's own handling of a malformed request,
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
the `Date` value is the per-request timestamp described in
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

This is the reference response. Everything the endpoint returns is in that
block: the status `Source: server.js:L7`, the one application-set header
`Source: server.js:L8`, and the 14-byte body `Source: server.js:L9`.

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

Identical to Example A apart from the per-request `Date`: the same `200`,
the same `text/plain`, the same 14 bytes. A path that exists nowhere in the
source is not a miss, because there is nothing for it to miss.
`Source: server.js:L6-L10`.

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
`Content-Type` and the JSON body were all ignored, and the request body was
never consumed or drained. `Source: server.js:L6-L10`.

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
observable face of: one status, one header, one body, for every request.
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
