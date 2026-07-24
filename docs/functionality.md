# Functionality Reference

The service comprises three functionalities — **F-001 HTTP Server Listener**, **F-002 Uniform Request Handler**, and **F-003 Startup Readiness Logger** — implemented entirely in the single-file Node.js service `server.js`, which uses only the standard-library `http` module (`Source: server.js:L1-L14`). This reference is written for a technical audience; every technical statement below cites the exact source line(s) it reflects, and all documented values derive exclusively from `server.js`.

## F-001 — HTTP Server Listener

F-001 binds a TCP listener on host `127.0.0.1` (`Source: server.js:L3`) and port `3000` (`Source: server.js:L4`) via `server.listen(port, hostname, callback)` (`Source: server.js:L12`). The server object being bound is created by `http.createServer(...)` (`Source: server.js:L6`).

- **Bind target.** Host `127.0.0.1` (`Source: server.js:L3`) and port `3000` (`Source: server.js:L4`).
- **Bind call.** `server.listen(port, hostname, callback)` (`Source: server.js:L12`).
- **Server object.** Created by `http.createServer(...)` (`Source: server.js:L6`).
- **Lifecycle / bind semantics.** The `listen` callback fires exactly once, after the socket is successfully bound (`Source: server.js:L12-L14`). This one-time startup path is diagrammed as workflow **W-1** in [`./architecture.md`](./architecture.md).

**Example (run + log):**

```sh
node server.js
```

```text
Server running at http://127.0.0.1:3000/
```

The stdout line is written only after the bind succeeds (`Source: server.js:L12-L14`); its content is documented under F-003 below.

## F-002 — Uniform Request Handler (KEY functionality)

**This is the KEY functionality.** It defines the entire observable HTTP behavior of the service.

For **every** request, the handler:

- sets the status code to `200` (`Source: server.js:L7`);
- sets the response header `Content-Type: text/plain` (`Source: server.js:L8`); and
- ends the response with the body `Hello, World!\n` (`Source: server.js:L9`).

The `req` object is **never inspected** — no request method, path, query string, headers, or body is read anywhere in the handler — so the service presents a single catch-all with no routing and no path- or method-based dispatch (`Source: server.js:L6-L10`). This per-request path is diagrammed as workflow **W-2** in [`./architecture.md`](./architecture.md), and the complete response contract (including the headers added automatically by the `http` module) is documented in [`./api-reference.md`](./api-reference.md).

**Example (`curl`):**

```sh
curl -i http://127.0.0.1:3000/
```

```text
HTTP/1.1 200 OK
Content-Type: text/plain
...
Hello, World!
```

Because `req` is ignored, the identical response is returned for any method and any path — for example, `curl -X POST http://127.0.0.1:3000/anything` yields the same status, `Content-Type`, and body (`Source: server.js:L6-L10`).

## F-003 — Startup Readiness Logger

After a successful bind, a single line is written to standard output from within the `listen` callback: `Server running at http://127.0.0.1:3000/` (`Source: server.js:L13`, emitted inside the `server.listen(...)` callback `Source: server.js:L12-L14`). This is the only startup/readiness signal the process emits (`Source: server.js:L13`).

**Example (expected stdout):**

```text
Server running at http://127.0.0.1:3000/
```

## Configuration constants (C-1)

Configuration is hard-coded as module-scope literals; there is **no** environment-variable or config-file override mechanism (constraint **C-1**). The two constants are:

| Constant | Value | Source | Overridable? |
|----------|-------|--------|--------------|
| `hostname` | `127.0.0.1` | `server.js:L3` | No — compile-time literal (C-1) |
| `port` | `3000` | `server.js:L4` | No — compile-time literal (C-1) |

Changing the host or port therefore requires editing `server.js` directly (`Source: server.js:L3-L4`).

## Operational limitations

- **A-2 — Loopback-only reachability.** The server binds the loopback address `127.0.0.1` (`Source: server.js:L3`), so it is reachable only from the local host; it is not exposed on external or other non-loopback network interfaces (`Source: server.js:L3`).
- **C-2 — Unhandled bind failure.** No `error` handler is attached to the server or to the `listen` call (`Source: server.js:L12-L14`), so a bind failure — for example, when port `3000` is already in use — raises an unhandled `error` event that crashes the process. Empirically, starting a second instance on the same host and port fails with `Error: listen EADDRINUSE: address already in use 127.0.0.1:3000` and the process exits with code `1` (`Source: server.js:L12-L14`).
- **C-3 — Single-log observability.** The sole observability signal is the one stdout readiness line (`Source: server.js:L13`); the service performs no logging of requests, errors, or metrics (`Source: server.js:L1-L14`).
