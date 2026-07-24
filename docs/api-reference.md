# API Reference

This service exposes a single HTTP interface bound to host `127.0.0.1` and port `3000` (`Source: server.js:L3-L4`, `Source: server.js:L12`). It is implemented as a single-file Node.js service that uses only the standard-library `http` module (`Source: server.js:L1`); the reference below documents the complete, observable request/response behavior of that interface.

The request handler that implements this behavior is **F-002 Uniform Request Handler**, the key functionality of the service. For the functionality-level description of F-002, see [`./functionality.md`](./functionality.md).

## Endpoint model

There is exactly **one catch-all endpoint**. Every HTTP request — regardless of method or path — is handled identically, because the handler does not inspect the incoming request object (`Source: server.js:L6-L10`).

Concretely, the service provides:

- **No routing** — there is no route table and no path-based dispatch.
- **No path matching** — `/`, `/anything`, and `/a/b/c` are all handled the same way.
- **No method dispatch** — `GET`, `POST`, `PUT`, `DELETE`, and any other method are all handled the same way.

The handler is registered once via `http.createServer((req, res) => { ... })` and returns a single fixed response for all traffic (`Source: server.js:L6-L10`).

## Request handling

The request object (`req`) is received in the handler signature but is **never read** (`Source: server.js:L6`). No request method, path, query string, request header, or request body is parsed or used anywhere in the handler (`Source: server.js:L6-L10`).

Consequently, the **shape of the request has no effect on the response**. This is empirically confirmed: `GET /` and `POST /anything/else?q=1` sent with a request body return identical responses (`Source: server.js:L6-L10`).

## Response contract

Every request receives the following fixed response:

| Aspect | Value | Source |
|--------|-------|--------|
| Status code | `200` | `server.js:L7` |
| Status text | `OK` (from status 200) | `server.js:L7` |
| `Content-Type` | `text/plain` | `server.js:L8` |
| Response body | `Hello, World!\n` (14 bytes) | `server.js:L9` |

This exact contract is returned for **every** request, independent of method, path, headers, or body (`Source: server.js:L6-L10`).

## Response headers

Only `Content-Type` is set explicitly in the source (`Source: server.js:L8`). The remaining headers are added automatically by Node's `http` module and are **not** present in `server.js`:

| Header | Value | Origin |
|--------|-------|--------|
| `Content-Type` | `text/plain` | Set explicitly in code (`server.js:L8`) |
| `Date` | RFC 1123 GMT timestamp (dynamic) | Node `http` module default |
| `Connection` | `keep-alive` | Node `http` module default |
| `Keep-Alive` | `timeout=5` | Node `http` module default |
| `Content-Length` | `14` | Node `http` module (byte length of body at `server.js:L9`) |

> **Note:** The `Date`, `Connection`, `Keep-Alive`, and `Content-Length` headers are provided automatically by Node's `http` module; they are not written anywhere in `server.js`. The exact set and format of these default headers may vary slightly across Node.js versions. However, `Content-Type: text/plain` (`Source: server.js:L8`) and `Content-Length: 14` are stable for this fixed body — `Content-Length` equals the byte length of the 14-byte body `Hello, World!\n` (`Source: server.js:L9`). The `Date` value is dynamic and is regenerated on every response.

## Example

Request:

```sh
curl -i http://127.0.0.1:3000/
```

Response:

```http
HTTP/1.1 200 OK
Content-Type: text/plain
Date: <dynamic RFC 1123 timestamp>
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 14

Hello, World!
```

Because the handler ignores `req` (`Source: server.js:L6-L10`), the same response is returned for any method and any path — for example, `curl -X POST http://127.0.0.1:3000/anything` yields the identical status, headers, and body (only the dynamic `Date` header reflects the time of each response). For the functionality-level description of this handler (F-002), see [`./functionality.md`](./functionality.md).
