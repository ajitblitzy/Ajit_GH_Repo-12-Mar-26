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

Run the 24.x Active LTS line, and within it the current patch release.
Every example on this page was executed under Node.js 24.19.0 and re-run
unchanged under 24.21.0, so naming a patch records the build a check ran
on rather than a version to pin to:

| Version | Release line          | Use with this project       |
| ------- | --------------------- | --------------------------- |
| 24.x    | Active LTS "Krypton"  | Required — latest patch     |
| 24.21.0 | Active LTS "Krypton"  | Re-verified — OpenSSL 3.5.8 |
| 24.19.0 | Active LTS "Krypton"  | Observation baseline only   |
| 22.23.2 | Maintenance LTS "Jod" | Works, but not preferred    |
| 26.7.0  | Current, not an LTS   | Not recommended             |
| 20.x    | End of life           | Unsupported                 |

- Node.js 24.x is the Active LTS line, supported until 2028-04-30, and
  it is the line this documentation is written against. Install its
  current patch release: patch releases inside a supported line carry
  security fixes for the runtime and for the libraries bundled into it,
  the embedded OpenSSL among them. Node.js 24.19.0, published
  2026-08-03, is the build every published example here was verified
  under; Node.js 24.21.0, published 2026-09-08, is a later patch of the
  same line and raised the embedded OpenSSL to 3.5.8. Nothing in this
  project reaches OpenSSL — the only import is the plain-HTTP `http`
  module and no TLS, `https`, or `crypto` API is used anywhere
  (`Source: server.js:L1-L14`) — and the patch level changes nothing this
  page records: re-running every observation under 24.21.0 reproduced the
  startup line, the `200` / `text/plain` / 14-byte response with the same
  header set, the `HEAD` and HTTP/1.0 variants, the runtime-generated
  `417`, `400` and `431` cases, and the `EADDRINUSE` stderr trace with
  exit code `1`, all unchanged. Staying current on the patch is runtime
  hygiene rather than a prerequisite for the walkthrough.
- Node.js 22.x is in Maintenance LTS, a line that receives critical bug
  fixes and security updates; new features reach it only at the Release
  team's discretion, and typically only where the feature supports
  migration to a later release line. The service runs there, but it is
  not the line this documentation is written against.
- Node.js 26.7.0 is a Current release rather than an LTS line, so it is
  not a suitable line to standardise on even though it is newer.
- Node.js 20.x reached end of life on 2026-04-30 and receives no further
  fixes, so it is unsupported here.

The choice follows the Node.js project's own release policy, in its own
words: LTS status "typically guarantees that critical bugs will be fixed
for a total of 30 months", and "production applications should only use
Active LTS or Maintenance LTS releases". Both statements, and the release
dates in the table above, come from the Node.js
[release schedule](https://nodejs.org/en/about/previous-releases) and the
[Release working group](https://github.com/nodejs/Release). That guidance
chooses the release *line*; staying on that line's current patch release
is the separate obligation stated above it. Neither statement is a claim
that this service is suitable for production deployment, which it is not:
it binds the loopback interface only. `Source: server.js:L3`

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
  it in the foreground: your shell's own job control and `kill`, plus
  `mktemp` for a log file of its own. `ps` and `lsof` appear once each, in
  the diagnostic path for a listener whose launch you did not retain —
  `ss -ltnp` or `netstat` answers that same question where `lsof` is not
  installed. On Windows the equivalents are built-in PowerShell cmdlets
  and need no installation: `Start-Process`, `Stop-Process`,
  `Get-Process`, `Select-Object`, `New-TemporaryFile`, and
  `Get-NetTCPConnection`. Stopping a foreground process needs nothing but
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

Clone the repository and change into it. This page deliberately names no
host: substitute the clone URL of the remote you were given, and take it
from a source you can attribute — the person or system that owns the
remote, rather than a link in a chat message or an issue comment whose
origin you cannot establish. What you clone is what you are about to
execute.

Do not paste that URL into a shell command line. A URL is data, while
text that arrives as part of a command is shell *source*: inside double
quotes a POSIX shell still expands `$(...)`, backticks, and `${...}`, so
a URL carrying a command substitution runs that command as the
assignment is parsed, before `git` is reached at all. Read the value on
standard input instead, where no expansion of any kind takes place:

```bash
printf 'Paste the clone URL, then press Enter and Ctrl-D:\n'
repo_url=$(cat)
```

`cat` reads standard input to end-of-file, and a command substitution
never re-scans what it captures, so the whole paste becomes the value of
`repo_url` and none of it is parsed as shell source.

Reading to end-of-file is the part that carries the safety, and a
single-line read is where this goes wrong. `IFS= read -r repo_url` takes
the first line and stops, which leaves the remainder of a multi-line
paste sitting in the terminal's input — and that input is the same
stream your shell reads its commands from, so the moment the read
returns, the shell runs the next pasted line as a command. A URL
followed by a newline and a second line is therefore a command-execution
path, whatever the value of the variable looks like afterwards. `cat`
closes it by consuming every line of the paste as data. Ctrl-D is what
marks the end; until you send it, `cat` is still waiting, and pressing
Enter alone only adds a blank line.

Because the URL is never part of a command, it also never reaches your
shell history.

Check the value before you use it, and clone only if it passes:

```bash
case "$repo_url" in
  *[![:graph:]]*)
    printf 'Refused: not a single unbroken URL.\n' >&2 ;;
  https://*@* | ssh://*:*@*)
    printf 'Refused: the URL embeds credentials.\n' >&2 ;;
  https://* | ssh://*)
    git clone -- "$repo_url" hao-backprop-test ;;
  *)
    printf 'Refused: use an https:// or ssh:// URL.\n' >&2 ;;
esac
```

Each refusal is there for a reason:

- **Anything other than a single unbroken URL.** `[![:graph:]]` matches
  any character outside printable, non-space ASCII: a space, a tab, a
  control character, or the newline that a second pasted line brings
  with it. A paste carrying more than the URL is therefore refused here,
  having already been taken as inert data by the step above — so exactly
  one line of printable characters reaches the checks that follow.
  Control characters matter for a second reason: they can rewrite what a
  terminal displays, so the string you inspect need not be the string
  you clone.
- **Embedded credentials.** A userinfo component —
  `https://user:token@host/...` — is written into `.git/config` as the
  `origin` remote and printed back by `git remote -v`, which leaves the
  secret in cleartext in the working tree and in every copy of it. Use
  SSH keys or a Git credential helper instead.
- **Any transport that is not `https://` or `ssh://`.** `git://` and
  plain `http://` are neither authenticated nor encrypted, so anything on
  the network path can substitute the code you are about to run.

The accepting branch clones with the `--` option terminator, and that is
what makes a leading-dash value harmless: without `--`, a string
beginning with `-` is parsed as an option to `git clone` rather than as
the repository to clone.

The guard accepts URL forms only, so the scp-like SSH shorthand
`git@host:path` is refused; its canonical equivalent
`ssh://git@host/path` passes unchanged. If you have already cloned with a
credential-bearing URL, replace the remote with `git remote set-url` and
treat the embedded secret as disclosed.

A successful clone leaves the checkout in a new `hao-backprop-test`
directory:

```bash
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

For scripted use, background it and send its output to a file of its
own:

```bash
umask 077
server_log=$(mktemp "${TMPDIR:-/tmp}/hao-backprop-test-XXXXXX")
node server.js > "$server_log" 2>&1 &
server_pid=$!
```

Three details in that block are deliberate, and a fixed path such as
`/tmp/srv.log` has none of them:

- `mktemp` creates the file itself, under a name it has just established
  is unused. A predictable shared name is a name a second run of this
  same procedure overwrites, and one that anything else on the host can
  pre-create as a symbolic link — in which case your redirection
  truncates whatever that link points at, with your privileges.
- `umask 077` makes owner-only the default for what this shell creates.
  `mktemp` already gives its own file those permissions — the observed
  mode is `-rw-------` — and the umask extends the same restriction to
  anything else the session writes, including the log itself on a system
  whose `mktemp` does not set the mode for you.
- `"$server_log"` is quoted at every use, because `TMPDIR` is an
  environment value and may contain spaces.

Read the startup line back from that file, and delete it when you are
finished with it:

```bash
cat "$server_log"
rm -f "$server_log"
```

`server_pid` holds the process ID this shell just started; the shell also
records the launch as a job, which is what
[Stopping the server](#stopping-the-server) uses.

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

If you backgrounded the process, stop it through the launch you still
hold rather than through a number you look up afterwards. A POSIX shell
records every background launch as a job of its own:

```bash
umask 077
server_log=$(mktemp "${TMPDIR:-/tmp}/hao-backprop-test-XXXXXX")
node server.js > "$server_log" 2>&1 &
server_pid=$!
```

Ask the shell which job that was, then signal the job:

```bash
jobs
kill %1
```

Substitute the job number `jobs` actually reports. The job specification
is the safer of the two references you now hold, because the shell
resolves `%1` against its own table of the jobs it started — a record
that no other process can occupy.

`$server_pid` is the same process while that process is alive, and only
then. A process ID is an integer the kernel is free to reuse once the
process has exited, so a saved PID is a claim about the past rather than
a handle: signalling one after its job has ended can land on an unrelated
process that has since inherited the number. Use it in the shell that
created it, while `jobs` still lists the job as running, and never carry
one across sessions or reuse one from an earlier run.

Windows has no POSIX signal to send. `Ctrl+C` in the foreground is the
direct equivalent, and for a backgrounded process `Start-Process
-PassThru` hands back the process object itself, which is the handle to
keep:

```powershell
$serverLog = (New-TemporaryFile).FullName
$server = Start-Process node server.js -PassThru -NoNewWindow `
  -RedirectStandardOutput $serverLog
```

Stop it by passing that object back:

```powershell
Stop-Process -InputObject $server
```

Use `-InputObject` with the object rather than `-Id` with its number:
the object names the process it was created for, whereas an ID is
resolved again at the moment you stop it and so reopens the reuse window
described above. `$server.HasExited` answers whether the process is still
running before you try, `Get-Content $serverLog` shows the startup line
it wrote, and `Remove-Item $serverLog` clears the file afterwards.
`New-TemporaryFile` supplies a uniquely named file, so one run's log
cannot overwrite another's.

### Stopping a listener whose launch you did not retain

Without a job or a process object there is no reliable way to identify
the listener, and the honest remedy is not a better lookup — it is to
stop the process from the session that started it, or to leave it alone
and move this service to a port nothing else holds by editing the `port`
literal. `Source: server.js:L4` [Configuration](./configuration.md)
covers that edit.

A port query is still worth running, as a diagnostic and nothing more.
It tells you whether anything holds the port and narrows what that might
be; it does not tell you the process is yours:

```bash
listener_pid=$(lsof -ti tcp:3000 -sTCP:LISTEN)
ps -p "$listener_pid" -o pid=,user=,etime=,comm=
```

```powershell
$owner = (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess
Get-Process -Id $owner | Select-Object Id, ProcessName, Path, StartTime
```

`lsof -ti` prints one PID per line and can report more than one, since a
port may be held by several sockets; pass them to `ps -p` as a
comma-separated list if that happens.

Those fields — the process ID, its owner, how long it has been running,
and the executable behind it — are the identity evidence available
without exposing the process's own inputs. Neither command prints the
full argument vector, and that omission is deliberate. A port lookup
returns whichever process holds port 3000, which need not be this
fixture, and an arbitrary process's arguments routinely carry passwords,
API tokens, connection strings, and personal data. Terminal output is
also routinely captured — into CI job logs, shell transcripts, and
tickets — so printing another process's command line turns a local
diagnostic into a durable disclosure. For the same reason, do not reach
for `(Get-CimInstance Win32_Process -Filter "ProcessId=$owner").CommandLine`
to recover what `Get-Process` withholds, keep this output out of shared
logs and issue comments, and redact it if you must pass it on.

What the evidence cannot settle is identity. Every instance of this
fixture on a host runs the same `node` executable with the same
`server.js` argument under the same account, so on a shared account, or
with several clones of this repository running side by side, the fields
above match a process you did not start exactly as well as one you did.
The timing does not hold either: a PID is read at one moment and would be
acted on at another, and the process can exit in between and leave its
number to a new one, so a decision taken on this evidence can land
somewhere else entirely. That check-then-use gap is the reason this
lookup stays a diagnostic: treat its result as information, never as a
target.

Never stop a port owner you have not identified through its launch. That
rule matters most in the one case where it is tempting to skip: if this
service just failed to start with `EADDRINUSE`, the process holding the
port is by definition not this service — the bind failed, so this process
never owned the port and has already exited. `Source: server.js:L1-L14`
Stopping that owner blind is the wrong move. Decide deliberately whether
freeing the port is yours to do at all, and if it is not, change the port
this service asks for. [Troubleshooting](./troubleshooting.md) covers the
collision.

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
fails — `no such job` for a job specification the shell no longer lists,
`No such process` for a PID that had already exited, and `Operation not
permitted` when the process is not yours to signal. `Stop-Process` writes
an error record naming the process it could not stop and leaves `$?`
false, but by default it is a non-terminating error: the rest of your
script keeps running and no `catch` block fires, so add
`-ErrorAction Stop` if you want the failure to halt execution. A
permission failure, a process that had already exited, and a target that
was never this process look the same from the outside until you look.

Then re-query the listener — `lsof -ti tcp:3000 -sTCP:LISTEN` on a POSIX
shell, or the `Get-NetTCPConnection` command above in PowerShell — and
compare the PID it now reports against the one you tried to stop. Use a
port query rather than a command-line match for this: only the port query
answers who holds the socket. Only a stop that reported success, followed
by the port still held under a different PID, supports the conclusion that
something else owns the port — and that conclusion leads to changing the
port this service asks for, not to stopping an owner you cannot identify.
See [Troubleshooting](./troubleshooting.md) for that case and for the
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
