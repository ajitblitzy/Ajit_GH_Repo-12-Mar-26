# Configuration

This repository has no configuration file, no environment-variable support,
and no command-line argument parsing. The entire configurable surface of the
service is **two module-scope constants** declared in `server.js`, and the
only mechanism that exists for changing either one is to edit its literal in
source.

This page documents both values exactly as they stand: what each one is, what
it means, how you would change it, and what changes as a result. The editing
procedure below is a description of the only mechanism available, not a
proposal to improve on it.

Source locators on this page are anchored to baseline commit `1484182`, and
line numbers refer to that baseline layout of `server.js`. Locators are given
as single lines or ranges so that they stay valid, and consistent with the
rest of this documentation set, as comments are added to the file.

## Contents

- [Summary](#summary-no-configuration-file-no-environment-variables)
- [`hostname`](#hostname)
- [`port`](#port)
- [No `process.env` support](#no-processenv-support-and-what-it-implies)
- [Editing procedure and verification](#editing-procedure-and-verification)
- [Related documentation](#related-documentation)

## Summary: no configuration file, no environment variables

Four absences define how this service is configured. Each was confirmed by
inspecting the repository and searching the source, not assumed:

- **No configuration file and no configuration directory.** The repository
  holds `server.js`, `README.md`, and this `docs/` tree — nothing else. There
  is no `config/`, no `.env`, and no settings file of any format.
- **No environment-variable support.** No executable statement in `server.js`
  reads `process.env`. `Source: server.js:L1-L14`.
- **No command-line argument parsing.** Nothing reads `process.argv`, so any
  argument written after `node server.js` is ignored by the program.
  `Source: server.js:L1-L14`.
- **No `package.json`.** There is no manifest in which configuration,
  scripts, or defaults could be declared, which is also why there is no
  `npm start` to pass options to.

The complete configurable surface is therefore these two constants:

| Option     | Value         | Source         | Override? | How to change |
| ---------- | ------------- | -------------- | --------- | ------------- |
| `hostname` | `'127.0.0.1'` | `server.js:L3` | **No**    | Edit source   |
| `port`     | `3000`        | `server.js:L4` | **No**    | Edit source   |

The **Override?** column asks whether the value can be overridden at run
time — by an environment variable, a command-line flag, or a configuration
file. For both values the answer is no, so "configuring" this service means
editing one of those two literals and restarting the process.

Per-binding details for both constants, alongside the `http` import and the
`server` instance, are in
[Module bindings](./api-reference/module-bindings.md).

## `hostname`

**Current value:** the string literal `'127.0.0.1'`. `Source: server.js:L3`.

- **Kind:** a `const` module-scope binding holding an IPv4 loopback literal.
  It is declared once and never reassigned.
- **Meaning:** the network interface the listener binds to. The loopback
  literal restricts reachability to clients running on the same host as the
  server process.
- **Consumed in exactly two places:** it is the second argument to
  `server.listen(port, hostname, callback)` (`Source: server.js:L12`), and
  the Listen Readiness Callback interpolates it into the startup line
  (`Source: server.js:L13`).
- **How to change it:** edit the literal on `server.js:L3`. No override
  mechanism exists, so a source edit is the only option.

### What changes when you change the host

Changing this literal changes the service's **network exposure**, which makes
it the highest-consequence edit available in the repository.

The current constraint is observable rather than theoretical. A request to
the loopback address is answered normally, while a request to the same host's
non-loopback address never reaches the server:

| Request target                | Observed result                 |
| ----------------------------- | ------------------------------- |
| `http://127.0.0.1:3000/`      | `200`, 14-byte body             |
| `http://<host-address>:3000/` | No connection; `curl` exits `7` |

The second row is a connection failure, not an HTTP error. No socket is
listening on that address, so there is no status code to read and nothing
server-side to inspect; `curl` reports the HTTP status as `000` because it
never received one. `Source: server.js:L3`.

This is why the service is unreachable from another machine, from another
container, or from a container host, and it is the first thing to check when
a client cannot connect — see [Troubleshooting](./troubleshooting.md).

Binding to a wider address would widen that exposure accordingly, since the
value passed on `server.js:L12` is the interface the socket is opened on.
That consequence is recorded here as a fact about the edit; public or
production deployment is an explicitly unsupported use case for this
repository.

## `port`

**Current value:** the number literal `3000`. `Source: server.js:L4`.

- **Kind:** a `const` module-scope binding holding a numeric literal. There
  is no `process.env.PORT` fallback, and no default-with-override pattern of
  any kind.
- **Meaning:** the TCP port the listener binds to.
- **Consumed in exactly two places:** it is the first argument to
  `server.listen(port, hostname, callback)` (`Source: server.js:L12`), and it
  is interpolated into the startup line (`Source: server.js:L13`).
- **How to change it:** edit the literal on `server.js:L4`.

### What changes when you change the port

Both the bind target and the startup line follow the edit automatically,
because the Listen Readiness Callback reads the same constant instead of
repeating its value (`Source: server.js:L12-L14`). With the literal changed
to `3012`, a run prints:

```text
Server running at http://127.0.0.1:3012/
```

Editing this literal is also the only remedy available for a port collision.
If another process already holds the port, the bind fails and the process
terminates with exit code `1` after reporting:

```text
Error: listen EADDRINUSE: address already in use 127.0.0.1:3000
```

That failure is fatal rather than merely reported because no `'error'`
listener is registered on the server anywhere in the file
(`Source: server.js:L1-L14`), which leaves the `'error'` event unhandled.
There is no retry and no fallback port. The remedy is to free the port that
is already in use, or to move this service by editing `server.js:L4` — see
[Troubleshooting](./troubleshooting.md).

## No `process.env` support, and what it implies

The absence of environment-variable support is mechanically verifiable rather
than a matter of interpretation. The module's entire executable surface is
eleven statements (`Source: server.js:L1-L14`):

```text
const http = require('http');
const hostname = '127.0.0.1';
const port = 3000;
const server = http.createServer((req, res) => {
res.statusCode = 200;
res.setHeader('Content-Type', 'text/plain');
res.end('Hello, World!\n');
});
server.listen(port, hostname, () => {
console.log(`Server running at http://${hostname}:${port}/`);
});
```

Nothing there reads `process.env`, and there is no fallback pattern such as
`process.env.PORT || 3000` anywhere in the file. The count can also be taken
directly. `server.js` carries JSDoc comments that name `process.env` in order
to state its absence, so exclude comment lines to count the occurrences that
actually execute:

```bash
grep -v -E '^[[:space:]]*(/\*|\*)' server.js | grep -c 'process\.env'
```

Observed output:

```text
0
```

What that means in practice, stated as characteristics of the program as it
is built:

- **Containers:** `-e PORT=8080`, `--env`, and an env-file have no effect,
  because there is nothing in the program that reads them. A container must
  either be built from edited source or remap the address at its own
  boundary — for example with a published-port mapping — rather than
  configure the application.
- **CI and orchestration:** a pipeline or scheduler that expects to inject
  host and port through the environment finds nothing to inject into. Both
  values are fixed at the source level and are decided when the file is
  written, not when the process starts.
- **Twelve-factor style configuration is not available here.** That is a
  factual characteristic of a single-file service with no configuration
  layer, recorded so that readers stop looking for a mechanism that does
  not exist.

The same search finds no `process.on` signal handler and no `server.close()`
call either, which is why stopping the process is abrupt — see step 1 of the
procedure below. `Source: server.js:L1-L14`.

## Editing procedure and verification

The steps below describe the only mechanism that exists for changing the host
or the port. They are written down so that the effect of each edit is known
before it is made.

1. **Stop the running server.** Press `Ctrl+C` in the foreground, or
   terminate it by process id if it was started in the background —
   `kill <pid>` on a POSIX shell, `Stop-Process -Id <pid>` on Windows
   PowerShell. Termination is immediate and no in-flight connection is
   drained, because no signal handler and no `server.close()` call exist
   anywhere in the file. `Source: server.js:L1-L14`.

2. **Edit the literal.** Change `server.js:L3` for the host, or
   `server.js:L4` for the port. Nothing else needs changing: both constants
   are read wherever they are used rather than duplicated.

3. **Confirm the file still parses.** This is cheap and catches a typo before
   it becomes a runtime failure:

   ```bash
   node --check server.js
   ```

   A successful check prints nothing and exits `0`.

4. **Restart the process** from the repository root, exactly as described in
   [Getting started](./getting-started.md):

   ```bash
   node server.js
   ```

5. **Read the new bind target off the startup line.** It reflects the edit
   automatically, because the Listen Readiness Callback interpolates the same
   two constants (`Source: server.js:L13`):

   ```text
   Server running at http://<your-host>:<your-port>/
   ```

   That single line is the only readiness signal this process emits. If it
   does not appear, the socket was never bound and the process has already
   exited.

6. **Verify the endpoint still answers as documented:**

   ```bash
   curl -i http://<your-host>:<your-port>/
   ```

   Expect status `200`, `Content-Type: text/plain` with no `charset`
   parameter, `Content-Length: 14`, and the 14-byte body `Hello, World!`
   followed by a single newline character. `Source: server.js:L7-L9`. The
   full contract, including which headers the runtime injects rather than the
   application, is specified in
   [HTTP endpoint](./api-reference/http-endpoint.md).

Two caveats are worth stating explicitly.

Editing either constant is a **source modification**, so it changes the file
that the rest of this documentation cites. Every locator in this set is
anchored to baseline commit `1484182`; after a local edit, the line numbers
here continue to describe that baseline rather than your working copy.

The response contract itself is unaffected by either edit. The
Request Handler Callback never reads the request, and never consults either
constant (`Source: server.js:L6-L10`), so changing them changes only the
address a client dials — never the status, the headers, or the body it
receives.

## Related documentation

- [Documentation hub](./README.md) — index for the whole documentation set.
- [Getting started](./getting-started.md) — prerequisites and first launch,
  including the verification commands reused above.
- [Troubleshooting](./troubleshooting.md) — the loopback and `EADDRINUSE`
  symptoms in diagnostic form.
- [Module bindings](./api-reference/module-bindings.md) — per-binding
  reference for `hostname`, `port`, `http`, and `server`.
- [HTTP endpoint](./api-reference/http-endpoint.md) — the response contract
  to re-verify after an edit.
