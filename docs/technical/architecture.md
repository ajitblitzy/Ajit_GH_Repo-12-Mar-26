# Architecture

This document explains the system structure of `hao-backprop-test` for engineers. It describes what the project contains, how its single runtime component is organized, how the running process communicates with the outside world, and the design principle that keeps the project intentionally minimal. Every technical claim below is annotated with an inline `Source:` citation back to the file and line range that supports it, so this documentation stays traceable to the code.

## Overview

`hao-backprop-test` is a minimal "backprop integration" **test scaffold**. Its identity comes directly from the project README, which declares the title `hao-backprop-test` and the one-line description "test project for backprop integration." `Source: README.md:L1-L2`.

The project's **runtime source surface** is intentionally tiny — just two files: `README.md`, which provides the project identity (`Source: README.md:L1-L2`), and `server.js`, which holds the only runtime code (`Source: server.js:L1-L14`). There are no other runtime source modules and no `src/`, `config/`, or `tests/` directories, so the entire system can be understood by reading that single source file. The documentation that describes this runtime — including the page you are reading — lives under the `docs/` directory and adds no runtime behavior. The sections that follow examine each of the two runtime files, the way the running process integrates with the outside world, and the design principle behind the small footprint.

## Components

The system follows a straightforward **two-component model**:

- **`README.md` — project identity.** This file names the project (`hao-backprop-test`) and states its purpose as a "test project for backprop integration." It carries no build, run, or configuration logic; it exists purely to identify and describe the project. `Source: README.md:L1-L2`.
- **`server.js` — the runtime and entry point.** This single file is the entire runtime of the project: a single-file Node.js HTTP server written in **CommonJS** style that depends only on the Node.js **built-in `http` module**, imported with `require('http')`. `Source: server.js:L1`. There are no companion modules; running `server.js` runs the whole system.

Together, these two files make up the project's entire **runtime source surface** (`Source: README.md:L1-L2`, `Source: server.js:L1-L14`); there are no additional runtime source modules and no `src/`, `config/`, or `tests/` directories to consider. The `docs/` directory — where this page lives — holds documentation only and contributes no runtime code.

The diagram below shows the system at a glance: an HTTP **client** on the left, the Node.js HTTP **server** defined in `server.js`, and the single static **response** it returns. `Source: server.js:L1`, `Source: server.js:L6-L10`.

```mermaid
flowchart LR
    Client["HTTP Client (browser / curl)"] -->|"any method, any path"| Server["Node.js http server (server.js)"]
    Server -->|"200 text/plain"| Response["Body: Hello, World!"]
```

For a line-by-line walkthrough of every functional element in `server.js`, see the [Server Reference](server-reference.md).

## Integration model

The system's integration with the outside world is **inbound-only**. On startup the process binds to host `127.0.0.1` and port `3000`. `Source: server.js:L3-L4`. It then calls `server.listen(port, hostname, ...)` to begin accepting incoming HTTP requests and logs `Server running at http://127.0.0.1:3000/` once the listener is ready. `Source: server.js:L12-L14`.

For every inbound request, the server runs a single **request handler** that always sets status `200`, a `Content-Type` of `text/plain`, and writes the body `Hello, World!\n` — the same response regardless of the request's HTTP method or URL path. The server is therefore **route-agnostic** and **method-agnostic**: it performs no URL parsing and no method branching. `Source: server.js:L6-L10`.

The process makes **no outbound network calls** — it neither contacts other services nor reads from external systems; its only interaction is responding to the requests it receives. `Source: server.js:L6-L10`. The file also exposes **no `module.exports`**, so there is no JavaScript API for other modules to import. `Source: server.js:L1-L14`. Consequently, the server's only public contract is its **observable HTTP behavior**: a single, static `Hello, World!` response served on `127.0.0.1:3000`. Engineers should not assume any routing, method handling, middleware, authentication, or programmatic API exists, because none does. `Source: server.js:L6-L10`.

## Design principle

The guiding principle is **zero dependencies by design**. The server's only dependency is the Node.js standard-library `http` module; there is no Express, Fastify, Koa, or Nest, and no `package.json` or third-party package of any kind. `Source: server.js:L1`. Because the `http` module ships with the Node.js runtime, the scaffold runs with nothing more than a Node.js installation — no package installation step is required and there is no lockfile to resolve. This keeps the project minimal, readable end to end, and reproducible across environments, which suits its role as a small integration test scaffold. `Source: README.md:L1-L2`, `Source: server.js:L1`.

## Related documentation

- [Server Reference](server-reference.md) — line-by-line functional reference of `server.js` (the `http` dependency, the host/port constants, the request handler, and startup) with request-lifecycle and startup diagrams.
- [Configuration](configuration.md) — the `hostname` and `port` constants, their default values, and how to change them.
