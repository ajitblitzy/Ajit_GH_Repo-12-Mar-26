# Module bindings

This page is the reference for the four module-scope bindings declared in
`server.js` — `http`, `hostname`, `port`, and `server` — and for the two
call sites that consume them, `http.createServer(...)` and
`server.listen(port, hostname, callback)`. Each one has its own entry giving
its kind, type, value, mutability, every place it is consumed, and why it
matters.

These four names are the vocabulary the rest of this reference tier uses, so
this is the page that settles what each one is. It describes the program as
it is built. Several of the facts recorded below are *absences* — no
`'error'` listener, no `close()` call, no `process.env` read, no exported
symbol — and each is documented as a characteristic of a deliberately
minimal single-file service rather than as a defect awaiting repair. Nothing
here proposes changing the code.

## Contents

- [How to read the locators on this page](#how-to-read-the-locators-on-this-page)
- [Binding summary](#binding-summary)
- [`http`](#http)
- [`hostname`](#hostname)
- [`port`](#port)
- [`server`](#server)
- [Call site: `http.createServer(...)`](#call-site-httpcreateserver)
- [Call site: `server.listen(...)`](#call-site-serverlisten)
- [Consumption sites at a glance](#consumption-sites-at-a-glance)
- [Exports](#exports)
- [Traceability](#traceability)
- [Related documentation](#related-documentation)

## How to read the locators on this page

Every claim below carries an inline citation of the form
`Source: server.js:L3`, so any statement here can be checked against the
source in seconds.

Two conventions govern those citations:

- **They are anchored to baseline commit `1484182`.** `server.js` now
  carries JSDoc documentation comments, which shift the file's physical line
  numbers. The locators here continue to describe the baseline layout,
  because the whole documentation set is anchored to it and that is what
  makes the citations comparable across pages. The baseline commit is the
  verifiable reference point for all of them.
- **They name single lines or ranges, never a total line count.** A claim
  about one statement cites that statement. A claim about something that
  appears *nowhere* in the file cites the whole file as
  `Source: server.js:L1-L14`, because the claim is about the file rather
  than about any one line.

One claim on this page is about the repository tree rather than about
`server.js` — that no package manifest exists — so no line locator could
carry it honestly. It cites the tree at the same baseline commit instead,
which is equally checkable.

The baseline layout those locators refer to is this — eleven executable
statements across fourteen content lines:

```js
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

Behavioural claims on this page — the readiness line, the response status,
the port-collision output, the loopback constraint — were reproduced against
a live instance under Node.js 24.19.0. The values quoted are the values
observed.

## Binding summary

All four bindings are declared at module scope with `const`, and none is
reassigned anywhere in the file. `Source: server.js:L1-L14`. The **Line**
column gives the baseline `server.js` line on which each is declared.

| Binding    | Kind     | Type          | Value         | Line | Rebound |
| ---------- | -------- | ------------- | ------------- | ---- | ------- |
| `http`     | Import   | Module object | `http` module | L1   | Never   |
| `hostname` | Constant | `string`      | `'127.0.0.1'` | L3   | Never   |
| `port`     | Constant | `number`      | `3000`        | L4   | Never   |
| `server`   | Instance | `http.Server` | Return value  | L6   | Never   |

Two notes on that table.

The type names in it — the `http` module object and `http.Server` — are the
**documented Node.js types** of these values. They are not declared in the
source: this is plain CommonJS JavaScript with no type annotations anywhere.
`Source: server.js:L1-L14`.

For `hostname` and `port`, `const` is not the only thing fixing the value.
There is also no runtime override of any kind — no environment variable, no
command-line flag, no configuration file — because nothing in the file reads
`process.env`. `Source: server.js:L1-L14`.

## `http`

```js
const http = require('http');
```

`Source: server.js:L1`.

- **Kind:** CommonJS core-module import.
- **Type:** the Node.js `http` module object — the documented Node.js type,
  not a type declared in this file.
- **Declared at:** `server.js:L1`.
- **Mutability:** `const`, never reassigned. `Source: server.js:L1-L14`.
- **Consumed at:** `server.js:L6`, as the receiver of
  `http.createServer(...)`.
- **Feature:** F-001 HTTP Server Listener.

**What it is.** A `require` of the Node.js built-in `http` module, bound to
the name `http`. It is the first statement in the file, and it establishes
the module system in use as CommonJS. `Source: server.js:L1`.

**Where it is consumed.** Exactly once, as the receiver of the
`http.createServer(...)` call that builds the server instance.
`Source: server.js:L6`. Nothing else in the file touches the binding — no
other member of the module is read, and no second module is imported at all.
`Source: server.js:L1-L14`.

**Why it matters.** This single import is the entire dependency graph of the
repository, and it is a dependency of an unusual kind: `http` ships
**bundled with the Node.js runtime** rather than being fetched from a
package registry. Three consequences follow, and together they explain the
shape of the whole repository:

- **There is nothing to install.** The import resolves against the
  installed runtime, so `node server.js` works on a fresh checkout with no
  preparatory step. See [Getting started](../getting-started.md).
- **It needs no dependency declaration.** Because the module ships with
  the runtime rather than from a registry, the `require` at `server.js:L1`
  resolves with nothing installed, and no manifest entry has to name it.
  `Source: server.js:L1`.
- **Its effective version is simply the version of the installed runtime.**
  There is no separate version to pin and no version range to resolve,
  because the module is not distributed independently of Node.js.

The count of third-party dependencies is therefore zero, direct and
transitive alike. `Source: server.js:L1-L14`.

**No manifest is present, and that is a separate fact.** This repository
provides no `package.json` and no lockfile, so it declares no npm
`scripts`, no package metadata, and no `engines` range.
`Source: repository tree at 1484182, holding only README.md and server.js`.
That absence does not follow from the dependency count above: an npm
manifest declares metadata, `engines`, `scripts`, and the module `type` as
well as dependencies, so having no registry dependencies would not by
itself leave a manifest with nothing to declare. The two facts are
independent, and each is recorded here as a characteristic of this
deliberately minimal single-file service. The consequence worth carrying
forward is the launch path: there is no `npm start` to reach for, because
an npm script needs a manifest to live in, so the only launch command is
`node server.js`.

## `hostname`

```js
const hostname = '127.0.0.1';
```

`Source: server.js:L3`.

- **Kind:** module-scope constant.
- **Type:** `string`.
- **Value:** `'127.0.0.1'` — a quoted string literal holding the IPv4
  loopback address.
- **Declared at:** `server.js:L3`.
- **Mutability:** `const`, with no `process.env` fallback anywhere in the
  file. `Source: server.js:L1-L14`.
- **Consumed at:** `server.js:L12` and `server.js:L13`.
- **Features:** F-001 HTTP Server Listener, and it contributes to F-003
  Startup Readiness Logging.

**What it is.** The network interface the listener binds to, held as a
string literal. The value is the IPv4 loopback address.
`Source: server.js:L3`.

**Where it is consumed — both sites.** The binding is read in exactly two
places, and the second is easy to overlook:

| Read at | Role                                          |
| ------- | --------------------------------------------- |
| L12     | Second argument to `listen`: the bind address |
| L13     | Interpolated into the readiness line          |

Because the readiness line interpolates this same constant instead of
repeating its value, the message always names the address actually passed to
the bind call. The two can never disagree. `Source: server.js:L12-L14`.

**Why it matters.** The loopback literal is the most consequential value in
the repository, because it fixes **who can reach the service**: only clients
running on the same host as the process. That constraint is observable
rather than theoretical. Both rows below were measured from the host itself,
against one running instance:

| Request target             | Observed result                   |
| -------------------------- | --------------------------------- |
| `http://127.0.0.1:3000/`   | `200`, `text/plain`, 14-byte body |
| `http://<host-addr>:3000/` | No connection; `curl` exits `7`   |

`<host-addr>` stands for one of this host's own non-loopback IPv4 addresses.
The second row is a **connection failure, not an HTTP error**: no socket is
listening on that address, so there is no status code to receive — `curl`
reports the status as `000` precisely because it never got one — and nothing
reaches the server to be logged. `Source: server.js:L3`.

This is why a client on another machine, in another container, or on a
container host cannot reach the service, and it is the first thing to check
when a connection fails. The symptom in diagnostic form is in
[Troubleshooting][tr-loopback]. The mechanism for changing the value, and
what changes with it, belongs to [Configuration][cfg-hostname].

## `port`

```js
const port = 3000;
```

`Source: server.js:L4`.

- **Kind:** module-scope constant.
- **Type:** `number`.
- **Value:** `3000` — an unquoted numeric literal, not a string.
- **Declared at:** `server.js:L4`.
- **Mutability:** `const`, with no environment override.
  `Source: server.js:L1-L14`.
- **Consumed at:** `server.js:L12` and `server.js:L13`.
- **Features:** F-001 HTTP Server Listener, and it contributes to F-003
  Startup Readiness Logging.

**What it is.** The TCP port the listener binds to, held as a number. The
literal is numeric rather than a quoted string, which is worth noting
because the two are not interchangeable in every API that accepts a port.
`Source: server.js:L4`.

**Where it is consumed — both sites.** As with `hostname`, the binding is
read twice:

| Read at | Role                                      |
| ------- | ----------------------------------------- |
| L12     | First argument to `listen`: the bind port |
| L13     | Interpolated into the readiness line      |

Because the readiness line interpolates this same constant, it reports the
port that was actually bound rather than a value written out separately.
`Source: server.js:L13`.

**Why it matters: collision consequences.** This program binds one local
address and port tuple, `127.0.0.1:3000`, and the bind cannot succeed if
another listener already holds that same tuple. `Source: server.js:L3-L4`.
Two qualifications keep that statement precise. The constraint is on the
tuple rather than on the port number by itself, because the same port
number can be held at the same time on a different local address. And it is
the constraint that applies under this program's default listener
configuration: `server.listen(port, hostname, callback)` passes a port, an
address and a callback and nothing else, so there is no options object and
no exclusivity setting of any kind is requested.
`Source: server.js:L12`. The program has no strategy for a tuple that is
already taken. When the bind fails, the resulting `'error'` event has no
listener registered on it anywhere in the file
(`Source: server.js:L1-L14`), so the runtime rethrows it and the process
terminates.

Observed by starting a second instance while the first still held the port:

- The process exits with status **`1`**, and its stdout is **empty** — the
  readiness line never appears, because the Listen Readiness Callback never
  runs. `Source: server.js:L12-L14`.
- stderr opens by reporting the unhandled event,
  `throw er; // Unhandled 'error' event`, and then carries:

```text
Error: listen EADDRINUSE: address already in use 127.0.0.1:3000
```

- After the stack frames, the error object's own fields are printed:

```text
  code: 'EADDRINUSE',
  syscall: 'listen',
  address: '127.0.0.1',
  port: 3000
```

Match on that message line and those four fields; together they identify
exactly what could not be bound. The object also carries an `errno` field,
but its numeric value is **platform-specific** — `-4091` was observed on
Windows and `-98` on Linux — so it is not a stable thing to assert on. The
stack-frame line numbers move with the Node.js version, and the final line
of the trace names the runtime version of the machine that produced it. The
full observed trace, with those caveats spelled out, is in
[Troubleshooting][tr-eaddrinuse].

There is no retry, no fallback port, and no diagnostic of the program's own
making: in that failure everything on stderr comes from the runtime. The
remedies are operational — free the port that is already in use, or move
this service by editing the literal at `server.js:L4`, which is the only
mechanism that exists for changing it, since no environment variable or flag
is read. `Source: server.js:L1-L14`. The edit procedure and the
verification step that follows it belong to [Configuration][cfg-port] and
are not repeated here.

## `server`

```js
const server = http.createServer((req, res) => {
```

`Source: server.js:L6`.

- **Kind:** module-scope binding holding the server instance.
- **Type:** `http.Server` — the documented Node.js type. The source
  declares no types, so that name comes from the Node.js documentation
  rather than from this file. `Source: server.js:L1-L14`.
- **Value:** the object returned by `http.createServer(...)`.
- **Declared at:** `server.js:L6`, on the same line as the call whose
  result it captures.
- **Mutability:** `const`, never reassigned.
  `Source: server.js:L1-L14`.
- **Consumed at:** `server.js:L12`, as the receiver of
  `server.listen(port, hostname, callback)`.
- **Feature:** F-001 HTTP Server Listener.

**What it is.** The return value of the `http.createServer(...)` call, bound
to the name `server`. Capturing it is what makes the instance reachable by
the `listen` call two statements later. `Source: server.js:L6`.

**Where it is consumed.** Exactly once, as the receiver of the `listen` call
that opens the socket. `Source: server.js:L12`.

**Why it matters: what is *not* done with it.** This is the most
informative thing about the binding. Holding a reference to an
`http.Server` makes a wide range of lifecycle and error-handling operations
available, and this file performs exactly one of them — `listen`. Each item
below is an absence verified across the whole file, and each is a
characteristic of the design as built:

- **No `'error'` listener is registered,** so a bind failure becomes an
  unhandled `'error'` event that terminates the process.
  `Source: server.js:L1-L14`.
- **`close()` is never called,** so there is no in-process path to stop
  accepting connections. `Source: server.js:L1-L14`.
- **No signal handler is installed,** so termination is immediate, with no
  connection draining and no shutdown log line.
  `Source: server.js:L1-L14`.
- **No `'connection'` listener is subscribed,** so individual sockets are
  never observed. `Source: server.js:L1-L14`.
- **No `'clientError'` listener is subscribed,** so a malformed request is
  left entirely to the runtime's own handling.
  `Source: server.js:L1-L14`.
- **No additional `'listening'` listener is registered through
  `server.on('listening', ...)`.** The listener that does exist is the
  third argument to `listen`: the **Listen Readiness Callback** is itself
  registered by the runtime as a listener for the server's `'listening'`
  event — behaviour `http.Server` inherits from `net.Server` — which makes
  it the sole listening and readiness listener in the file.
  `Source: server.js:L12-L14`.

Two of those absences are the direct cause of behaviour documented elsewhere
in this set. The missing `'error'` listener is why a port collision is fatal
rather than merely reported — see [`port`](#port) above. The missing
`close()` call and the missing signal handler together mean there is no
graceful-shutdown or connection-draining path at all, which is why stopping
the process is abrupt; that symptom is covered in
[Troubleshooting][tr-stop].

The binding is also never exported, so no other module can reach the
instance to do any of these things from outside. See [Exports](#exports).

## Call site: `http.createServer(...)`

```js
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, World!\n');
});
```

`Source: server.js:L6-L10`.

- **Call site:** `server.js:L6`.
- **Receiver:** `http`, the core-module import from `server.js:L1`.
- **Arguments:** one — the request listener. There is no options object and
  no second argument of any kind. `Source: server.js:L6`.
- **Argument passed:** the **Request Handler Callback**,
  `server.js:L6-L10`.
- **Returns:** an `http.Server`, captured as `server` on the same line.
- **Mutability:** not applicable — a call expression is not a binding, so
  there is nothing here to rebind. What it returns *is* captured in a
  binding, and that binding is `const` and never reassigned: see
  [`server`](#server). `Source: server.js:L6`.
- **Feature:** F-001 HTTP Server Listener.

**What the call does.** It creates a server instance and registers the
function passed to it as the listener for that server's `request` event.
`Source: server.js:L6`.

**The argument is the Request Handler Callback.** It is an anonymous arrow
function written inline at the call site, spanning `server.js:L6-L10`, and
it is the function that produces every response this service sends. Because
it has no identifier in the source, this documentation set refers to it by
the stable role name **Request Handler Callback** throughout; the JSDoc
annotation in `server.js` gives the same function the documentation-level
type name `RequestHandlerCallback`. Its parameters, its statement-by-statement
behaviour, and the request data it never reads are documented on its own
page: [Request Handler Callback](./functions/request-handler-callback.md).

**This call creates but does not bind.** No socket is opened and no port is
claimed here. The instance exists and has a listener attached, but it is not
yet accepting connections — that happens only when `listen` is called at
`server.js:L12`. Two consequences follow from that ordering: a port
collision cannot surface at this line, and nothing would keep the event loop
alive at the end of the module body if the `listen` call were never reached.

## Call site: `server.listen(...)`

```js
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
```

`Source: server.js:L12-L14`.

- **Call site:** `server.js:L12`.
- **Receiver:** `server`, the `http.Server` from `server.js:L6`.
- **Arguments:** three, in the order `(port, hostname, callback)`.
- **Argument 1:** `port` — the number `3000` from `server.js:L4`.
- **Argument 2:** `hostname` — the string `'127.0.0.1'` from
  `server.js:L3`.
- **Argument 3:** the **Listen Readiness Callback**, `server.js:L12-L14`.
- **Mutability:** not applicable — a call expression is not a binding, so
  there is nothing here to rebind. This one is written as a bare statement,
  and its return value is not captured anywhere in the file.
  `Source: server.js:L12`.
- **Features:** F-001 HTTP Server Listener; its third argument implements
  F-003 Startup Readiness Logging.

**The argument order is `(port, hostname, callback)` — port first, host
second.** This is the detail most easily misremembered, so it is worth being
unambiguous: the numeric port precedes the address string. The call as
written is `server.listen(port, hostname, () => {`.
`Source: server.js:L12`.

**What the call does.** This is the statement that opens the listening
socket. Until it runs, the instance created at `server.js:L6` exists but
accepts nothing. Once it succeeds the process stays alive, because an open
listening socket keeps the event loop occupied, and inbound requests begin
dispatching to the Request Handler Callback. `Source: server.js:L6-L12`.

**The third argument is the Listen Readiness Callback.** It is an anonymous,
zero-arity arrow function written inline at the call site, spanning
`server.js:L12-L14`, and it is invoked once when the bind succeeds. It
writes exactly one line to stdout — the only output this program ever
produces:

```text
Server running at http://127.0.0.1:3000/
```

`Source: server.js:L13`. As with the other callback it has no identifier in
the source, so this set refers to it by the stable role name **Listen
Readiness Callback**; the JSDoc annotation in `server.js` gives it the
documentation-level type name `ListenReadinessCallback`. Its one-shot
semantics, its closure over `hostname` and `port`, and the case in which it
never runs at all are documented on its own page:
[Listen Readiness Callback](./functions/listen-readiness-callback.md).

**A failure here surfaces as an unhandled `'error'` event.** The bind is the
operation that can fail, and no `'error'` listener is registered on the
server anywhere in the file (`Source: server.js:L1-L14`), so a failure is
rethrown by the runtime and ends the process with status `1`. In that case
the third argument is never invoked, which means the absence of the
readiness line above is itself the signal that the socket was never bound.
The port-collision case is documented under [`port`](#port).

## Consumption sites at a glance

Every read of every binding in the file, in one place. There are six, and
this table accounts for all of them. `Source: server.js:L1-L14`.

| Binding    | Read at | As                                   |
| ---------- | ------- | ------------------------------------ |
| `http`     | L6      | Receiver of `http.createServer(...)` |
| `hostname` | L12     | Second argument to `listen`          |
| `hostname` | L13     | Interpolated into the readiness line |
| `port`     | L12     | First argument to `listen`           |
| `port`     | L13     | Interpolated into the readiness line |
| `server`   | L12     | Receiver of `server.listen(...)`     |

Two properties of that table are worth naming.

First, `hostname` and `port` are each read twice, and one of those reads is
the log line rather than the bind — which is why the startup message can
never contradict the address the socket was opened on.
`Source: server.js:L12-L13`.

Second, neither constant is read by the Request Handler Callback. The
response contract is produced without consulting either value, so the host
and the port affect only the address a client dials, never the status,
headers, or body it receives. `Source: server.js:L6-L10`.

## Exports

**The module declares no `module.exports`, so it has no importable API
surface: 0 of 0 exported symbols.** There is no `module.exports` assignment,
no `exports.` property assignment, and no export of any other form.
`Source: server.js:L1-L14`.

That absence is a documented characteristic of the file rather than an
omission to work around: this is a program meant to be **run as a process**,
not a module meant to be consumed by another one. The launch command is
`node server.js`, given in full in
[Getting started](../getting-started.md).

It has one practical consequence worth flagging here, because it catches
people who try to consume the file programmatically. Loading it with
`require` returns an empty object while starting a live server as a side
effect of the load, and then holds the loading process open. Observed
directly: the result is an `object` with `0` own keys, the readiness line
appears on stdout, and the loading process does not exit.
`Source: server.js:L1-L14`. The full treatment of that trap belongs to
[Usage][usage-require].

## Traceability

Each binding and call site maps to the features defined in the upstream
specification. These are the only identifiers that apply, and no others are
introduced here:

| Unit | Element               | Line | Features     |
| ---- | --------------------- | ---- | ------------ |
| U-1  | `http`                | L1   | F-001        |
| U-2  | `hostname`            | L3   | F-001, F-003 |
| U-3  | `port`                | L4   | F-001, F-003 |
| U-4  | `http.createServer()` | L6   | F-001        |
| U-5  | `server`              | L6   | F-001        |
| U-7  | `server.listen()`     | L12  | F-001        |

F-001 HTTP Server Listener is Critical. F-003 Startup Readiness Logging is
Medium.

`hostname` and `port` carry two features each because both are interpolated
into the readiness line as well as passed to the bind call, so they serve
the listener and the readiness signal alike.
`Source: server.js:L12-L13`.

F-002 Uniform HTTP Response Handler, which is Critical, is not implemented
by any binding or call site on this page. It belongs to the Request Handler
Callback, and is covered on
[its own page](./functions/request-handler-callback.md) and in the
[HTTP endpoint](./http-endpoint.md) contract.

## Related documentation

- [Documentation hub](../README.md) — index for the whole documentation set.
- [API reference index](./README.md) — the unit inventory this page belongs
  to.
- [HTTP endpoint](./http-endpoint.md) — the wire-level response contract
  produced at the address these bindings define.
- [Request Handler Callback](./functions/request-handler-callback.md) — the
  argument passed at `server.js:L6`.
- [Listen Readiness Callback](./functions/listen-readiness-callback.md) —
  the third argument passed at `server.js:L12`.
- [Configuration](../configuration.md) — owns the procedure for editing
  `hostname` and `port`, and what changes with each edit.
- [Troubleshooting](../troubleshooting.md) — the `EADDRINUSE` and loopback
  symptoms in diagnostic form.
- [Usage](../usage.md) — how to consume the endpoint, and the
  `require('./server')` trap in full.
- [Getting started](../getting-started.md) — prerequisites and first launch.

[cfg-hostname]: ../configuration.md#hostname
[cfg-port]: ../configuration.md#port
[tr-eaddrinuse]: ../troubleshooting.md#error-listen-eaddrinuse
[tr-loopback]: ../troubleshooting.md#connection-refused-from-another-machine-or-container
[tr-stop]: ../troubleshooting.md#the-process-died-instantly-on-stop
[usage-require]: ../usage.md#what-you-must-not-do-requireserver
