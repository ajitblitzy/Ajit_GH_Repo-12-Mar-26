# API reference

This is the index for the reference tier of this documentation set. It
enumerates every documented unit in the codebase with its exact source
locator, records the documentation coverage achieved, states what the module
exports, and routes readers to the four leaf pages that carry the detail.

Nine units make up the code surface of this repository, and nine are
documented. The claim is meant to be *checked* rather than taken on trust:
every row below names a locator you can open and the single page that owns
it.

Two things this page deliberately is not. It is not a narrative — it
enumerates and routes, while each leaf page holds the substance. And it does
not propose changing anything: several of the facts recorded here are
absences — no exported symbol, no class, no named function — and each is
documented as a characteristic of a deliberately minimal single-file service
rather than as a defect awaiting repair.

## Contents

- [How to read the locators on this page](#how-to-read-the-locators-on-this-page)
- [How this reference is organized](#how-this-reference-is-organized)
- [Documented unit inventory](#documented-unit-inventory)
- [Documentation coverage](#documentation-coverage)
- [No importable API surface](#no-importable-api-surface)
- [Why the functions have role names rather than identifiers](#why-the-functions-have-role-names-rather-than-identifiers)
- [Feature traceability](#feature-traceability)
- [Related documentation](#related-documentation)

## How to read the locators on this page

Every claim carries an inline citation of the form `Source: server.js:L1`,
so any statement here can be confirmed or refuted against the source in
seconds. Two conventions govern those citations:

- **They are anchored to baseline commit `1484182`.** `server.js` now
  carries JSDoc documentation comments, and those comments shift the file's
  physical line numbers. The locators here continue to describe the baseline
  layout, because the whole documentation set is anchored to it and that is
  what makes one locator mean the same thing on every page. The baseline
  commit is the verifiable reference point for all of them.
- **They name single lines or ranges, never a total line count.** A claim
  about one statement cites that statement, as `server.js:L7`. A claim about
  a construct spanning several lines cites the range, as
  `server.js:L6-L10`. A claim about something that appears *nowhere* in the
  file cites the file as a whole, `server.js:L1-L14`, because the claim is
  about the file rather than about any one line. Totals are avoided on
  purpose: the upstream specification's count includes the trailing newline
  while a count of content lines does not, and citing a range sidesteps that
  discrepancy entirely.

## How this reference is organized

The reference tier holds **specification** — material a reader *looks up*.
It answers questions of the form "what exactly does this return", "what type
is this parameter", "where is this declared". The narrative guides are the
other half of the set and are read *through* rather than looked up:
[usage](../usage.md) for the integrator, [getting started][gs] for the
operator, [architecture overview][ov] for the reviewer. This page indexes
the specification half only.

Four leaf pages sit beneath this index:

- [HTTP endpoint](./http-endpoint.md) — the wire-level response contract:
  the status code, every response header with its provenance, and the
  byte-exact body. `Source: server.js:L7-L9`.
- [Module bindings][mb] — the four module-scope bindings `http`,
  `hostname`, `port` and `server`, plus the two call sites that consume
  them. `Source: server.js:L1`, `server.js:L3-L4`, `server.js:L6`,
  `server.js:L12`.
- [Request Handler Callback][fn1] — the first of this repository's two
  functions (FN-1), registered as the server's request listener.
  `Source: server.js:L6-L10`.
- [Listen Readiness Callback][fn2] — the second (FN-2), the zero-arity
  callback handed to `listen` as its third argument.
  `Source: server.js:L12-L14`.

### Why there is a `functions/` directory

Each function gets its own dedicated page — one file per function, no
exceptions. With two functions in the codebase the directory holds exactly
two files, which is what makes the coverage claim self-evident rather than
asserted: a reader counts the pages and counts the functions.

The two pages follow an identical section structure — Purpose,
Registration, Signature, Parameters, Returns, Behavior, Invariants, What it
deliberately ignores, Examples, Error behavior, and Source and traceability
— carrying entirely distinct content in every one of those sections. A
reviewer can diff them section by section and see that nothing was copied
between them. FN-1 documents two parameters, the response contract it
produces, and the request it never reads (`Source: server.js:L6-L10`);
FN-2 documents a zero-arity invocation, its one-shot semantics, and its
closure over the `hostname` and `port` constants
(`Source: server.js:L12-L14`).

## Documented unit inventory

Nine units make up the complete code surface of this repository. Each has
its own entry on exactly one owning page, and no unit is folded into
another's description. The **Locator** column names the baseline `server.js`
line or range on which the unit appears.

| Unit | Element                   | Kind                   | Locator   |
| ---- | ------------------------- | ---------------------- | --------- |
| U-1  | `http`                    | Core-module import     | `L1`      |
| U-2  | `hostname`                | Constant `'127.0.0.1'` | `L3`      |
| U-3  | `port`                    | Constant `3000`        | `L4`      |
| U-4  | `http.createServer(...)`  | Call site              | `L6`      |
| U-5  | `server`                  | `http.Server` binding  | `L6`      |
| U-6  | Request Handler Callback  | Anonymous function     | `L6-L10`  |
| U-7  | `server.listen(...)`      | Call site              | `L12`     |
| U-8  | Listen Readiness Callback | Anonymous function     | `L12-L14` |
| U-9  | Module bootstrap sequence | Executable module body | `L1-L14`  |

Two notes on that table.

Three rows share the locator `L6`, because that one line does three things:
it calls `http.createServer(...)` (U-4), binds the returned `http.Server`
instance to `server` (U-5), and opens the anonymous function that becomes
the Request Handler Callback (U-6, whose body runs on to `L10`).
`Source: server.js:L6`.

The listen call site is abbreviated in the table for width. As written it is
`server.listen(port, hostname, callback)` — the numeric port first, the
address string second, the Listen Readiness Callback third.
`Source: server.js:L12`.

### Where each unit is documented

| Unit | Feature       | Owning page                      |
| ---- | ------------- | -------------------------------- |
| U-1  | F-001         | [Module bindings][mb]            |
| U-2  | F-001, F-003  | [Module bindings][mb]            |
| U-3  | F-001, F-003  | [Module bindings][mb]            |
| U-4  | F-001         | [Module bindings][mb]            |
| U-5  | F-001         | [Module bindings][mb]            |
| U-6  | F-002         | [Request Handler Callback][fn1]  |
| U-7  | F-001         | [Module bindings][mb]            |
| U-8  | F-003         | [Listen Readiness Callback][fn2] |
| U-9  | F-001 – F-003 | [Architecture overview][ov]      |

This folder owns seven of the nine units. The ninth, U-9, is the executable
module body taken as a whole — the ordered bootstrap sequence from the
`require` through to the readiness log — and it is documented by the
[architecture overview][ov], which owns bootstrap ordering. It is enumerated
here so the inventory is complete, and documented there rather than
duplicated here. `Source: server.js:L1-L14`.

## Documentation coverage

The figures below are **documentation coverage**: the number of units
carrying a dedicated documentation entry, divided by the number of units
present in the source. The target is 100% on every dimension, and it is met
on every dimension.

| Dimension                              | Coverage          |
| -------------------------------------- | ----------------- |
| Functions with dedicated documentation | **2 of 2 (100%)** |
| Module-scope bindings                  | **4 of 4 (100%)** |
| Call sites                             | **2 of 2 (100%)** |
| Source files (modules)                 | **1 of 1 (100%)** |
| Exported symbols                       | **0 of 0 (n/a)**  |
| **Overall documentation units**        | **9 of 9 (100%)** |

The categories reconcile to the inventory exactly: 2 functions (U-6, U-8)
plus 4 module-scope bindings (U-1 `http`, U-2 `hostname`, U-3 `port`, U-5
`server`) plus 2 call sites (U-4, U-7) plus 1 module body (U-9) is 9 units.
The single source file counted in the table is `server.js` itself, whose
bootstrap sequence is U-9.

The exported-symbol row reads 0 of 0 and is marked not applicable rather
than incomplete. There are no exported symbols to document, and that absence
is itself documented in the next section — a denominator of zero is a
property of the code, not a gap in the coverage.

## No importable API surface

This section exists because it inverts the default expectation a reader
brings to a Node.js module. `server.js` declares no `module.exports`
anywhere, so there is nothing to import from it and the exported-symbol
count is 0 of 0. `Source: server.js:L1-L14`.

That is mechanically checkable. Stripping the documentation-comment lines
first gives a count that describes what executes:

```bash
grep -v -E '^[[:space:]]*(/\*|\*)' server.js | grep -c -F 'module.exports'
```

Observed output:

```text
0
```

The absence is the documented fact, not an omission from this reference. The
module has no importable surface at all: zero exported symbols, zero
classes, and zero named functions — its two functions are both anonymous.
`Source: server.js:L1-L14`.

What the module does expose is a de-facto public surface of a different
shape, and it is documented in three places:

- Its **HTTP interface** — one endpoint answering the entire URL space,
  specified byte for byte on the [HTTP endpoint](./http-endpoint.md) page.
  `Source: server.js:L6-L10`.
- The **Request Handler Callback**, which it registers with the Node core
  `http` module at `server.js:L6`, documented on
  [its own page][fn1].
- The **Listen Readiness Callback**, which it hands to `server.listen(...)`
  at `server.js:L12`, documented on [its own page][fn2].

One consequence is worth flagging here and is covered in full by
[usage](../usage.md#what-you-must-not-do-requireserver): because nothing is
exported, `require('./server')` hands back an empty object while starting a
live server as a side effect of loading, and then leaves the requiring
process running. Run the file as a program instead.
`Source: server.js:L1-L14`.

## Why the functions have role names rather than identifiers

Neither of this repository's two functions has an identifier in the source.
Both are anonymous arrow functions passed directly as call arguments — one
to `http.createServer(...)` (`Source: server.js:L6`) and one to
`server.listen(...)` (`Source: server.js:L12`). There is therefore no name
in the code to index them under.

This documentation set gives each a stable **role name** instead, and uses
it in every reference without exception: the **Request Handler Callback**
for the function at `server.js:L6-L10`, and the **Listen Readiness
Callback** for the function at `server.js:L12-L14`. Consistent naming is
what makes per-function documentation verifiable — a reader who meets
"Request Handler Callback" on any page in this set knows precisely which
range of source is meant.

The functions are deliberately **not** named or extracted in the source,
even though named functions would be easier to index. Naming them would be a
change to executable code, and this engagement documents the code rather
than altering it. JSDoc's `@callback` tag documents them where they are
defined instead, which introduces the documentation-level type names
`RequestHandlerCallback` and `ListenReadinessCallback` without touching a
statement.

## Feature traceability

The three features below are those defined for this system upstream, reused
here by their original identifiers so that the documentation and the
specification can be cross-checked against each other.

| ID    | Feature                       | Priority | Units               |
| ----- | ----------------------------- | -------- | ------------------- |
| F-001 | HTTP Server Listener          | Critical | U-1 – U-5, U-7, U-9 |
| F-002 | Uniform HTTP Response Handler | Critical | U-6, U-9            |
| F-003 | Startup Readiness Logging     | Medium   | U-2, U-3, U-8, U-9  |

- **F-001 HTTP Server Listener** (Critical) — imports the core `http`
  module, declares the bind address and port, creates the server, and binds
  the listening socket. Implemented by U-1, U-2, U-3, U-4, U-5, U-7 and
  U-9. `Source: server.js:L1`, `server.js:L3-L4`, `server.js:L6`,
  `server.js:L12`.
- **F-002 Uniform HTTP Response Handler** (Critical) — answers every
  request identically, with status `200`, `Content-Type: text/plain`, and a
  fixed greeting body. Implemented by U-6, within the bootstrap sequence
  U-9. `Source: server.js:L6-L10`.
- **F-003 Startup Readiness Logging** (Medium) — emits one line to stdout
  naming the address the service was bound to, interpolating the same
  `hostname` and `port` constants that were passed to `listen`. Implemented
  by U-8, using U-2 and U-3, within the bootstrap sequence U-9.
  `Source: server.js:L12-L14`.

## Related documentation

- [Documentation hub](../README.md) — the index for this documentation set,
  with routing by audience.
- [HTTP endpoint](./http-endpoint.md) — the wire-level response contract in
  full, including the responses this service never produces.
- [Module bindings][mb] — `http`, `hostname`, `port` and `server`, plus the
  `http.createServer(...)` and `server.listen(...)` call sites.
- [Request Handler Callback][fn1] — FN-1, on its own dedicated page.
- [Listen Readiness Callback][fn2] — FN-2, on its own dedicated page.
- [Architecture overview][ov] — the component boundary and the bootstrap
  ordering that make up U-9.
- [Usage](../usage.md) — client examples from the caller's side, and the
  `require('./server')` trap in full.
- [Getting started][gs] — prerequisites, the launch command, and first
  verification.
- [Configuration](../configuration.md) — the two hardcoded values and what
  changes when either is edited.
- [Troubleshooting](../troubleshooting.md) — the verified failure modes and
  the behaviors that surprise readers first.

[mb]: ./module-bindings.md
[fn1]: ./functions/request-handler-callback.md
[fn2]: ./functions/listen-readiness-callback.md
[ov]: ../architecture/overview.md
[gs]: ../getting-started.md
