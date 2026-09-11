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

To run the service: Node.js, and nothing else. This project needs no
compiler, no database, no container runtime, and no package-manager step
anywhere on the path from clone to running process. The walkthrough on
this page reaches for a few ordinary command-line tools beyond the
runtime; they are listed, with alternatives, at the end of this section.

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
- Node.js 22.x is in Maintenance LTS, a line that receives critical bug
  fixes and security updates; new features reach it only at the Release
  team's discretion, and typically only where the feature supports
  migration to a later release line. The service runs there, but it is
  not the documented baseline.
- Node.js 26.7.0 is a Current release rather than an LTS line, so it is
  not a suitable baseline even though it is newer.
- Node.js 20.x reached end of life on 2026-04-30 and receives no further
  fixes, so it is unsupported here.

The choice follows the Node.js project's own release policy, in its own
words: LTS status "typically guarantees that critical bugs will be fixed
for a total of 30 months", and "production applications should only use
Active LTS or Maintenance LTS releases". Both statements, and the release
dates in the table above, come from the Node.js
[release schedule](https://nodejs.org/en/about/previous-releases) and the
[Release working group](https://github.com/nodejs/Release). That guidance
is about choosing a runtime. It is not a claim that this service is
suitable for production deployment, which it is not: it binds the
loopback interface only. `Source: server.js:L3`

The repository pins no runtime version anywhere. There is no
`package.json`, so there is no `engines` field; there is no `.nvmrc`, no
`.node-version`, and no continuous-integration configuration. At baseline
commit `1484182` the repository tracks exactly two files, `README.md` and
`server.js`. Naming a version here therefore closes a real gap rather than
restating something the repository already declares.

Node.js is the only thing the service itself needs. The steps below also
use a handful of general-purpose tools that are not project dependencies;
each one is either optional or has an alternative on every platform:

- `git`, used only to clone the repository. Skip it if you already have
  the files on disk and start from [Running the server](#running-the-server).
- An HTTP client for the verification step. This page uses `curl`, which
  ships with current macOS, most Linux distributions, and Windows 10 and
  later (as `curl.exe`). The dependency-free Node.js client in
  [Usage](./usage.md) needs nothing but the runtime you already have.
- `od`, optional, used once to prove the response body is 14 bytes.
  `wc -c` on a POSIX shell and `Format-Hex` in PowerShell answer the same
  question.
- Process tooling, only if you background the process instead of running
  it in the foreground: `ps` and `kill` on a POSIX shell, plus `lsof` to
  ask which process is listening on a port — `ss -ltnp` or `netstat`
  answers the same question where `lsof` is not installed. On Windows the
  equivalents are built-in PowerShell cmdlets and need no installation:
  `Get-NetTCPConnection`, `Get-Process`, `Select-Object`, `Start-Process`,
  and `Stop-Process`. Stopping a foreground process needs nothing but
  `Ctrl+C`.

None of these changes the project's own shape: there is still nothing to
install, nothing to build, no package manager in the path, and no
`npm start`, as the next section sets out.

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

Clone the repository and change into it. Replace the quoted text on the
first line with the clone URL of the remote you were given; this page
deliberately names no host. The quotes are what keep the block runnable
as written — an unquoted placeholder in angle brackets would be read by
the shell as an input redirection rather than as an argument.

```bash
repo_url="<paste the clone URL you were given>"
git clone "$repo_url" hao-backprop-test
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

That line is written by the
[Listen Readiness Callback](./api-reference/functions/listen-readiness-callback.md),
the zero-arity function passed as the third argument to the
`server.listen(...)` call. `Source: server.js:L12-L14`

The message is a template literal that interpolates the `hostname` and
`port` constants rather than a value written out separately, so with the
literals as they currently stand — `'127.0.0.1'` and `3000` — it names
the address that was bound. `Source: server.js:L13`, with the constants
at `Source: server.js:L3-L4`

That guarantee extends to any edit which leaves an explicit host literal
and a nonzero port in those constants, and no further. `port = 0` is a
valid edit for which the runtime chooses an ephemeral port while this
template still prints `:0/`, and nothing in the file calls
`server.address()`, so a port the operating system assigned cannot be read
off this line at all. `Source: server.js:L1-L14` A wildcard bind address
such as `0.0.0.0` is likewise a bind target rather than necessarily a URL
a client can dial, and it too would print exactly as written.

There is no banner, no version notice, and no second line. That one line
is the program's entire startup output and the only observability signal
it produces.

Seeing the line proves the bind succeeded and that the Listen Readiness
Callback ran, since the runtime invokes the callback only once the socket
is bound. `Source: server.js:L12-L14` Not seeing it proves nothing on its
own: `server.listen(...)` is asynchronous, so before the `'listening'`
event fires the line has simply not been written yet, and output that is
redirected or unwatched looks the same. A failed bind — a port collision,
for example, which terminates the process instead of logging — is one
reason among several for a line that has not appeared. Check the process
state, look on stderr for a stack trace naming an error code, and check
whether anything is listening on the port before concluding that startup
failed. See [Troubleshooting](./troubleshooting.md) for that path.

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

Read that block as what it is: one observed exchange, a default `curl`
GET of `/` under Node.js 24.19.0. It is not a per-request guarantee,
because only part of it comes from this repository. What the repository
states is the `200` status (`Source: server.js:L7`), the
`Content-Type: text/plain` header with no `charset` parameter
(`Source: server.js:L8`), and the 14-byte `Hello, World!\n` payload
handed to `res.end(...)` (`Source: server.js:L9`). Those three hold for
every request the handler answers.

The rest of the block is the runtime's contribution to that one
connection. `Date` is generated by the runtime for the response and moves
with the clock, but it is not unique per request: the field carries
one-second resolution, so requests answered within the same second repeat
the same value. Ten requests issued back to back were observed sharing a
single `Date`. `Connection` and `Keep-Alive` report how Node.js is
handling the connection, and they vary with the protocol version and with
the connection semantics the client itself asked for.

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
`res.end(...)`, not set explicitly. `Source: server.js:L9` It is not
present on every response either: a `HEAD` reply carries no body, and the
runtime omits `Content-Length` from it entirely.

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

Across every path, the seven ordinary request methods verified here — GET,
POST, PUT, PATCH, DELETE, OPTIONS, and HEAD — are answered from that one
handler, because the
[Request Handler Callback](./api-reference/functions/request-handler-callback.md)
never inspects the request and no routing exists.
`Source: server.js:L6-L10` Six of them receive the response above in full.
`HEAD` is the one variation: it keeps the `200` status and the
`Content-Type`, and carries no body, so the runtime sends no
`Content-Length` with it either.

`CONNECT` is the exception, and it is not a method this service answers.
Node.js dispatches `CONNECT` through the server's separate `'connect'`
event rather than through the request handler, and this file registers no
listener for that event, so such a request never reaches the callback.
`Source: server.js:L1-L14` Verified under Node.js 24.19.0 against a
running instance: a raw `CONNECT` request read back zero bytes and the
connection closed with no status line at all, and `curl -X CONNECT`
reported HTTP status `000` and exited `52`, while a control `GET` on the
same instance returned `200`.

An upgrade request is a separate case, and it does not behave like
`CONNECT`. Node.js diverts a request to the server's `'upgrade'` event
only when the server elects that path, and by default that election is
`listenerCount('upgrade') > 0`. This file adds no `'upgrade'` listener, so
the election fails and the request stays on the ordinary path: a `GET`
carrying `Connection: Upgrade` and `Upgrade: websocket` is answered by the
Request Handler Callback with the usual `200`, `text/plain`, and 14 bytes,
and no protocol switch takes place. `Source: server.js:L1-L14`
[Usage](./usage.md) records both observations in full.

Client-side examples for the path-agnostic and method-agnostic behavior
are in [Usage](./usage.md), and the complete wire-level contract is
specified in the
[HTTP endpoint reference](./api-reference/http-endpoint.md).

## Stopping the server

In the foreground, press `Ctrl+C`.

If you backgrounded the process, stop it by the process ID you captured
when you started it. A POSIX shell puts that ID in `$!`, so capturing it
on the line after the launch removes any need to search for it later:

```bash
node server.js > /tmp/srv.log 2>&1 &
server_pid=$!
```

That variable is the safe way to stop the process, because it can only
name the process this shell itself started:

```bash
kill "$server_pid"
```

If you did not capture the ID, identify the candidate before you stop
anything. Ask which process is actually listening on the port, rather than
matching on a command line: a command-line match such as
`pgrep -f "node server.js"` will also select a process that merely looks
similar and holds no socket at all.

```bash
server_pid=$(lsof -ti tcp:3000 -sTCP:LISTEN)
ps -p "$server_pid" -o pid,args=
```

Read that output first. Send the signal only when it names the
`node server.js` process you launched yourself:

```bash
kill "$server_pid"
```

Windows has no `pgrep` and no POSIX signal to send. `Ctrl+C` in the
foreground is the direct equivalent, and for a backgrounded process
`Start-Process -PassThru` hands back the process object whose `Id` is the
one to stop:

```powershell
$server = Start-Process node server.js -PassThru -NoNewWindow
Stop-Process -Id $server.Id
```

Without that object, look up the process listening on the port and check
what it is before stopping it:

```powershell
$owner = (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess
Get-Process -Id $owner | Select-Object Id, ProcessName, Path
```

The `Get-Process` line is the check, not a formality: a port lookup
returns whatever process holds port 3000, which is not necessarily this
service. Stop it only when that output names the `node` process you
started:

```powershell
Stop-Process -Id $owner
```

Never stop a port owner you have not identified. That rule matters most
in the one case where it is tempting to skip: if this service just failed
to start with `EADDRINUSE`, the process holding the port is by definition
not this service — the bind failed, so this process never owned the port
and has already exited. `Source: server.js:L1-L14` Stopping that owner
blind is the wrong move. Identify it, decide deliberately whether freeing
the port is yours to do, or leave it alone and move this service to a
port nothing else is using by editing the `port` literal.
`Source: server.js:L4` [Configuration](./configuration.md) covers that
edit and [Troubleshooting](./troubleshooting.md) covers the collision.

Termination is immediate. There is no graceful shutdown and no connection
draining: the file registers no signal handler and never calls
`server.close()`, so no code path exists that could wait for in-flight
requests to finish. `Source: server.js:L1-L14`

Nothing is persisted and no state is carried from one request to the next,
so an abrupt stop leaves no application state to flush or recover — the
program holds none. Responses are a different matter: `res.end(...)` marks
a response ended and returns, which does not mean its bytes have reached
the client, and nothing in the file observes the response's `'finish'`
event, `'close'`, or an error on the response object.
`Source: server.js:L9`, and `Source: server.js:L1-L14` for those
absences. A response that has been ended but not yet transmitted can
therefore still be lost, and requests in flight at that moment are
dropped. `Source: server.js:L6-L10`

If the process appears to survive the attempt, do not jump to the
conclusion that a different process holds the port. Read the result of the
stop command first. `kill` prints a diagnostic and exits non-zero when it
fails — `No such process` for a PID that had already exited, and
`Operation not permitted` when the process is not yours to signal.
`Stop-Process` writes an error record naming the ID it could not stop and
leaves `$?` false, but by default it is a non-terminating error: the rest
of your script keeps running and no `catch` block fires, so add
`-ErrorAction Stop` if you want the failure to halt execution. A
permission failure, a PID that had already exited, and a PID that was
never this process look the same from the outside until you look.

Then re-query the listener — `lsof -ti tcp:3000 -sTCP:LISTEN` on a POSIX
shell, or the `Get-NetTCPConnection` command above in PowerShell — and
compare the PID it now reports against the one you tried to stop. Use a
port query rather than a command-line match for this: only the port query
answers who holds the socket. Only a stop that reported success, followed
by the port still held under a different PID, supports the conclusion that
something else owns the port. See
[Troubleshooting](./troubleshooting.md) for that case and for the
port-collision path.

## Where to go next

- [Usage](./usage.md) for client examples and the method and path
  behavior tables.
- [HTTP endpoint reference](./api-reference/http-endpoint.md) for the
  full wire-level response contract.
- [Request Handler Callback](./api-reference/functions/request-handler-callback.md)
  for the function that answers every request it is given.
- [Listen Readiness Callback](./api-reference/functions/listen-readiness-callback.md)
  for the function that writes the one startup line.
- [Configuration](./configuration.md) to change the bind address or the
  port, both of which are hardcoded.
- [Troubleshooting](./troubleshooting.md) for port collisions, loopback
  unreachability, and the absence of graceful shutdown.
- [Documentation hub](./README.md) for the rest of this documentation set.
