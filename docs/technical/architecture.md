# Architecture

This document explains the system structure of **`hao-backprop-test`** for engineers. It describes what the project contains, how its single runtime component is organized, how the system integrates with the outside world, and the design principle that keeps it minimal. Every technical claim below is traceable to its source through an inline `Source:` citation.

## Overview

`hao-backprop-test` is a deliberately minimal **test scaffold**. Its identity comes directly from the repository's `README.md`, whose title is `hao-backprop-test` and whose one-line description is "test project for backprop integration." `Source: README.md:L1-L2`. The **application/runtime surface** is intentionally tiny: it has just two components — `README.md` (project identity) and `server.js` (the runtime).

The runtime is a single-file Node.js HTTP server that answers every inbound request with one static plain-text **response**. `Source: server.js:L6-L10`. Its component relationships and the single response flow are illustrated in the Components section below.

## Components

The system follows a **two-component model**. The application's runtime surface consists of just these two components; there are no other source modules and no `src/`, `config/`, or `tests/` directories.

- **`README.md` — project identity and description.** It supplies the project name (`hao-backprop-test`) and a single-sentence description ("test project for backprop integration."). `Source: README.md:L1-L2`.
- **`server.js` — the entire runtime and entry point.** It is a single-file Node.js HTTP server written in **CommonJS** style (`require`), built exclusively on the Node.js **built-in `http` module**. `Source: server.js:L1`. It creates an HTTP server with one inline **request handler** `Source: server.js:L6-L10` and binds that server to a host and port at **startup** `Source: server.js:L12-L14`.

The following diagram shows the runtime components and the single static response flow:

```mermaid
flowchart LR
    Client["HTTP Client (browser / curl)"] -->|"any method, any path"| Server["Node.js http server (server.js)"]
    Server -->|"200 text/plain"| Response["Body: Hello, World!"]
```

## Integration model

The system is **inbound-only**. At **startup**, the process binds to **host** `127.0.0.1` and **port** `3000` `Source: server.js:L3-L4` and begins listening for inbound HTTP requests `Source: server.js:L12-L14`. Every inbound request is served by a single inline **request handler** that sets the status code to `200`, sets the `Content-Type` header to `text/plain`, and writes the **response** body `Hello, World!\n`. `Source: server.js:L6-L10`.

Because the handler performs no URL parsing and no method branching, the server is **route-agnostic** and **method-agnostic**: it returns an identical `200` / `text/plain` / `Hello, World!\n` **response** for **any** HTTP method and **any** URL path. `Source: server.js:L6-L10`.

The integration surface is therefore narrow and well defined:

- It makes **no outbound network calls** — nothing in the runtime opens a connection to any other service. `Source: server.js:L1-L14`.
- It exposes **no `module.exports`** — the file is an executable entry point, not an importable module. `Source: server.js:L1-L14`.
- Consequently, its **only public contract is its observable HTTP behavior**: a single static `Hello, World!` **response**. Engineers should not assume that routing, method handling, additional headers, or configuration endpoints exist. `Source: server.js:L6-L10`.

## Design principle

The scaffold is **zero-dependency by design**. Its only dependency is the Node.js standard-library **built-in `http` module**. `Source: server.js:L1`. There is **no Express, Fastify, Koa, or Nest** — `server.js` imports no web framework. `Source: server.js:L1`. The repository also contains **no `package.json`** — and therefore no third-party dependency tree; this reflects repository inspection rather than anything declared in `server.js`. This choice keeps the project minimal and reproducible: it runs anywhere a Node.js runtime is available, with nothing to install, build, or lock.

## Related documentation

- [Server Reference](server-reference.md) — line-by-line functional reference of `server.js`.
- [Configuration](configuration.md) — the **host** and **port** constants and how to change them.
