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

**Verification environment.** Two kinds of statement appear below and they
carry different weight. A claim labelled `Source: server.js:Lx` is a property
of the source and holds wherever the file runs. A value labelled **Observed**
was measured by running this repository's `server.js` on **Friday, September
11, 2026** under **Node.js v24.19.0** (Active LTS) on **Windows**
(`Microsoft Windows NT 10.0.26100.0`); it is reported because it was seen
rather than expected, which makes it evidence from one runtime on one
platform rather than a guarantee for every other. Two observed details are
known to vary: the stack-frame line numbers inside a Node.js error trace move
with the runtime version, and the numeric `errno` printed alongside
`EADDRINUSE` is platform-specific. Process-control commands are given
separately for a POSIX shell and for Windows PowerShell, because Windows has
no POSIX signals and the two are not interchangeable.

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
  the
  [Listen Readiness Callback](./api-reference/functions/listen-readiness-callback.md)
  interpolates it into the startup line (`Source: server.js:L13`).
- **How to change it:** edit the literal on `server.js:L3`. No override
  mechanism exists, so a source edit is the only option.

### What changes when you change the host

Changing this literal changes the service's **network exposure**, which makes
it the highest-consequence edit available in the repository.

The current constraint is observable rather than theoretical. **Observed:** a
request to the loopback address was answered normally, while a request to the
same host's own non-loopback address never reached the server at all:

| Request target              | Observed result                 |
| --------------------------- | ------------------------------- |
| `http://127.0.0.1:3000/`    | `200`, 14-byte body             |
| `http://HOST-ADDRESS:3000/` | No connection; `curl` exits `7` |

`HOST-ADDRESS` is a placeholder, not something to type: substitute one of the
host's own non-loopback IPv4 addresses before issuing the request. Every such
address behaved identically.

The second row is a connection failure, not an HTTP error. No socket is
listening on that address, so there is no status code to read and nothing
server-side to inspect; `curl` reported the HTTP status as `000` because it
never received one. The reachability boundary itself follows from the
literal. `Source: server.js:L3`.

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
because the
[Listen Readiness Callback](./api-reference/functions/listen-readiness-callback.md)
reads the same constant instead of repeating its value
(`Source: server.js:L12-L14`). **Observed** with the literal edited to
`3052`, the run printed:

```text
Server running at http://127.0.0.1:3052/
```

That correspondence holds for an explicit, nonzero port — which is what the
literal carries today — and not for every conceivable edit. `port = 0` is
valid, and the runtime then chooses an ephemeral port while this template
goes on interpolating the constant and prints `:0/`. Nothing in the file
calls `server.address()` (`Source: server.js:L1-L14`), so a port the
operating system assigned cannot be recovered from this output at all.

Editing this literal is the only **application-side** way to move this
service to a different port: nothing in the program selects one, so no
environment variable, flag, or configuration file can do it. It is not,
however, the only remedy for a port collision. Freeing the port that is
already occupied is the other one, and which of the two applies depends on
what is holding it — a question worth answering before anything is stopped.

The collision itself is fatal, and what the source settles about it is
narrow. The bind is attempted by `server.listen(port, hostname, callback)`
(`Source: server.js:L12`), and no `'error'` listener is registered on the
server anywhere in the file (`Source: server.js:L1-L14`), so the `'error'`
event that a failed bind emits goes unhandled and the runtime tears the
process down. There is no retry and no fallback port. The `EADDRINUSE`
error code for an occupied port is stable Node.js behaviour, while the exact
message wording and the exit status are runtime and platform presentation
rather than properties this file defines.

**Observed** under the environment named at the top of this page: the process
exited with status `1`, wrote nothing at all to stdout, and the runtime —
not the application — printed a trace to stderr whose first error line was:

```text
Error: listen EADDRINUSE: address already in use 127.0.0.1:3000
```

The exact layout of that trace, its stack frames, and the numeric `errno`
printed with it belong to the runtime and the platform. The stable parts are
the `EADDRINUSE` condition itself and the `address` and `port` fields naming
what could not be bound. The full trace, and a procedure for identifying
whatever holds the port before stopping it, are in
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
to state its absence, so remove the whole comment spans — not every line
that begins with a comment marker, which would also take the two arrow
signatures with it — and count what is left:

```bash
node -e 'const src = require("node:fs").readFileSync("server.js", "utf8");
const code = src.replace(/\/\*[\s\S]*?\*\//g, "");
console.log((code.match(/process\.env/g) || []).length);'
```

Observed output, with exit status `0`:

```text
0
```

What that means in practice, stated as characteristics of the program as it
is built:

- **Containers:** `-e PORT=8080`, `--env`, and an env-file have no effect,
  because there is nothing in the program that reads them. A second and
  quite separate obstacle applies as well, and it is the one that costs
  people the most time: **publishing a port does not rebind the listener.**
  A container has its own network namespace with its own loopback interface,
  so a process bound to the container's `127.0.0.1` accepts connections only
  from inside that container. A published-port mapping such as
  `-p 3000:3000` forwards traffic arriving at the host to the container's
  *namespace interface* address rather than to its loopback, so the
  forwarded connection arrives at an address where nothing is listening and
  is refused. Publishing is therefore only useful once the application is
  already listening on an address reachable inside the namespace. Reaching
  that state with this fixture means editing the host literal at
  `server.js:L3` and building the image from the edited source, or else
  running something inside the same namespace that can itself reach the
  loopback listener and forward to it. Publishing a port is not a substitute
  for either, and neither route is what makes a loopback-bound listener
  reachable from another machine — only the bind address decides that.
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

1. **Stop the running server.** In the foreground, press `Ctrl+C`, and skip
   to step 2. If it was started in the background, look before you
   terminate — the lookup and the stop are deliberately kept in separate
   blocks below so that pasting the first one cannot end a process you had
   not identified yet.

   First, identify the process holding the listening socket, reading back
   its id, its owner, and its command line. In a POSIX shell, `ps` reports
   all three:

   ```bash
   pid="$(lsof -nP -t -iTCP:3000 -sTCP:LISTEN)"
   ps -o pid=,user=,command= -p "$pid"
   ```

   In Windows PowerShell — which has no POSIX signals, so terminating by
   process id is the equivalent there, and where the owner is not part of
   any process listing and must be asked for separately:

   ```powershell
   $listener = Get-NetTCPConnection -LocalPort 3000 -State Listen
   $portPid = $listener.OwningProcess
   $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $portPid"
   $owner = Invoke-CimMethod -InputObject $proc -MethodName GetOwner
   Write-Output "pid=$portPid owner=$($owner.Domain)\$($owner.User)"
   Write-Output $proc.CommandLine
   ```

   Then read that output and decide. A command line ending in `server.js`
   and an owner that is your own account identify this server. If what you
   see is anything else, or the output did not tell you clearly what it is,
   **stop nothing** — move this service to a free port instead, which is
   what the rest of this procedure does anyway. Only once you have
   identified it as yours, stop it:

   ```bash
   kill "$pid"
   ```

   ```powershell
   Stop-Process -Id $portPid
   ```

   Termination is immediate and no in-flight connection is drained, because
   no signal handler and no `server.close()` call exist anywhere in the
   file. `Source: server.js:L1-L14`. The same identify-then-decide sequence,
   with the reasoning behind it, is in
   [Troubleshooting](./troubleshooting.md).

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

5. **Read the new bind target off the startup line.** For an explicit,
   nonzero port and a host literal a client can dial — the case this
   procedure covers — the line follows the edit automatically, because the
   [Listen Readiness Callback](./api-reference/functions/listen-readiness-callback.md)
   interpolates the same two constants rather than repeating their values
   (`Source: server.js:L13`). With the literals at their current values it
   prints:

   ```text
   Server running at http://127.0.0.1:3000/
   ```

   Two edits fall outside that guarantee. The line cannot report a port the
   operating system chose: with `port = 0` the template still prints `:0/`,
   and nothing in the file calls `server.address()`
   (`Source: server.js:L1-L14`), so the assigned port is not available from
   this output at all. A wildcard host literal such as `0.0.0.0` is printed
   as written as well, and it is a bind target rather than necessarily a URL
   a client can dial.

   After an edit within that guarantee, the host and port in that line are
   the literals you wrote. It is the only readiness signal this process
   emits, and it is **positive evidence**: seeing it proves the bind
   succeeded and the callback ran. The converse does not hold. Not seeing it
   does *not* by itself prove the bind failed or the process exited — the
   callback is invoked asynchronously, so the line may not have been written
   yet, and it is equally absent when you are reading a stream the output did
   not go to. Before concluding that startup failed, corroborate with all
   three of: stderr, where a bind failure prints a trace naming a `code:`;
   whether the process is still alive; and whether anything is listening on
   the port. The full diagnostic sequence is in
   [Troubleshooting](./troubleshooting.md).

6. **Verify the endpoint still answers as documented.** Substitute the host
   and port you just wrote into the source. In a POSIX shell:

   ```bash
   host='127.0.0.1'
   port='3000'
   curl -i "http://$host:$port/"
   ```

   In Windows PowerShell — `$Host` is a reserved automatic variable there,
   hence the names used below:

   ```powershell
   $ServerHost = '127.0.0.1'
   $ServerPort = 3000
   curl.exe -i "http://${ServerHost}:${ServerPort}/"
   ```

   Expect status `200`, `Content-Type: text/plain` with no `charset`
   parameter, `Content-Length: 14`, and the 14-byte body `Hello, World!`
   followed by a single newline character. `Source: server.js:L7-L9`. Those
   four values were **observed** unchanged after an edit to the port. The
   full contract, including which headers the runtime injects rather than the
   application, is specified in
   [HTTP endpoint](./api-reference/http-endpoint.md).

Two caveats are worth stating explicitly.

Editing either constant is a **source modification**, so it changes the file
that the rest of this documentation cites. Every locator in this set is
anchored to baseline commit `1484182`; after a local edit, the line numbers
here continue to describe that baseline rather than your working copy.

The response contract itself is unaffected by either edit. The
[Request Handler Callback](./api-reference/functions/request-handler-callback.md)
never reads the request, and never consults either constant
(`Source: server.js:L6-L10`), so changing them changes only the address a
client dials — never the status, the headers, or the body it receives.

## Related documentation

- [Documentation hub](./README.md) — index for the whole documentation set.
- [Getting started](./getting-started.md) — prerequisites and first launch,
  including the verification commands reused above.
- [Troubleshooting](./troubleshooting.md) — the loopback and `EADDRINUSE`
  symptoms in diagnostic form, including how to identify a port's owner
  safely before stopping it.
- [Module bindings](./api-reference/module-bindings.md) — per-binding
  reference for `hostname`, `port`, `http`, and `server`.
- [Listen Readiness Callback](./api-reference/functions/listen-readiness-callback.md)
  — the dedicated reference for the callback that reports the bind target
  named in step 5.
- [Request Handler Callback](./api-reference/functions/request-handler-callback.md)
  — the dedicated reference for the callback that produces the response
  contract re-verified in step 6.
- [HTTP endpoint](./api-reference/http-endpoint.md) — the response contract
  to re-verify after an edit.
