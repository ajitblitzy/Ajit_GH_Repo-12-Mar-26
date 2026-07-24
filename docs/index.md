# hao-backprop-test — Documentation

## Project summary

`hao-backprop-test` (`Source: README.md:L1`) is a minimal Node.js HTTP service whose only import is the Node.js standard-library `http` module (`Source: server.js:L1`); inspection of the complete repository shows a single-process, single-file design with no third-party dependencies, no `package.json`, and no lockfile. It binds an HTTP listener to host `127.0.0.1` and port `3000` (`Source: server.js:L3-L4`) through `server.listen(port, hostname, callback)` (`Source: server.js:L12`). The request handler never inspects the incoming `req` object, so for every ordinary request it sets the same application response — status `200` (`Source: server.js:L7`), header `Content-Type: text/plain` (`Source: server.js:L8`), and a call to `res.end('Hello, World!\n')` that sends the 14-byte body (`Source: server.js:L9`); Node's `http` module applies protocol-level exceptions at the wire level — for example, a `HEAD` response carries the status and headers but no body — which are detailed in the [API reference](./api-reference.md). These behaviors correspond to three documented functionalities: the HTTP server listener (F-001), the uniform request handler (F-002, the key functionality), and the startup readiness logger (F-003) (`Source: server.js:L6-L13`). Its stated purpose is to serve as a test project for backprop integration (`Source: README.md:L3`).

## Documentation map

- [Getting started](./getting-started.md) — prerequisites, run, verify, and stop the service.
- [Architecture](./architecture.md) — design overview and Mermaid diagrams (component overview, W-1 startup, W-2 request/response).
- [Functionality reference](./functionality.md) — F-001 / F-002 (KEY) / F-003, configuration constants, and operational limitations.
- [API reference](./api-reference.md) — HTTP endpoint behavior, the request/response contract, and response headers.

> Technical statements in this documentation set are traceable to evidence: values defined in the source carry a `Source: server.js:Ln` (or `Source: README.md:Ln`) citation to the exact repository lines; absence and inventory claims (for example, "no third-party dependencies") are attributed to inspection of the complete repository; and wire-level runtime details are attributed to explicitly scoped runtime observations or to Node.js `http`-module semantics.
