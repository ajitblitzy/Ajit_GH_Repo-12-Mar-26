# Configuration

The `hao-backprop-test` server exposes exactly two configurable values, and both are **hardcoded constants** declared near the top of `server.js`. There is no dynamic configuration layer — no environment variables, no command-line flags, and no configuration file. To change either value you edit the constant directly in the source and restart the server. *Source: server.js:L3-L4*

## Constants

The server reads its **host** and **port** from two module-level constants. Both are declared once, near the top of `server.js`, and are consumed together by the `server.listen(...)` call during startup.

| Constant | Source | Default | Notes |
|----------|--------|---------|-------|
| `hostname` | server.js:L3 | `127.0.0.1` | Loopback only — not reachable from other machines |
| `port` | server.js:L4 | `3000` | TCP port the server listens on |

Both constants are plain literals (a string and a number) with no fallback logic and no external override. *Source: server.js:L3-L4*

For context, these two constants are passed together to the bind call during startup: `server.listen(port, hostname, ...)`. *Source: server.js:L12*

## How to change the host and port

The **only** way to change the host or port is to edit the two constants directly in `server.js` (lines 3–4), save the file, and restart the server with `node server.js`. There is **no environment-variable support**, **no command-line flag**, and **no configuration file** — none of these mechanisms exist in the code, so do not rely on them. *Source: server.js:L3-L4*

First, locate the two constants:

```javascript
// Before (server.js:L3-L4)
const hostname = '127.0.0.1';
const port = 3000;
```

Then change them to the values you want. For example, to listen on all network interfaces using port `8080`:

```javascript
// After (server.js:L3-L4)
const hostname = '0.0.0.0';
const port = 8080;
```

Save `server.js`, then restart the server so the new values take effect:

```bash
node server.js
```

Because there is no configuration layer, the server must be restarted for any edit to the constants to take effect. The startup log echoes the active host and port (`Server running at http://${hostname}:${port}/`), so you can confirm the new values immediately after restart. *Source: server.js:L12-L14*

## Port-conflict guidance

If TCP port `3000` is already in use by another process, the server cannot bind to it and startup fails with an `EADDRINUSE` (address already in use) error. The conflict occurs because the `port` constant is passed unchanged to the `server.listen(...)` bind call. *Source: server.js:L4* *Source: server.js:L12*

To resolve a port conflict, change the `port` constant (`server.js:L4`) to a free port — for example, `3001` — and restart the server:

```javascript
// server.js:L4
const port = 3001;
```

```bash
node server.js
```

For step-by-step recovery instructions covering `EADDRINUSE` and other common startup problems, see the [Troubleshooting](../user-guide/troubleshooting.md) guide.

## Related documentation

- [Server Reference](server-reference.md) — line-by-line functional reference, including where the `hostname` and `port` constants are used.
- [Architecture](architecture.md) — the overall system model and zero-dependency design.
- [Troubleshooting](../user-guide/troubleshooting.md) — resolving `EADDRINUSE` and other common issues.
