# Configuration

The server has exactly two configurable values, and both are hardcoded constants near the top of `server.js`. There is no environment-variable support, no command-line (CLI) flag, and no configuration file — the only way to change the host or port is to edit these constants directly in the source and restart the server. *Source: server.js:L3-L4.*

## Constants

The complete configuration surface is the two constants declared near the top of `server.js`.

| Constant | Source | Default | Notes |
|----------|--------|---------|-------|
| `hostname` | server.js:L3 | `127.0.0.1` | Loopback only — not reachable from other machines |
| `port` | server.js:L4 | `3000` | TCP port the server listens on |

Both values are plain constants in the source file, and there are no other configurable settings. *Source: server.js:L3-L4.*

## How to change the host and port

The **only** mechanism for changing the host or port is to edit the two constants directly in `server.js` (lines 3-4), save the file, and restart the server. There is **no environment-variable support**, **no CLI flag**, and **no configuration file** — none of these mechanisms exist in the code, so do not expect them to work. *Source: server.js:L3-L4.*

To change the configuration:

1. Open `server.js` in a text editor.
2. Edit the `hostname` constant on line 3 and/or the `port` constant on line 4 to the values you want. *Source: server.js:L3-L4.*
3. Save the file.
4. Restart the server so the new values take effect.

For example, to bind the server to all network interfaces on port `8080`, change the constants from their defaults.

Before (the defaults):

```javascript
const hostname = '127.0.0.1';
const port = 3000;
```

After (listen on all interfaces, port 8080):

```javascript
const hostname = '0.0.0.0';
const port = 8080;
```

Then restart the server:

```bash
node server.js
```

On startup the server prints a line confirming the address it is bound to, and that line reflects whatever host and port you set in the constants. *Source: server.js:L12-L14.*

## Port-conflict guidance

The `port` constant defaults to `3000`. *Source: server.js:L4.* When the server starts, it binds to that port through the `server.listen(port, hostname, ...)` call. *Source: server.js:L12.* If another process is already listening on port `3000`, the bind fails and Node.js raises an `EADDRINUSE` ("address already in use") error, and the server does not start.

To resolve a port conflict, change the `port` constant on line 4 of `server.js` to a free port — for example, `3001` — and restart the server. *Source: server.js:L4.*

```javascript
const port = 3001;
```

```bash
node server.js
```

For step-by-step help diagnosing and fixing this and other startup problems, see the [Troubleshooting](../user-guide/troubleshooting.md) guide.

## Related documentation

- [Server Reference](server-reference.md) — the functional reference for `server.js`, including where the `hostname` and `port` constants are used.
- [Architecture](architecture.md) — the overall system model and zero-dependency design.
- [Troubleshooting](../user-guide/troubleshooting.md) — common runtime issues, including the `EADDRINUSE` port conflict.
