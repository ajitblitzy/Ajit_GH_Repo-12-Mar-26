# hao-backprop-test — Documentation

## Project summary

`hao-backprop-test` is a minimal, single-process Node.js HTTP service implemented entirely in `server.js`, using only the Node.js standard-library `http` module with zero third-party dependencies (`Source: server.js:L1`). It binds an HTTP listener to host `127.0.0.1` and port `3000` (`Source: server.js:L3-L4`) through `server.listen(port, hostname, callback)` (`Source: server.js:L12`). For every request it receives, the handler returns a fixed response — status `200`, header `Content-Type: text/plain`, and body `Hello, World!\n` (`Source: server.js:L7-L9`). These behaviors correspond to three documented functionalities: the HTTP server listener (F-001), the uniform request handler (F-002, the key functionality), and the startup readiness logger (F-003) (`Source: server.js:L6-L13`). Its stated purpose is to serve as a test project for backprop integration (`Source: README.md:L1-L2`).

## Documentation map

- [Getting started](./getting-started.md) — prerequisites, run, verify, and stop the service.
- [Architecture](./architecture.md) — design overview and Mermaid diagrams (component overview, W-1 startup, W-2 request/response).
- [Functionality reference](./functionality.md) — F-001 / F-002 (KEY) / F-003, configuration constants, and operational limitations.
- [API reference](./api-reference.md) — HTTP endpoint behavior, the request/response contract, and response headers.

> Every technical statement across this documentation set is annotated with a `Source: server.js:Ln` (or `Source: README.md:Ln`) citation referencing the exact repository lines, so each documented value is traceable to code.
