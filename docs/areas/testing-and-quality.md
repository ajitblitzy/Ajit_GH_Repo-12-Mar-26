# Testing and Quality

This is the testing and quality area document for this repository. It is the
acceptance surface for the whole project: it records how a change here is
verified today, what result each check is expected to produce, and where the
line falls between what has been measured and what is merely advisable.

Two things make this document unusual, and both are stated up front rather
than discovered halfway down. First, the repository contains no automated
tests and no quality tooling at all [.:git ls-files]. Second, this
documentation change does not add any, and the section
[What this documentation work does not create](#what-this-documentation-work-does-not-create)
explains why. What stands in their place is the matrix below: every case in it
was executed by hand against a running process, and its result is recorded
here as evidence.

## Verification baseline

- **Documentation baseline branch** — `17-Aug-2026-Br1`, the branch this
  document was written against [.git/HEAD:ref].
- **Documentation baseline commit** — `1484182`, whose subject line is
  `Add files via upload` [.:git log -1 --oneline 1484182].
- **Files tracked at that commit** — `README.md` and `server.js`, nothing else
  [.:git ls-tree -r --name-only 1484182].
- **Program files, at that commit and now** — one, `server.js`
  [.:git ls-tree -r --name-only 1484182] [.:git ls-files].
- **Runtime used for every observed result below** — Node.js 24.19.0, with the
  npm 11.17.0 that ships inside it, verified on August 17, 2026 (**Observed on
  Node.js 24.19.0 on August 17, 2026**).
- **HTTP parser inside that runtime** — llhttp 9.4.3, as reported by
  `process.versions.llhttp` (**Observed on Node.js 24.19.0 on August 17,
  2026**).
- **Host every result below was produced on** — Linux x86_64
  (Ubuntu 24.04.4 LTS), reported by `uname -srm` as
  `Linux 6.18.33.2-microsoft-standard-WSL2 x86_64` (**Observed on Node.js
  24.19.0 on August 17, 2026**).
- **Runtime version declared by the repository** — none [.:git ls-files].
- **Automated tests in the repository** — none [.:git ls-files].

The repository pins no runtime: it tracks no `package.json`, lockfile,
`.nvmrc`, `.node-version`, or `.tool-versions` file [.:git ls-files]. Node.js
24.19.0 was therefore chosen externally so that this document could report
something exact, and it is not a repository requirement. Every result below
was produced by running the code under that build on that date, on the single
host named above. Results from any other Node.js build are not reported here,
because a protocol detail or a default limit can differ between versions and a
matrix that mixes runtimes cannot be re-run against either of them. The same
applies to the host: the entries that carry a platform-specific value — the `errno`
number and byte count of the bind-conflict diagnostic, the exit statuses a
signal produces, and the set of addresses the reachability probe found — are the
result from that one platform, and re-running them elsewhere is expected to
change those specific fields and nothing else.

Every statement below carries exactly one of these four labels:

- **Source-defined** — read directly from the code in this checkout.
- **Observed on Node.js 24.19.0 on August 17, 2026** — measured by running
  that code under that runtime on that date.
- **Absent in the current checkout** — verified to be missing from this
  checkout.
- **Recommendation** — a suggestion for future work, never a description of
  current behavior.

Values that change on every run — a timestamp, a process identifier, a
client's ephemeral source port, an absolute temporary path — appear as
angle-bracketed placeholders such as `<pid>`, never as one run's value frozen
into a permanent claim.

## Purpose and audience

Read this document when you are about to change something here and need to
know what "checked" means, or when you want to judge how much confidence the
project's verification actually earns. It answers three questions:

- How is this project verified today?
- What has to be true before a change is considered done?
- What would automated testing look like if it were ever added?

The third question is kept strictly separate from the first two. Everything
about current verification is labelled with evidence; everything about
automated testing lives in
[Future automated-test approach](#future-automated-test-approach) and is
labelled **Recommendation**.

This document has no diagram. The matrix is its figure, and the relationships
worth drawing for this project are drawn in the areas that own them.

Eight terms are used repeatedly and are defined here once:

- A *unit test* exercises one function or module on its own, with everything
  around it replaced or absent.
- An *integration test* exercises two or more parts together through their
  real interfaces. Starting this program and sending it a real HTTP request
  over a real socket is an integration test, and for this program it is the
  shape that reaches the behavior most directly — the reason is in
  [Current state](#current-state-no-automated-tests-or-quality-tooling).
- A *test runner* is the program that finds test files, executes them, and
  reports which passed. Node.js has one built in, exposed as the `node:test`
  module; Jest, Vitest, and Mocha are third-party alternatives.
- *Coverage* is the proportion of source lines or branches that a test run
  actually executed, measured by a coverage tool. It says what was exercised,
  not whether the assertions were meaningful.
- A *pass criterion* is what a check is required to produce. An *observed
  result* is what it did produce. This document keeps them in separate fields
  so that a drifting runtime is visible rather than hidden.
- An *acceptance criterion* is a statement that must be true before a change
  is considered finished.
- A *regression* is a change that breaks behavior which previously worked. A
  regression test is one kept specifically to catch that.
- A *lint* is a static check of a file against style and consistency rules,
  performed without running it. A *link check* is the narrower check that
  every link in a document resolves to something that exists.

## Current state: no automated tests or quality tooling

Every capability below is **Absent in the current checkout**, and each entry
repeats the label deliberately, so that no entry can be skimmed as though it
described something that exists. Nothing here was created in order to be
documented.

- **A test directory of any conventional name** — `test/`, `tests/`,
  `__tests__/`: **Absent in the current checkout.** No such path is tracked
  [.:git ls-files].
- **A test file of any conventional name** — `*.test.js`, `*.spec.js`, and the
  `.mjs` and `.cjs` variants: **Absent in the current checkout.** No such path
  is tracked [.:git ls-files].
- **Test-runner configuration** — Jest, Vitest, Mocha, AVA, or Karma: **Absent
  in the current checkout.** No runner configuration file is tracked
  [.:git ls-files].
- **Coverage configuration** — nyc, c8, or a coverage-service file: **Absent in
  the current checkout.** No coverage configuration is tracked
  [.:git ls-files].
- **A package manifest or lockfile** — **Absent in the current checkout.**
  Neither `package.json` nor any lockfile is tracked [.:git ls-files].
- **A linter or formatter configuration** — ESLint, Prettier, or EditorConfig:
  **Absent in the current checkout.** No such configuration is tracked
  [.:git ls-files].
- **Documentation-tool configuration** — a markdownlint or link-check
  configuration file: **Absent in the current checkout.** No such configuration
  is tracked [.:git ls-files].
- **Continuous integration** — **Absent in the current checkout.** There is no
  `.github` directory at all — not an empty one — and no other pipeline
  definition is tracked [.:git ls-files].
- **A committed test fixture, sample payload, or recorded response** — **Absent
  in the current checkout.** No fixture path is tracked [.:git ls-files].
- **A project Git hook that enforces a check** — **Absent in the current
  checkout.** No hook is tracked by the repository [.:git ls-files], and a hook
  is not shareable through Git in any case: it lives in each clone's own
  `.git/hooks` directory, so it would not travel even if one were added by
  hand.

Two consequences of that list are worth stating plainly rather than leaving
to inference.

**There is no `npm test`.** Not a failing one — an absent one. A test script
lives in a manifest, and no manifest is tracked [.:git ls-files], so there is
nothing for a package manager to read and no conventional command to run. The
same absence removes `npm install`, `npm run build`, and `npm run lint` from
this project; the reasoning for those belongs to
[the DevOps area](./devops.md#3-no-project-package-install).

**The program is not shaped for unit testing.** The file assigns nothing to
`module.exports` and exports no function, so there is no unit of code a test
could import and call [server.js:1-14]. It also starts listening as a
side effect of being evaluated [server.js:12].

- **Observed on Node.js 24.19.0 on August 17, 2026:** requiring `server.js`
  from another module returned an empty exports object, `{}`, and the act of
  requiring it printed the readiness line and bound the listener
  [server.js:12-13].
- **Recommendation:** test it as an integration test — start the process, talk
  to it over a socket, assert on the response — because that is the shape the
  program's own structure invites, and it is exactly the shape of the matrix
  below. Other approaches are possible rather than impossible: a test could
  stub `http.createServer` before loading the file, load it in a child process
  and assert on its output, or check properties of the source statically. Each
  works around the file's structure instead of using it, which is why the
  integration shape is the recommendation and not merely the default.

None of this is a defect finding. The repository describes itself as a test
project for integration purposes [README.md:2], and a 14-line fixture
[server.js:1-14] is entitled to be small. The point of recording the absence
precisely is that a new engineer can tell what confidence the project has
earned, which is: whatever was measured by hand and written down here.

## What this documentation work does not create

> **Scope note.** This documentation change adds no test file, no test
> directory, no test-runner wiring, no coverage configuration, no fixture, no
> package manifest, no lockfile, no continuous-integration workflow, and no
> tool configuration to this repository. Verification was performed
> externally, under the runtime named in the baseline above, and its results
> are recorded in this document. The matrix below **is** the project's
> validation in its current form.

That is a deliberate boundary, not an omission. This change documents the
program; it does not modify it or add anything that runs. Validation still
happened — the behavior matrix below was executed against a running process, and
the documentation checks were run over every file in the set — but it happened
externally, and what the repository gains is the record rather than the
apparatus. Adding a test file, a manifest, or a workflow would change what the
repository *is*, and that decision belongs to whoever owns the program, not to
its documentation.

The boundary exists because a rule had to be interpreted, and a new engineer is
entitled to know which one and how. The project carries a single
user-specified rule, **Rule 1 — Document code**, which pairs a documentation
deliverable with a terse expectation of validation; its wording is a constraint
on the work rather than repository content, so it is summarized here rather than
reproduced. The two readings pull in opposite directions. Read as an instruction
to add tests, it would put source artifacts into a change whose entire scope is
documentation. Read as an instruction to validate, it is satisfied by executing
the runtime behavior matrix and the documentation checks and recording exactly
what they produced. This document takes the second reading, which is why the
matrix below exists and why no test file, runner, manifest, or workflow
accompanies it — and this paragraph is where that decision is written down so it
can be traced later rather than re-inferred.

Three constraints follow from that boundary and are enforced throughout this
file:

- `server.js` is read-only evidence here. It is cited, never edited,
  commented, or annotated [server.js:1-14].
- Nothing in
  [Future automated-test approach](#future-automated-test-approach) exists.
  Every item there is labelled **Recommendation**, and none of it was
  created.
- No capability was added so that it could be described. Each absent
  capability is recorded as absent, with the evidence that it is missing.

## Source-coverage map

A coverage tool reports which source lines a test run executed. This project
has no test run, so the equivalent question is documentary: does every line of
the program have a document that explains it? The table answers that, and
links to the owner instead of restating the explanation.

| Line(s) | What it is | Owning document |
| --- | --- | --- |
| 1 | Loads Node's core `http` module [server.js:1] | [Application and runtime](./application-runtime.md) |
| 2 | Blank separator [server.js:1-14] | [Application and runtime](./application-runtime.md) |
| 3 | The loopback bind address literal [server.js:3] | [Networking](./networking.md) |
| 4 | The TCP port literal [server.js:4] | [Networking](./networking.md) |
| 5 | Blank separator [server.js:1-14] | [Application and runtime](./application-runtime.md) |
| 6 | Creates the server and registers the ordinary request callback [server.js:6] | [Application and runtime](./application-runtime.md) |
| 7 | Sets the response status code [server.js:7] | [Networking](./networking.md) |
| 8 | Sets the one application-defined response header [server.js:8] | [Networking](./networking.md) |
| 9 | Writes the response body and ends the response [server.js:9] | [Networking](./networking.md) |
| 10-11 | Closes the callback and the `createServer` call, then a blank line [server.js:10-11] | [Application and runtime](./application-runtime.md) |
| 12 | Starts the bind and registers the success callback [server.js:12] | [Infrastructure](./infrastructure.md) |
| 13 | Prints the single readiness line after a successful bind [server.js:13] | [Observability](./observability.md) |
| 14 | Closes the `listen` call; the script ends [server.js:14] | [Application and runtime](./application-runtime.md) |

All rows are **Source-defined** [server.js:1-14]. That is 14 of 14 lines with
an owning document: seven to application and runtime, five to networking, one
to infrastructure, and one to observability. The line-by-line walkthrough
itself is owned by
[the application and runtime area](./application-runtime.md#line-by-line-source-map);
this table is the coverage check over it, not a second copy of it.

Two qualifications keep the table honest:

- Documentary coverage is not test coverage. Every line being explained says
  nothing about any line being asserted on, and no line of this program is
  asserted on by committed code [.:git ls-files].
- Line ownership is not the same as behavior ownership. Several behaviors a
  client can observe are produced by the runtime rather than by any line of
  this file, which is why the matrix below records who defines the
  result. The rule behind that split is stated in
  [the application and runtime area](./application-runtime.md#application-versus-runtime-boundary).

## Runtime validation matrix

This is the project's acceptance matrix. Each case was exercised against a
running process under the runtime named in the baseline above, and the
observed result is what that exercise produced. Ordinary requests used Node's
built-in `http` client, so reproducing them needs nothing beyond the runtime
itself. The protocol cases that no client library will send were written byte
by byte over a TCP socket from a temporary `node:net` script; every script,
log, and cache stayed outside the checkout, and none of them was committed
[.:git ls-files].

The matrix is deliberately a summary and not a transcript. Complete worked
responses, header by header, are owned by
[the networking area](./networking.md#protocol-and-method-matrix), and the
operator commands are owned by
[the DevOps area](./devops.md#5-start-verify-stop-and-restart). What this
matrix adds is the pass criterion beside the result, so that a re-run on a
future runtime can be judged rather than merely compared.

Every result below is **Observed on Node.js 24.19.0 on August 17, 2026** unless
its evidence class says otherwise:

- **Runtime identity**
  - *Method:* `node --version` and `npm --version`.
  - *Pass criterion:* exactly `v24.19.0` and `11.17.0`, from a runtime installed
    outside the checkout.
  - *Observed result:* both reported exactly those values; the resolved `node`
    binary was the isolated install, not the unrelated build already on the
    host.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**; the
    repository pins no version [.:git ls-files].
- **Start and readiness**
  - *Method:* `node server.js` from the checkout root, both streams captured
    outside it.
  - *Pass criterion:* the process binds and prints the readiness line once,
    after a successful bind [server.js:12-13].
  - *Observed result:* standard output was 41 bytes and exactly one line,
    `Server running at http://127.0.0.1:3000/`; standard error was 0 bytes; the
    host reported exactly one listening socket, `127.0.0.1:3000`, owned by
    `<pid>`.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    criterion Source-defined [server.js:12-13].
- **Ordinary HTTP/1.1 `GET`, `POST`, `OPTIONS`**
  - *Method:* built-in `http` client; seven requests across `/`,
    `/anything/else`, and `/?q=1&x=2`, two of them carrying a request body.
  - *Pass criterion:* each reaches the callback and returns the source-defined
    status, content type, and body [server.js:6-10].
  - *Observed result:* every one returned `200 OK`, `Content-Type: text/plain`,
    `Content-Length: 14`, and the 14-byte body `Hello, World!` plus a newline.
    Across the seven, the number of distinct status–content-type–body
    combinations was 1. Neither a `Server` nor an `X-Powered-By` header was
    sent.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    criterion Source-defined [server.js:7-9].
- **`HEAD`**
  - *Method:* built-in `http` client, on `/` and on `/anything/else`.
  - *Pass criterion:* the callback runs unchanged; whether the body and its
    length survive is the runtime's decision, and is recorded rather than
    assumed.
  - *Observed result:* `200 OK` with `Content-Type` and `Date`, but **no body
    and no `Content-Length`**, even though the callback ends the response with a
    14-byte body [server.js:9].
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    suppression is runtime-defined.
- **`CONNECT`**
  - *Method:* raw `node:net` probe, with a 15-second client budget.
  - *Pass criterion:* record whatever the runtime does; this is not ordinary
    callback behavior and must not be described as such.
  - *Observed result:* **Zero response bytes.** The server closed the connection
    about four milliseconds after the request, sending no status line at all.
    The generous client budget confirms the server ended it, not the client.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    runtime-defined, and no `connect` listener exists [server.js:1-14].
- **HTTP/1.1 `Upgrade`**
  - *Method:* raw `node:net` probe with `Connection: Upgrade`, `Upgrade:
    websocket`, and the WebSocket key and version headers.
  - *Pass criterion:* record which path the runtime chooses when no `upgrade`
    listener is registered.
  - *Observed result:* routed to the **ordinary callback**: `200 OK`,
    `Content-Type: text/plain`, `Connection: keep-alive`, `Keep-Alive:
    timeout=5`, `Content-Length: 14`, and the usual body. No `101` and no
    protocol switch; the idle connection was then closed after about six
    seconds.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    routing runtime-defined, response Source-defined [server.js:7-9].
- **Unknown or malformed method token**
  - *Method:* raw `node:net` probe, three variants: the unrecognized token
    `FROBNICATE`, the invalid token `GE(T`, and a request line that is not HTTP
    at all.
  - *Pass criterion:* the parser rejects the request before any application
    handling, and the callback never runs.
  - *Observed result:* all three produced a byte-identical 47-byte reply —
    `HTTP/1.1 400 Bad Request` with `Connection: close`, **no `Date` and no
    `Content-Length`** — followed immediately by connection close.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    runtime-defined, and no code here influences it [server.js:1-14].
- **HTTP/1.1 without a `Host` header**
  - *Method:* raw `node:net` probe: a valid request line and an immediate blank
    line.
  - *Pass criterion:* rejection again, and recorded separately because it
    happens at a different stage.
  - *Observed result:* a **different** 117-byte `400 Bad Request`: `Connection:
    close`, then `Date`, then `Transfer-Encoding: chunked` and an empty chunked
    body, then close.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    runtime-defined [server.js:1-14].
- **HTTP/1.0 `GET`**
  - *Method:* raw `node:net` probe, twice: once with no `Host`, once with `Host`
    and `Connection: keep-alive`.
  - *Pass criterion:* record the connection and automatic-header differences
    from HTTP/1.1.
  - *Observed result:* both reached the callback and returned 115 bytes: `200
    OK` **answered as `HTTP/1.1`**, with `Content-Type`, `Date`, `Connection:
    close`, **no `Content-Length`** — the body framed by the close instead —
    and no `Keep-Alive` header. The keep-alive request was not honored.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    version and framing runtime-defined, response content Source-defined
    [server.js:7-9].
- **Request header block above the runtime limit**
  - *Method:* raw `node:net` probe with one 20 000-byte header.
  - *Pass criterion:* record the limit as the runtime's, because the application
    declares none [server.js:1-14].
  - *Observed result:* `HTTP/1.1 431 Request Header Fields Too Large` with
    `Connection: close`, 67 bytes, then close. The callback never ran.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    runtime-defined.
- **Second listener on port 3000**
  - *Method:* a second `node server.js` while the first held the socket, with
    both streams captured.
  - *Pass criterion:* the second process must not start, and the first must keep
    serving; the diagnostic is expected to come from the runtime because no
    server `error` listener exists [server.js:12-14].
  - *Observed result:* the second process wrote 0 bytes to standard output —
    no readiness line — wrote 626 bytes to standard error as an unhandled
    `error` event reporting `EADDRINUSE` with `errno: -98` for `127.0.0.1:3000`,
    and exited with status `1`. The first process was unaffected: still one
    listening socket, and a follow-up request still returned `200` with the same
    body.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    criterion Source-defined [server.js:12-14].
- **Reachability boundary**
  - *Method:* raw TCP connect to port 3000 on every address the host exposes,
    plus `localhost` and the host's own machine name.
  - *Pass criterion:* loopback reaches the listener; nothing else does, because
    of the bind address [server.js:3,12].
  - *Observed result:* `127.0.0.1` connected, and the name `localhost` connected
    by resolving to that same IPv4 address. The IPv6 loopback address `::1`,
    both non-loopback interface addresses the host exposes, and the host's own
    machine name were all refused with `ECONNREFUSED`. Exact addresses are not
    published because they belong to one machine.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    criterion Source-defined [server.js:3,12].
- **Request logging**
  - *Method:* snapshot the captured standard output, run the whole matrix above,
    snapshot it again.
  - *Pass criterion:* no application request log appears, and runtime standard
    error stays a separate emitter [server.js:6-13].
  - *Observed result:* standard output was 41 bytes and one line before, and 41
    bytes and one line after: a difference of **0 bytes**. Standard error stayed
    at 0 bytes throughout, and no file was created anywhere in the checkout
    while the process served traffic.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    criterion Source-defined [server.js:6-10].
- **Termination**
  - *Method:* `SIGINT` to the process, then re-probe; repeated with `SIGTERM`.
  - *Pass criterion:* the process ends and releases the socket; no application
    shutdown output can appear, because no signal handler and no graceful-close
    call exists [server.js:1-14].
  - *Observed result:* both requests ended the process immediately. The
    launching shell reported status `130` for `SIGINT` and `143` for `SIGTERM`
    — 128 plus the signal number, a wait status the shell derives from the
    signal rather than an exit code the program chose; a Node.js parent that
    signals the child sees `code: null` with the signal name instead. Captured
    standard output was still 41 bytes and one line, and standard error still 0
    bytes. Afterwards the host reported no listener on port 3000 and a fresh
    client attempt was refused.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    criterion Source-defined [server.js:1-14].

### Three cases that are easy to misread

- **`CONNECT` returns nothing, not an error.** A client that waits for a
  status line gets none; it learns only that the connection closed
  (**Observed on Node.js 24.19.0 on August 17, 2026**). Do not record this case
  as a `400` or a `501` on a re-run without re-reading the bytes.
- **The `Upgrade` case looks like a success and is not one.** A WebSocket
  client that only checks for a `2xx` would treat that `200` as progress,
  while no protocol switch happened at all
  (**Observed on Node.js 24.19.0 on August 17, 2026**).
- **A `200` is not a health result.** The callback sets the same status,
  header, and body for every request it receives without reading the request
  at all [server.js:6-10], so a `200` is limited liveness evidence: the
  connection was accepted, the callback ran, and a reply was serialized at that
  instant, and nothing beyond that follows. What a `200` does and does not prove
  is owned by
  [the observability area](./observability.md#what-a-200-proves-and-what-it-does-not),
  and nowhere in this document is that response called a health check.

### Runtime defaults: what was read, and what was seen to act

Reading a configured value proves it is set. Watching it act proves it is
enforced, and the two are recorded separately here. All nineteen server and
parser defaults tabulated by
[the networking area](./networking.md#timeouts-and-other-runtime-defaults)
were re-read off the live server object that `server.js` creates
[server.js:6,12] and matched that list exactly
(**Observed on Node.js 24.19.0 on August 17, 2026**); they are not copied
again here. The five below are the ones whose *behavior* this document owns,
because they decide when a connection ends or when a request is refused.

Each entry names the default, the value re-read from the live object, the
behavior seen, and its evidence class.

- **`server.headersTimeout`** — value re-read: `60000` ms.
  - *Behavior seen:* a client sent a header block and never sent the blank line
    that ends it. About 71 seconds later the runtime answered
    `HTTP/1.1 408 Request Timeout` with `Connection: close` and closed — the
    60-second limit surfacing through the 30-second connection sweep. The
    callback never ran.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    enforced.
- **`server.keepAliveTimeout` and `server.keepAliveTimeoutBuffer`** — values
  re-read: `5000` ms and `1000` ms.
  - *Behavior seen:* after a complete exchange the client held the connection
    open and sent nothing. The runtime closed it 6009 ms later, which is the sum
    of the two: an idle keep-alive socket is closed at
    `keepAliveTimeout + keepAliveTimeoutBuffer`, not at `keepAliveTimeout`, and
    not by the 30-second connection sweep. Only the first of the pair is
    advertised, as `Keep-Alive: timeout=5`.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    enforced.
- **`server.maxHeadersCount`** — value re-read: `null`, meaning no override;
  Node documents a default of `2000` for the property.
  - *Behavior seen:* a request carrying 1000 headers reached the callback and got
    the ordinary `200`; 1001 was refused by the parser with
    `431 Request Header Fields Too Large` and the callback never ran. Both header
    blocks were about 5 KB, far below the 16384-byte `http.maxHeaderSize`, so the
    ceiling is count-based and separate from the size limit. The effective
    ceiling is half the documented default because the runtime counts a header's
    name and value as two entries.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    enforced.
- **`server.requestTimeout`** — value re-read: `300000` ms.
  - *Behavior seen:* did not fire, and cannot be made to by withholding a request
    body: a `POST` declaring `Content-Length: 100` and sending none of it still
    received the full `200` immediately, because the callback ends the response
    without reading the request [server.js:6-10]. The connection then went idle
    and was closed by the keep-alive pair above, about six seconds in.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**; not
    exercised by this program.
- **`server.timeout`** — value re-read: `0`.
  - *Behavior seen:* no close attributable to a socket-inactivity limit occurred.
    A connection that was opened and sent nothing at all was closed after about
    71 seconds by the headers timeout, with the same `408` — not by this setting,
    which is `0`.
  - *Evidence class:* **Observed on Node.js 24.19.0 on August 17, 2026**;
    inactive by default.

That closes an item the networking area explicitly left to this document. Two
further readings from the same live object explain why so much of the matrix
belongs to the runtime (**Observed on Node.js 24.19.0 on August 17, 2026**):
the server carried exactly one `request` listener, which is the callback on
line 6 [server.js:6], and zero listeners for the `error`, `upgrade`,
`connect`, `clientError`, `continue`, and `timeout` events. Every empty slot
is a place where the runtime's default is the only behavior, which is
precisely what the `CONNECT`, `Upgrade`, and second-listener cases show.

## Documentation quality checks

The documentation set is checked by three commands a maintainer runs **ad
hoc**. Each is invoked at an exact version through `npx`, and none of them is
a repository dependency: no manifest, lockfile, or tool configuration exists
for any of them, and running them adds none [.:git ls-files]. Before running
any of them, put the package cache and every output path outside the checkout by
executing
[the DevOps cache setup](./devops.md#keep-the-package-cache-outside-the-checkout)
— it creates a private directory, exports `npm_config_cache` beneath it, and
verifies the result with `npm config get cache`, so that checking the
documentation cannot write anything into the repository. Asserting that the cache
is outside the tree is not the same as arranging it: the location comes from the
caller's npm configuration, and the repository sets none [.:git ls-files].

The three versions below were verified against the npm registry on August 17,
2026, and are the versions that produced the results in this section.

Lint every Markdown file in the set:

```bash
npx --yes markdownlint-cli2@0.23.2 "README.md" "docs/areas/*.md"
```

```console
markdownlint-cli2 v0.23.2 (markdownlint v0.41.1)
Finding: README.md docs/areas/*.md
Linting: 9 files
Summary: 0 issues in 0 files
```

- **Observed on Node.js 24.19.0 on August 17, 2026:** run over the complete set,
  the command found all **nine** files, reported **`0 issues`**, and exited
  **`0`**. A zero exit and a `0 issues` summary across the whole set — not one
  file at a time — is the pass criterion, and that is the result recorded here.
- **Observed on Node.js 24.19.0 on August 17, 2026:** it exits non-zero if it
  finds anything, reporting each finding as a file, a line, and a rule
  identifier such as `MD047/single-trailing-newline`. Narrowing the glob to a
  single path is the quicker loop while editing one document, but it is not
  evidence about the set.
- **Absent in the current checkout:** there is no markdownlint configuration
  file, so the tool's built-in defaults are the rule set in force
  [.:git ls-files]. One inline exception exists in the whole set, and it is a
  comment inside the Markdown rather than committed tool configuration: the
  root README exempts itself from the blanks-around-headings rule so that the
  repository's original first two lines stay adjacent, exactly as they were
  written [README.md:1-2]. Nothing else is waived — no line-length rule is
  switched off anywhere, which is why long inventories in this set are laid
  out as nested lists rather than as wide table rows.

Check every link in the set:

```bash
find README.md docs/areas -name '*.md' -print0 \
  | xargs -0 -n1 npx --yes markdown-link-check@3.15.0
```

```bash
npx --yes markdown-link-check@3.15.0 docs/areas/testing-and-quality.md
```

- **Observed on Node.js 24.19.0 on August 17, 2026:** run over the complete set,
  the pipeline checked all **nine** files — printing a `FILE:` heading, one result
  line per link, and a per-file total for each — marked **all 96 links in the set
  good**, and exited **`0`**. It exits non-zero if any link is dead. The second
  form checks a single file and is the quicker loop while editing one document.
- **Observed on Node.js 24.19.0 on August 17, 2026:** it resolves the target
  of a link, not the heading fragment attached to it. A link pointing at a
  file that does exist, with a deliberately invented `#fragment`, was reported
  as good. A passing link check therefore does not prove that a
  cross-document anchor lands anywhere, and anchors have to be confirmed
  against the target document's headings by hand or in a preview.
- **Observed on Node.js 24.19.0 on August 17, 2026:** a relative link to an
  area document that has not been committed yet is reported dead until that
  file lands, which is what makes this check useful while a documentation set
  is being assembled rather than only afterwards.

Validate a Mermaid diagram without a browser preview by rendering its fenced
body outside the checkout. Render into a private directory with an unpredictable
name rather than a fixed path such as `/tmp/diagram.mmd`: on a shared machine a
predictable name in a world-writable directory may already be another user's file
or a symlink to somewhere you did not intend, and writing to it would clobber
that target.

```bash
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
# write one diagram's fenced body into "$WORK_DIR/diagram.mmd", then:
npx --yes @mermaid-js/mermaid-cli@11.16.0 \
  -i "$WORK_DIR/diagram.mmd" -o "$WORK_DIR/diagram.svg"
```

- **Observed on Node.js 24.19.0 on August 17, 2026:**
  `npx --yes @mermaid-js/mermaid-cli@11.16.0 --version` reported `11.16.0`, and
  `mktemp -d` created a caller-owned directory with mode `700`, so no other
  account could read or replace its contents, and the `trap` removed it however
  the shell exited.
- **Observed on Node.js 24.19.0 on August 17, 2026:** every diagram in the set
  was extracted and rendered that way — **seven diagrams found, seven
  rendered successfully, none failed.** They are the system context in
  [the project README](../../README.md), the control flow in
  [application and runtime](./application-runtime.md), the request sequence and
  the network boundary in [networking](./networking.md), the local topology in
  [infrastructure](./infrastructure.md), the manual change-to-run flow in
  [DevOps](./devops.md), and the signal flow in
  [observability](./observability.md). Each exited `0` and printed
  `Generating single mermaid chart`.
- Work through them one at a time: write a fenced body into `diagram.mmd`, check
  the exit status, then overwrite it with the next diagram. The directory goes
  at the end, so nothing is left behind.
- **Observed on Node.js 24.19.0 on August 17, 2026:** the renderer draws through
  a headless browser, and it fails with a non-zero exit if that browser is
  missing from its cache or if it is run as `root`. Both are properties of the
  machine rather than of the command: once the browser was installed into the
  cache the renderer searches by default, and the command was run as an ordinary
  user, the command shown above succeeded unchanged — with no extra option,
  no configuration file, and no environment variable. The diagnosis and the
  one-time setup are recorded in
  [the DevOps area](./devops.md#11-documentation-validation).
- **Absent in the current checkout:** no rendered image and no diagram source
  file is tracked, and validating a diagram must not add one
  [.:git ls-files]. This document contains no diagram, so this check applies
  to the documents that do carry one, not to this file.

The command reference for these three tools, including the browser prerequisite
the diagram renderer needs, is owned by
[the DevOps area](./devops.md#11-documentation-validation). This section
records what the checks are for and what counts as passing.

## Acceptance criteria

A change to this project is **verified** today when all seven statements below
are true. This list is the closest thing the project has to a test suite, and
it is the standard used for the documentation set in this repository.

1. **The runtime is the one you claim.** `node --version` and `npm --version`
   report the exact baseline pair before anything else is run, from a runtime
   installed outside the checkout. The repository pins no version
   [.:git ls-files], so an unstated runtime makes every later result
   unattributable.
2. **The process starts and says so.** `node server.js` binds and prints its
   single readiness line, and standard error stays empty [server.js:12-13].
3. **An ordinary request still gets the source-defined response.** A `GET`
   over loopback returns status `200`, `Content-Type: text/plain`, and the
   14-byte body [server.js:7-9]. This is the only behavior the application
   has, so a change that breaks it breaks everything.
4. **The protocol matrix is unchanged, or it is re-documented.** Every case in
   [the matrix above](#runtime-validation-matrix) still produces its recorded
   result. A case that differs is not automatically a defect — a different
   Node.js build legitimately changes runtime-generated behavior — but it must
   be re-observed, rewritten with the new runtime version, and given a new
   verification date rather than left standing.
5. **The failure paths still fail the same way.** A second process on the
   occupied port still exits non-zero with the unhandled-`error` diagnostic
   and leaves the first process serving [server.js:12-14], and an address
   other than loopback still fails to reach the listener [server.js:3,12].
6. **The documentation checks pass.** The Markdown lint and the link check
   exit zero across the complete set — `README.md` and all eight
   `docs/areas/*.md` files — every one of the seven diagrams renders with a zero
   exit, and no temporary output was written inside the checkout.
7. **Only approved paths changed.** `git status --short` and
   `git diff --name-only` show the documentation files the change was meant to
   touch and nothing else — no probe script, no log, no `node_modules`, no
   package cache, and no rendered diagram.

- **Observed on Node.js 24.19.0 on August 17, 2026:** criteria 1 to 5 are the
  matrix above, and every case in it was executed. Criterion 6 was met in full:
  the lint reported `0 issues` across all nine files and exited zero, the link
  check resolved all 96 links across the same nine files and exited zero, and
  each of the seven diagrams rendered with a zero exit. Because the link checker
  does not verify fragments, each heading fragment was additionally confirmed by
  hand against the headings of the document it points at. Criterion 7 was
  checked while the process was serving and again after every probe had
  finished, each time reporting no unexpected path.
- Criterion 4 is the one that will age. It is written as *re-observe and
  re-date*, not *expect these bytes forever*, because half the matrix is
  runtime-generated and this repository pins no runtime [.:git ls-files].

## Future automated-test approach

Everything in this section is a **Recommendation**. None of it exists, none of
it was created by this documentation change, and no sentence here describes
current behavior. The sections above are the current state; this is a possible
response to it, ordered so that each step is useful before the next is
attempted.

- **Recommendation:** make the checks runnable before making them automatic.
  A test needs a documented way to be invoked, and today there is neither a
  manifest to hold a `test` script nor any other documented entry point
  [.:git ls-files]. Adding one, or agreeing on an exact command, is the
  prerequisite for every item below.
- **Recommendation:** write integration tests, not unit tests. The program
  exports nothing and starts listening when it is evaluated
  [server.js:1-14,12], so the natural shape is: start the process, send a
  request over loopback, assert on the response, stop the process.
- **Recommendation:** use the test runner and HTTP client that ship inside
  Node.js — the `node:test` module and the core `http` module — so that the
  first test adds no third-party dependency. That matters here because the
  program's only dependency today is the runtime itself [server.js:1], and the
  first `npm install` would be a genuine change in kind.
- **Recommendation:** cover four things first, in this order, because they are
  the four the matrix above shows to be load-bearing.
  - Readiness and bind: the process prints its one line and the port becomes
    connectable [server.js:12-13].
  - The ordinary-request response contract: status `200`,
    `Content-Type: text/plain`, and the exact 14-byte body [server.js:7-9].
  - Protocol-case regression: the cases of the matrix that a Node.js upgrade
    could silently change, especially `HEAD` body suppression, the two
    distinct `400` shapes, and the `CONNECT` case that answers with no bytes
    at all.
  - The bind-conflict failure path: a second process fails and the first
    keeps serving [server.js:12-14].
- **Recommendation:** treat coverage as a poor target for this project. Seven
  meaningful lines can be executed by a single request, so a coverage figure
  would read as near-total while asserting almost nothing. The matrix above is
  the more honest measure of what is actually checked.
- **Recommendation:** add a continuous-integration workflow only after at
  least one automated check exists. A pipeline with nothing to run produces a
  green result that means nothing, and there is no pipeline definition in the
  checkout today [.:git ls-files].
- **Recommendation:** attach a listener to the server's `error` event before
  automating any start, so that a failed bind is reported deliberately with an
  intentional exit status instead of as a runtime stack trace
  [server.js:12-14]. Until then, an automated start has to assert on runtime
  diagnostics, which are not stable across Node.js versions. The emitter
  distinction is owned by
  [the observability area](./observability.md#reading-the-two-emitters-apart).
- **Recommendation:** keep the absence list in
  [Current state](#current-state-no-automated-tests-or-quality-tooling) as the
  checklist. Each entry that becomes real should move out of it into a
  current-state section with its own evidence and its own verification date.

## Source map and related areas

Lines this document cites: [server.js:1] for the single core-module import
behind the "no project packages" framing, [server.js:3] and [server.js:4] for
the two network literals in the coverage map, [server.js:6] for the request
callback whose registration explains why an ordinary request is served at all,
[server.js:7], [server.js:8], and [server.js:9] for the three response
operations that every ordinary-request case asserts on, [server.js:10-11] and
[server.js:14] for the closing lines of the two callbacks, [server.js:12] for
the `listen` call behind the start and bind-conflict cases, and
[server.js:13] for the readiness line the start and request-logging cases
measure. Whole-file claims cite [server.js:1-14], absence claims about the
checkout as it stands cite [.:git ls-files], the baseline commit and its file
list cite [.:git log -1 --oneline 1484182] and
[.:git ls-tree -r --name-only 1484182], and the repository's own statement of
purpose is cited as [README.md:2]. The branch this document was written against
is cited as [.git/HEAD:ref], and every absence claim here is scoped to it.
Remote URLs and clone hooks are never cited, because they belong to an
individual clone rather than to tracked content — and a remote URL can carry an
access credential; [the project README](../../README.md#current-checkout)
explains all of that once for the whole set.

Continue reading:

- [The project README](../../README.md) — prerequisites, quick start,
  troubleshooting, terminology, and the map of all area documents.
- [Networking](./networking.md) — the worked protocol observations behind this
  matrix, header by header, including the two distinct `400` responses and the
  full list of runtime defaults.
- [DevOps](./devops.md) — the operator command reference for every command
  named here, the runtime setup, and the absent-CI/CD inventory this document
  measures against.
- [Observability](./observability.md) — the readiness line, the separation of
  application output from runtime diagnostics, and what a `200` does and does
  not prove.
- [Application and runtime](./application-runtime.md) — the line-by-line
  source walkthrough that the coverage map above indexes.
