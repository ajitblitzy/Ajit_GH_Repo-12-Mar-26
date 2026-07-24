# Getting Started

This guide covers the prerequisites for the `hao-backprop-test` service and the procedure to run it, verify its response, and stop it.

## Prerequisites

- **Node.js LTS runtime.** Any maintained Node.js LTS release is sufficient; the service imports only the Node.js standard-library `http` module and uses no other runtime features (`Source: server.js:L1`).
- **A free loopback TCP port `3000`.** The service binds the fixed port `3000` (`Source: server.js:L4`) on the fixed host `127.0.0.1` (`Source: server.js:L3`), so that port on the loopback interface must be available before starting.
- **No dependency install step.** There is no `package.json` and no third-party packages to install; the only import is the built-in `http` module (`Source: server.js:L1`).

## Run

Start the service from the repository root:

```sh
node server.js
```

The process runs in the foreground. It creates an HTTP server and binds it to `127.0.0.1:3000` through `server.listen(port, hostname, callback)` — this is the F-001 HTTP Server Listener — using the hard-coded port `3000` (`Source: server.js:L4`) and host `127.0.0.1` (`Source: server.js:L3`) passed to `listen` (`Source: server.js:L12`).

## Expected output

On a successful bind, the process prints exactly one readiness line to stdout — the F-003 Startup Readiness Logger — emitted from the `server.listen` callback (`Source: server.js:L12-L14`):

```text
Server running at http://127.0.0.1:3000/
```

This line is produced by the `console.log` call inside the listen callback (`Source: server.js:L13`). After printing it, the process remains running in the foreground, waiting to accept requests.

## Verify

With the service running, send a request from a second terminal:

```sh
curl http://127.0.0.1:3000/
```

The command prints the response body:

```text
Hello, World!
```

The response is HTTP status `200` (`Source: server.js:L7`) with the header `Content-Type: text/plain` (`Source: server.js:L8`), and the body is the text `Hello, World!` followed by a single newline byte (`Source: server.js:L9`). Because the request handler never inspects the incoming `req` object, the handler produces this same response for any HTTP method and any path (`Source: server.js:L6-L10`). For the complete request/response contract and the full set of response headers, see [`./api-reference.md`](./api-reference.md).

## Stop

The service runs in the foreground, so no separate stop command is required. Press **Ctrl-C** (SIGINT) in the terminal where the service is running to terminate the process.
