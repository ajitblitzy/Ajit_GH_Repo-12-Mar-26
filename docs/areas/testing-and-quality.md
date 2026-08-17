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

<!-- markdownlint-disable MD013 -->

| Item | Value | Evidence |
| --- | --- | --- |
| Documentation baseline branch | `17-Aug-2026-Br1` | [.git/HEAD:ref] |
| Documentation baseline commit | `1484182` | [.:git rev-parse HEAD] |
| Tracked files at that commit | `README.md` and `server.js`, nothing else | [.:git ls-files] |
| Runtime used for every observed result below | Node.js 24.19.0, with the npm 11.17.0 that ships inside it, verified on August 17, 2026 | Observed on Node.js 24.19.0 on August 17, 2026 |
| HTTP parser inside that runtime | llhttp 9.4.3, as reported by `process.versions.llhttp` | Observed on Node.js 24.19.0 on August 17, 2026 |
| Runtime version declared by the repository | None | [.:git ls-files] |
| Automated tests in the repository | None | [.:git ls-files] |

<!-- markdownlint-enable MD013 -->

The repository pins no runtime: it tracks no `package.json`, lockfile,
`.nvmrc`, `.node-version`, or `.tool-versions` file [.:git ls-files]. Node.js
24.19.0 was therefore chosen externally so that this document could report
something exact, and it is not a repository requirement. Every result below
was produced by running the code under that build on that date. Results from
any other Node.js build are not reported here, because a protocol detail or a
default limit can differ between versions and a matrix that mixes runtimes
cannot be re-run against either of them.

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
  over a real socket is an integration test, and it is the only kind of test
  that could reach this program's behavior at all — the reason is in
  [Current state](#current-state-no-automated-tests-or-quality-tooling).
- A *test runner* is the program that finds test files, executes them, and
  reports which passed. Node.js has one built in, exposed as the `node:test`
  module; Jest, Vitest, and Mocha are third-party alternatives.
- *Coverage* is the proportion of source lines or branches that a test run
  actually executed, measured by a coverage tool. It says what was exercised,
  not whether the assertions were meaningful.
- A *pass criterion* is what a check is required to produce. An *observed
  result* is what it did produce. This document keeps them in separate
  columns so that a drifting runtime is visible rather than hidden.
- An *acceptance criterion* is a statement that must be true before a change
  is considered finished.
- A *regression* is a change that breaks behavior which previously worked. A
  regression test is one kept specifically to catch that.
- A *lint* is a static check of a file against style and consistency rules,
  performed without running it. A *link check* is the narrower check that
  every link in a document resolves to something that exists.

## Current state: no automated tests or quality tooling

Every row below is **Absent in the current checkout**. The status column
repeats the label deliberately, so that no row can be skimmed as though it
described something that exists. Nothing here was created in order to be
documented.

<!-- markdownlint-disable MD013 -->

| Capability | Status | Evidence |
| --- | --- | --- |
| A test directory of any conventional name — `test/`, `tests/`, `__tests__/` | Absent in the current checkout | No such path is tracked [.:git ls-files] |
| A test file of any conventional name — `*.test.js`, `*.spec.js`, and the `.mjs` and `.cjs` variants | Absent in the current checkout | No such path is tracked [.:git ls-files] |
| Test-runner configuration — Jest, Vitest, Mocha, AVA, or Karma | Absent in the current checkout | No runner configuration file is tracked [.:git ls-files] |
| Coverage configuration — nyc, c8, or a coverage-service file | Absent in the current checkout | No coverage configuration is tracked [.:git ls-files] |
| A package manifest or lockfile | Absent in the current checkout | Neither `package.json` nor any lockfile is tracked [.:git ls-files] |
| A linter or formatter configuration — ESLint, Prettier, or EditorConfig | Absent in the current checkout | No such configuration is tracked [.:git ls-files] |
| Documentation-tool configuration — a markdownlint or link-check configuration file | Absent in the current checkout | No such configuration is tracked [.:git ls-files] |
| Continuous integration | Absent in the current checkout | There is no `.github` directory at all — not an empty one — and no other pipeline definition is tracked [.:git ls-files] |
| A committed test fixture, sample payload, or recorded response | Absent in the current checkout | No fixture path is tracked [.:git ls-files] |
| A project Git hook that enforces a check | Absent in the current checkout | The only hooks in a clone are the Git LFS hooks that Git installs itself; no project hook is tracked, and hooks would not travel with the repository even if one were added by hand [.git/hooks] |

<!-- markdownlint-enable MD013 -->

Two consequences of that table are worth stating plainly rather than leaving
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
- The practical consequence is that any test of this program has to be an
  integration test: start the process, talk to it over a socket, and assert
  on the response. That is exactly the shape of the matrix below.

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

That is a deliberate resolution, not an omission. The project's single
user-specified rule, *Document code*, pairs a documentation deliverable with
a terse expectation of validation. Read as an instruction to add tests, it
would produce source artifacts in a change whose entire scope is
documentation; read as an instruction to validate, it is satisfied by
executing the behavior matrix and the documentation checks and recording what
they produced. This document takes the second reading, and the paragraph you
are reading is where that decision is written down.

Three rules follow from it and are enforced throughout this file:

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

<!-- markdownlint-disable MD013 -->

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

<!-- markdownlint-enable MD013 -->

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
  this file, which is why the matrix below has a column for who defines the
  result. The rule behind that split is stated in
  [the application and runtime area](./application-runtime.md#application-versus-runtime-boundary).

## Runtime validation matrix

This is the project's acceptance table. Each row was exercised against a
running process under the runtime named in the baseline above, and the
observed result is what that exercise produced. Ordinary requests used Node's
built-in `http` client, so reproducing them needs nothing beyond the runtime
itself. The protocol cases that no client library will send were written byte
by byte over a TCP socket from a temporary `node:net` script; every script,
log, and cache stayed outside the checkout, and none of them was committed
[.:git ls-files].

The table is deliberately a matrix and not a transcript. Complete worked
responses, header by header, are owned by
[the networking area](./networking.md#protocol-and-method-matrix), and the
operator commands are owned by
[the DevOps area](./devops.md#5-start-verify-stop-and-restart). What this
table adds is the pass criterion beside the result, so that a re-run on a
future runtime can be judged rather than merely compared.

<!-- markdownlint-disable MD013 -->

| Case | Method | Pass criterion | Observed result on Node.js 24.19.0 | Evidence class |
| --- | --- | --- | --- | --- |
| Runtime identity | `node --version` and `npm --version` | Exactly `v24.19.0` and `11.17.0`, from a runtime installed outside the checkout | Both reported exactly those values; the resolved `node` binary was the isolated install, not the unrelated build already on the host | Observed on Node.js 24.19.0 on August 17, 2026; the repository pins no version [.:git ls-files] |
| Start and readiness | `node server.js` from the checkout root, both streams captured outside it | The process binds and prints the readiness line once, after a successful bind [server.js:12-13] | Standard output was 41 bytes and exactly one line, `Server running at http://127.0.0.1:3000/`; standard error was 0 bytes; the host reported exactly one listening socket, `127.0.0.1:3000`, owned by `<pid>` | Observed on Node.js 24.19.0 on August 17, 2026; criterion Source-defined [server.js:12-13] |
| Ordinary HTTP/1.1 `GET`, `POST`, `OPTIONS` | Built-in `http` client; seven requests across `/`, `/anything/else`, and `/?q=1&x=2`, two of them carrying a request body | Each reaches the callback and returns the source-defined status, content type, and body [server.js:6-10] | Every one returned `200 OK`, `Content-Type: text/plain`, `Content-Length: 14`, and the 14-byte body `Hello, World!` plus a newline. Across the seven, the number of distinct status–content-type–body combinations was 1. Neither a `Server` nor an `X-Powered-By` header was sent | Observed on Node.js 24.19.0 on August 17, 2026; criterion Source-defined [server.js:7-9] |
| `HEAD` | Built-in `http` client, on `/` and on `/anything/else` | The callback runs unchanged; whether the body and its length survive is the runtime's decision, and is recorded rather than assumed | `200 OK` with `Content-Type` and `Date`, but **no body and no `Content-Length`**, even though the callback ends the response with a 14-byte body [server.js:9] | Observed on Node.js 24.19.0 on August 17, 2026; suppression is runtime-defined |
| `CONNECT` | Raw `node:net` probe, with a 15-second client budget | Record whatever the runtime does; this is not ordinary callback behavior and must not be described as such | **Zero response bytes.** The server closed the connection about four milliseconds after the request, sending no status line at all. The generous client budget confirms the server ended it, not the client | Observed on Node.js 24.19.0 on August 17, 2026; runtime-defined, and no `connect` listener exists [server.js:1-14] |
| HTTP/1.1 `Upgrade` | Raw `node:net` probe with `Connection: Upgrade`, `Upgrade: websocket`, and the WebSocket key and version headers | Record which path the runtime chooses when no `upgrade` listener is registered | Routed to the **ordinary callback**: `200 OK`, `Content-Type: text/plain`, `Connection: keep-alive`, `Keep-Alive: timeout=5`, `Content-Length: 14`, and the usual body. No `101` and no protocol switch; the idle connection was then closed after about six seconds | Observed on Node.js 24.19.0 on August 17, 2026; routing runtime-defined, response Source-defined [server.js:7-9] |
| Unknown or malformed method token | Raw `node:net` probe, three variants: the unrecognized token `FROBNICATE`, the invalid token `GE(T`, and a request line that is not HTTP at all | The parser rejects the request before any application handling, and the callback never runs | All three produced a byte-identical 47-byte reply — `HTTP/1.1 400 Bad Request` with `Connection: close`, **no `Date` and no `Content-Length`** — followed immediately by connection close | Observed on Node.js 24.19.0 on August 17, 2026; runtime-defined, and no code here influences it [server.js:1-14] |
| HTTP/1.1 without a `Host` header | Raw `node:net` probe: a valid request line and an immediate blank line | Rejection again, and recorded separately because it happens at a different stage | A **different** 117-byte `400 Bad Request`: `Connection: close`, then `Date`, then `Transfer-Encoding: chunked` and an empty chunked body, then close | Observed on Node.js 24.19.0 on August 17, 2026; runtime-defined [server.js:1-14] |
| HTTP/1.0 `GET` | Raw `node:net` probe, twice: once with no `Host`, once with `Host` and `Connection: keep-alive` | Record the connection and automatic-header differences from HTTP/1.1 | Both reached the callback and returned 115 bytes: `200 OK` **answered as `HTTP/1.1`**, with `Content-Type`, `Date`, `Connection: close`, **no `Content-Length`** — the body framed by the close instead — and no `Keep-Alive` header. The keep-alive request was not honored | Observed on Node.js 24.19.0 on August 17, 2026; version and framing runtime-defined, response content Source-defined [server.js:7-9] |
| Request header block above the runtime limit | Raw `node:net` probe with one 20 000-byte header | Record the limit as the runtime's, because the application declares none [server.js:1-14] | `HTTP/1.1 431 Request Header Fields Too Large` with `Connection: close`, 67 bytes, then close. The callback never ran | Observed on Node.js 24.19.0 on August 17, 2026; runtime-defined |
| Second listener on port 3000 | A second `node server.js` while the first held the socket, with both streams captured | The second process must not start, and the first must keep serving; the diagnostic is expected to come from the runtime because no server `error` listener exists [server.js:12-14] | The second process wrote 0 bytes to standard output — no readiness line — wrote 648 bytes to standard error as an unhandled `error` event reporting `EADDRINUSE` for `127.0.0.1:3000`, and exited with status `1`. The first process was unaffected: still one listening socket, and a follow-up request still returned `200` with the same body | Observed on Node.js 24.19.0 on August 17, 2026; criterion Source-defined [server.js:12-14] |
| Reachability boundary | Raw TCP connect to port 3000 on every address the host exposes, plus `localhost` and the host's own machine name | Loopback reaches the listener; nothing else does, because of the bind address [server.js:3,12] | `127.0.0.1` connected, and the name `localhost` connected by falling back to its IPv4 entry. The IPv6 loopback address and all six non-loopback interface addresses on this host were refused, and the machine name timed out. Exact addresses are not published because they belong to one machine | Observed on Node.js 24.19.0 on August 17, 2026; criterion Source-defined [server.js:3,12] |
| Request logging | Snapshot the captured standard output, run the whole matrix above, snapshot it again | No application request log appears, and runtime standard error stays a separate emitter [server.js:6-13] | Standard output was 41 bytes and one line before, and 41 bytes and one line after: a difference of **0 bytes**. Standard error stayed at 0 bytes throughout, and no file was created anywhere in the checkout while the process served traffic | Observed on Node.js 24.19.0 on August 17, 2026; criterion Source-defined [server.js:6-10] |
| Termination | `SIGINT` to the process, then re-probe; repeated with `SIGTERM` | The process ends and releases the socket; no application shutdown output can appear, because no signal handler and no graceful-close call exists [server.js:1-14] | Both requests ended the process immediately. Captured standard output was still 41 bytes and one line, standard error still 0 bytes, and no numeric exit code was surfaced — the process was ended by the signal. Afterwards the host reported no listener on port 3000 and a fresh client attempt was refused | Observed on Node.js 24.19.0 on August 17, 2026; criterion Source-defined [server.js:1-14] |

<!-- markdownlint-enable MD013 -->

### Three rows that are easy to misread

- **`CONNECT` returns nothing, not an error.** A client that waits for a
  status line gets none; it learns only that the connection closed
  (**Observed on Node.js 24.19.0 on August 17, 2026**). Do not record this row
  as a `400` or a `501` on a re-run without re-reading the bytes.
- **The `Upgrade` row looks like a success and is not one.** A WebSocket
  client that only checks for a `2xx` would treat that `200` as progress,
  while no protocol switch happened at all
  (**Observed on Node.js 24.19.0 on August 17, 2026**).
- **A `200` is not a health result.** The callback sets the same status,
  header, and body for every request it receives without reading the request
  at all [server.js:6-10], so a `200` proves that the listener accepted a
  connection and nothing more. What a `200` does and does not prove is owned
  by
  [the observability area](./observability.md#what-a-200-proves-and-what-it-does-not),
  and nowhere in this document is that response called a health check.

### Runtime defaults: what was read, and what was seen to act

Reading a configured value proves it is set. Watching it act proves it is
enforced, and the two are recorded separately here. All thirteen server and
parser defaults tabulated by
[the networking area](./networking.md#timeouts-and-other-runtime-defaults)
were re-read off the live server object that `server.js` creates
[server.js:6,12] and matched that table exactly
(**Observed on Node.js 24.19.0 on August 17, 2026**); they are not copied
again here. The four below are the ones whose *behavior* this document owns,
because they decide when a connection ends.

<!-- markdownlint-disable MD013 -->

| Runtime default | Value re-read | Behavior seen | Evidence class |
| --- | --- | --- | --- |
| `server.headersTimeout` | `60000` ms | A client sent a header block and never sent the blank line that ends it. About 71 seconds later the runtime answered `HTTP/1.1 408 Request Timeout` with `Connection: close` and closed — the 60-second limit surfacing through the 30-second connection sweep. The callback never ran | Observed on Node.js 24.19.0 on August 17, 2026; enforced |
| `server.keepAliveTimeout` | `5000` ms | After a complete exchange the client held the connection open and sent nothing. The runtime closed it about six seconds later. This is the value advertised as `Keep-Alive: timeout=5` | Observed on Node.js 24.19.0 on August 17, 2026; enforced |
| `server.requestTimeout` | `300000` ms | Did not fire, and cannot be made to by withholding a request body: a `POST` declaring `Content-Length: 100` and sending none of it still received the full `200` immediately, because the callback ends the response without reading the request [server.js:6-10]. The connection then went idle and was closed by the keep-alive timeout above, about six seconds in | Observed on Node.js 24.19.0 on August 17, 2026; not exercised by this program |
| `server.timeout` | `0` | No close attributable to a socket-inactivity limit occurred. A connection that was opened and sent nothing at all was closed after about 71 seconds by the headers timeout, with the same `408` — not by this setting, which is `0` | Observed on Node.js 24.19.0 on August 17, 2026; inactive by default |

<!-- markdownlint-enable MD013 -->

That closes an item the networking area explicitly left to this document. Two
further readings from the same live object explain why so much of the matrix
belongs to the runtime (**Observed on Node.js 24.19.0 on August 17, 2026**):
the server carried exactly one `request` listener, which is the callback on
line 6 [server.js:6], and zero listeners for the `error`, `upgrade`,
`connect`, `clientError`, `continue`, and `timeout` events. Every empty slot
is a place where the runtime's default is the only behavior, which is
precisely what the `CONNECT`, `Upgrade`, and second-listener rows show.

## Documentation quality checks

The documentation set is checked by three commands a maintainer runs **ad
hoc**. Each is invoked at an exact version through `npx`, and none of them is
a repository dependency: no manifest, lockfile, or tool configuration exists
for any of them, and running them adds none [.:git ls-files]. Point the
package cache and every output path outside the checkout before you start, so
that checking the documentation cannot change the repository.

The three versions below were verified against the npm registry on August 17,
2026, and are the versions that produced the results in this section.

Lint every Markdown file in the set:

```bash
npx --yes markdownlint-cli2@0.23.2 "README.md" "docs/areas/*.md"
```

- **Observed on Node.js 24.19.0 on August 17, 2026:** the tool identified
  itself as `markdownlint-cli2 v0.23.2 (markdownlint v0.41.1)`, printed the
  glob it had expanded and the number of files it found, and reported each
  finding as a file, a line, and a rule identifier such as
  `MD047/single-trailing-newline`. It exits non-zero if it finds anything, so
  a zero exit and a `0 issues` summary is the pass criterion.
- **Observed on Node.js 24.19.0 on August 17, 2026:** narrowed to this
  document alone, `npx --yes markdownlint-cli2@0.23.2
  "docs/areas/testing-and-quality.md"` reported no findings and exited zero,
  which is the state every file in the set is expected to be kept in.
- **Absent in the current checkout:** there is no markdownlint configuration
  file, so the tool's built-in defaults are the rule set in force
  [.:git ls-files]. Long table rows in this document are bracketed by
  `markdownlint` disable and enable comments for the line-length rule
  specifically, which is why they pass without a configuration file.

Check every link in the set:

```bash
find README.md docs/areas -name '*.md' -print0 \
  | xargs -0 -n1 npx --yes markdown-link-check@3.15.0
```

```bash
npx --yes markdown-link-check@3.15.0 docs/areas/testing-and-quality.md
```

- **Observed on Node.js 24.19.0 on August 17, 2026:** the tool prints one
  result line per link, a total count, and exits non-zero if any link is dead.
  The second form checks a single file and is the quicker loop while editing
  one document.
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
body to a temporary file outside the checkout:

```bash
npx --yes @mermaid-js/mermaid-cli@11.16.0 -i /tmp/diagram.mmd -o /tmp/diagram.svg
```

- **Observed on Node.js 24.19.0 on August 17, 2026:**
  `npx --yes @mermaid-js/mermaid-cli@11.16.0 --version` reported `11.16.0`,
  and a render of one diagram exited zero and printed
  `Generating single mermaid chart`. The tool renders through a headless
  browser, so one must be available to it; pointed at a browser already
  installed on the machine through the `PUPPETEER_EXECUTABLE_PATH`
  environment variable, it succeeded, and without one it exits non-zero and
  says it could not find a headless browser.
- Copy one diagram's fenced body into the temporary `.mmd` file at a time,
  check the exit status, overwrite it with the next diagram, and delete both
  temporary files when you are done.
- **Absent in the current checkout:** no rendered image and no diagram source
  file is tracked, and validating a diagram must not add one
  [.:git ls-files]. This document contains no diagram, so this check applies
  to the documents that do carry one, not to this file.

The command reference for these three tools, including the Windows PowerShell
forms and the exact failure text of the diagram renderer, is owned by
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
4. **The protocol matrix is unchanged, or it is re-documented.** Every row of
   [the matrix above](#runtime-validation-matrix) still produces its recorded
   result. A row that differs is not automatically a defect — a different
   Node.js build legitimately changes runtime-generated behavior — but it must
   be re-observed, rewritten with the new runtime version, and given a new
   verification date rather than left standing.
5. **The failure paths still fail the same way.** A second process on the
   occupied port still exits non-zero with the unhandled-`error` diagnostic
   and leaves the first process serving [server.js:12-14], and an address
   other than loopback still fails to reach the listener [server.js:3,12].
6. **The documentation checks pass.** The Markdown lint and the link check
   exit zero across `README.md` and every `docs/areas/*.md` file, each diagram
   renders, and no temporary output was written inside the checkout.
7. **Only approved paths changed.** `git status --short` and
   `git diff --name-only` show the documentation files the change was meant to
   touch and nothing else — no probe script, no log, no `node_modules`, no
   package cache, and no rendered diagram.

- **Observed on Node.js 24.19.0 on August 17, 2026:** criteria 1 to 5 are the
  matrix above, and every row in it was executed. For criterion 6, all three
  documentation commands were run: the lint reported no findings for this
  document and every link in it resolved, and because the link checker does
  not verify fragments, each heading fragment was confirmed by hand against
  the headings of the document it points at. Criterion 7 was checked while the
  process was serving and again after every probe had finished, each time
  reporting no unexpected path.
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
  - Protocol-case regression: the rows of the matrix that a Node.js upgrade
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
- **Recommendation:** keep the absence table in
  [Current state](#current-state-no-automated-tests-or-quality-tooling) as the
  checklist. Each row that becomes real should move out of it into a
  current-state section with its own evidence and its own verification date.

## Source map and related areas

Lines this document cites: [server.js:1] for the single core-module import
behind the "no project packages" framing, [server.js:3] and [server.js:4] for
the two network literals in the coverage map, [server.js:6] for the request
callback whose registration explains why an ordinary request is served at all,
[server.js:7], [server.js:8], and [server.js:9] for the three response
operations that every ordinary-request row asserts on, [server.js:10-11] and
[server.js:14] for the closing lines of the two callbacks, [server.js:12] for
the `listen` call behind the start and bind-conflict rows, and
[server.js:13] for the readiness line the start and request-logging rows
measure. Whole-file claims cite [server.js:1-14], checkout-wide absence claims
cite [.:git ls-files], the hook finding cites [.git/hooks], the baseline cites
[.git/HEAD:ref] and [.:git rev-parse HEAD], and the repository's own statement
of purpose is cited as [README.md:2].

Continue reading:

- [The project README](../../README.md) — prerequisites, quick start,
  troubleshooting, terminology, and the map of all area documents.
- [Networking](./networking.md) — the worked protocol observations behind this
  matrix, header by header, including the two distinct `400` responses and the
  full table of runtime defaults.
- [DevOps](./devops.md) — the operator command reference for every command
  named here, the runtime setup, and the absent-CI/CD inventory this document
  measures against.
- [Observability](./observability.md) — the readiness line, the separation of
  application output from runtime diagnostics, and what a `200` does and does
  not prove.
- [Application and runtime](./application-runtime.md) — the line-by-line
  source walkthrough that the coverage map above indexes.
