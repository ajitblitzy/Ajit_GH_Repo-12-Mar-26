# Getting Started

This guide takes you from a clean machine to a verified response from the
service in this repository: the runtime you need, why there is nothing to
install or build, how to launch the process, what it prints, how to confirm
it is answering, and how to stop it.

The service is one CommonJS file that opens a single HTTP listener on the
IPv4 loopback interface and answers every inbound request with the same
fixed plain-text greeting. `Source: server.js:L1-L14`

The repository is the target endpoint for an integration whose counterpart
is hosted outside this repository. No backpropagation, machine-learning, or
external-system code, client, or credential exists here, so starting the
process starts nothing beyond the HTTP listener described on this page.
`Source: server.js:L1-L14`

Every `server.js` citation on this page is anchored to baseline commit
`1484182`, the pre-annotation layout of that file. Documentation comments
added to `server.js` shift its physical line numbers; these citations stay
on the baseline so that every page in this documentation set refers to one
shared set of coordinates. Citations are always line ranges, never a total
line count.

## Contents

- [Prerequisites](#prerequisites)
- [No install or build step](#why-there-is-no-install-or-build-step)
- [Getting the code](#getting-the-code)
- [Running the server](#running-the-server)
- [Expected startup output](#expected-startup-output)
- [Verifying the server](#verifying-the-server)
- [Stopping the server](#stopping-the-server)
- [Where to go next](#where-to-go-next)

## Prerequisites

Node.js, and nothing else. This project needs no compiler, no database, no
container runtime, and no package-manager step anywhere on the path from
clone to running process.

Confirm which runtime will execute the file:

```bash
node --version
```

Every example on this page was executed under Node.js 24.19.0, which is
the version this documentation is written against:

| Version | Release line          | Use with this project       |
| ------- | --------------------- | --------------------------- |
| 24.19.0 | Active LTS "Krypton"  | Documented baseline         |
| 22.23.2 | Maintenance LTS "Jod" | Works, but not preferred    |
| 26.7.0  | Current, not an LTS   | Not recommended             |
| 20.x    | End of life           | Unsupported                 |

- Node.js 24.19.0 is the Active LTS release, published 2026-08-03 and
  supported until 2028-04-30. It is the baseline for this documentation
  set and the runtime every published example was verified under.
- Node.js 22.x is in Maintenance LTS, a line that receives critical fixes
  only. The service runs there, but it is not the documented baseline.
- Node.js 26.7.0 is a Current release rather than an LTS line, so it is
  not a suitable baseline even though it is newer.
- Node.js 20.x reached end of life on 2026-04-30 and receives no further
  fixes, so it is unsupported here.

The choice follows the Node.js project's own release policy: an LTS
release is guaranteed critical bug fixes for a total of 30 months, and
applications should run only an Active LTS or a Maintenance LTS release.
That guidance is about choosing a runtime. It is not a claim that this
service is suitable for production deployment, which it is not: it binds
the loopback interface only. `Source: server.js:L3`

The repository pins no runtime version anywhere. There is no
`package.json`, so there is no `engines` field; there is no `.nvmrc`, no
`.node-version`, and no continuous-integration configuration. At baseline
commit `1484182` the repository tracks exactly two files, `README.md` and
`server.js`. Naming a version here therefore closes a real gap rather than
restating something the repository already declares.

## Why there is no install or build step

There is nothing to install:

- No `package.json` and no lockfile, so no dependency manifest exists to
  install from.
- No `node_modules` directory, and nothing in the repository that would
  populate one.
- No third-party dependencies at all. The program's only import is the
  Node.js built-in `http` module, which ships with the runtime rather than
  coming from a registry. `Source: server.js:L1`

There is nothing to build either. The file is CommonJS JavaScript that the
runtime executes directly, with no transpile, bundle, or code-generation
step. The closest equivalent to a build is a parse-only syntax check,
which runs the file through the parser without opening the listener:

```bash
node --check server.js
```

There is no `npm start`. An npm script has to be declared in a
`package.json`, and this repository has none, so no npm script exists to
run. The only launch path is `node server.js`, documented in the next
section but one. That is a property of the repository as it stands, and
this page documents it rather than treating it as something to change.

## Getting the code

Clone the repository and change into it. Substitute the URL of the remote
you were given; this page deliberately names no host.

```bash
git clone <repository-url> hao-backprop-test
cd hao-backprop-test
```

Every command on this page runs from the repository root, which is the
directory that contains `server.js`. If you already have the files on
disk, change into that directory and continue from there.

## Running the server

From the repository root:

```bash
node server.js
```

The process runs in the foreground indefinitely. It does not daemonize, it
does not return your shell prompt, and it writes nothing after the single
startup line described below. The listener stays open until the process is
stopped. `Source: server.js:L12-L14`

For scripted use, redirect the output and background it:

```bash
node server.js > /tmp/srv.log 2>&1 &
```

There are no command-line flags to pass and no environment variables to
set. Nothing in the file reads `process.env`, so the bind address and the
port are fixed at the literal values written in the source, and changing
either means editing the file. `Source: server.js:L3-L4`. See
[Configuration](./configuration.md) for that procedure and its
consequences.

## Expected startup output

A successful start writes exactly one line to stdout, and nothing at all
to stderr:

```text
Server running at http://127.0.0.1:3000/
```

That line is written by the Listen Readiness Callback, the zero-arity
function passed as the third argument to the `server.listen(...)` call.
`Source: server.js:L12-L14`

The message is a template literal that interpolates the `hostname` and
`port` constants, so it always names the address the process actually
bound rather than a value written out separately.
`Source: server.js:L13`, with the constants at `Source: server.js:L3-L4`

There is no banner, no version notice, and no second line. That one line
is the program's entire startup output and the only observability signal
it produces.

If the bind fails, the line never appears. The Listen Readiness Callback
runs only after the socket has been bound successfully, so the absence of
this line is the signal that startup did not complete: a port collision,
for example, terminates the process instead of logging. See
[Troubleshooting](./troubleshooting.md) for that path.

## Verifying the server

With the server running, send a request from a second terminal:

```bash
curl -i http://127.0.0.1:3000/
```

The observed response:

```http
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Fri, 11 Sep 2026 07:04:14 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 14

Hello, World!
```

The `Date` value differs on every request; everything else above is what
the service returns every time. The status is always `200`.
`Source: server.js:L7`

Header provenance is the detail integrators most often get wrong. Only one
of these headers is set by the application:

| Header           | Set by                  | Source            |
| ---------------- | ----------------------- | ----------------- |
| `Content-Type`   | Application code        | `server.js:L8`    |
| `Content-Length` | Node runtime (derived)  | `server.js:L9`    |
| `Date`           | Node runtime (injected) | Runtime behavior  |
| `Connection`     | Node runtime (injected) | Runtime behavior  |
| `Keep-Alive`     | Node runtime (injected) | Runtime behavior  |

`Content-Type: text/plain` is the only header the program sets, and it
carries no `charset` parameter. `Source: server.js:L8`
`Content-Length: 14` is derived by the runtime from the payload handed to
`res.end(...)`, not set explicitly. `Source: server.js:L9`

The body is byte-exact: `Hello, World!` followed by one LF, 14 bytes in
total, being 13 printable characters plus the newline.
`Source: server.js:L9` The byte count is worth confirming rather than
taking on trust:

```bash
curl -s http://127.0.0.1:3000/ | od -c
```

```text
0000000   H   e   l   l   o   ,       W   o   r   l   d   !  \n
0000016
```

The final offset `0000016` is octal, which is 14 in decimal.

Every path and every method receives this same response, because the
Request Handler Callback never inspects the request and no routing exists.
`Source: server.js:L6-L10` Client-side examples for that behavior are in
[Usage](./usage.md), and the complete wire-level contract is specified in
the [HTTP endpoint reference](./api-reference/http-endpoint.md).

## Stopping the server

In the foreground, press `Ctrl+C`.

If you backgrounded the process, find it and terminate it by process ID.
In a POSIX shell:

```bash
pgrep -f "node server.js"
kill <pid>
```

Windows has no `pgrep` and no POSIX signal to send. Pressing `Ctrl+C` in
the foreground, or terminating the process by its ID, is the equivalent
there, and the conclusion below is identical either way. Resolve whichever
process holds the port, then stop it:

```powershell
(Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess
Stop-Process -Id <pid>
```

Termination is immediate. There is no graceful shutdown and no connection
draining: the file registers no signal handler and never calls
`server.close()`, so no code path exists that could wait for in-flight
requests to finish. `Source: server.js:L1-L14`

Nothing is persisted and no state is carried from one request to the next,
so an abrupt stop leaves nothing to flush or recover. Requests in flight
at that moment are dropped. `Source: server.js:L6-L10` See
[Troubleshooting](./troubleshooting.md) if the process appears to survive
the attempt, which means something other than this service holds the port.

## Where to go next

- [Usage](./usage.md) for client examples and the method and path
  behavior tables.
- [HTTP endpoint reference](./api-reference/http-endpoint.md) for the
  full wire-level response contract.
- [Configuration](./configuration.md) to change the bind address or the
  port, both of which are hardcoded.
- [Troubleshooting](./troubleshooting.md) for port collisions, loopback
  unreachability, and the absence of graceful shutdown.
- [Documentation hub](./README.md) for the rest of this documentation set.
