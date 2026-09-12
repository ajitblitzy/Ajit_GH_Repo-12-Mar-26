# API reference

This is the index for the reference tier of this documentation set. It
[enumerates every documented unit](#documented-unit-inventory) in the
codebase with its exact source locator, records the
[documentation coverage](#documentation-coverage) achieved, states
[what the module exports](#no-importable-api-surface), and
[routes readers](#how-this-reference-is-organized) to the four leaf pages
that carry the detail.

Nine units make up the code surface of this repository, and nine are
documented. `Source: server.js:L1-L14`. The claim is meant to be *checked*
rather than taken on trust, so the [inventory](#documented-unit-inventory)
below sets it out in two paired tables keyed by the **Unit** column: the
first gives each unit's element, kind and source locator, the second the
feature it implements and the single page that owns its entry. Every unit
appears exactly once in each, so a unit's full entry is its row in the first
table read together with its row in the second.

Two things this page deliberately is not. It is not a narrative — it
enumerates and routes, while each leaf page holds the substance. And it does
not propose changing anything: several of the facts recorded here are
absences — no exported symbol, no class, no named function
(`Source: server.js:L1-L14`) — and each is documented as a characteristic of
a deliberately minimal single-file service rather than as a defect awaiting
repair.

The security scope of what this page describes belongs with it, because a
reader can arrive at the reference tier directly rather than through the
hub. This is an internal, **non-production engineering fixture**: it binds
to the IPv4 loopback literal `127.0.0.1` on port `3000`, so only clients on
the same host can reach it (`Source: server.js:L3-L4`), and it speaks plain
HTTP with no TLS and examines no credential — there is no authentication,
no authorization and no session anywhere in the file
(`Source: server.js:L1-L14`). **Public or production deployment is an
unsupported use case for it.** The loopback confinement is a property of
the current bind target and deployment rather than a durable security
control: editing the host literal, or running the process behind a
forwarder, removes it, so it stands in for neither authentication nor
transport security. The
[architecture overview](../architecture/overview.md) owns the trust
boundary and the deliberate non-goals; the
[HTTP endpoint](./http-endpoint.md) reference owns the response contract,
which carries exactly one application-set header and no security or CORS
header at all.

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

Every factual claim on this page — every statement about the code, about
another page in this set, or reproduced from the upstream specification —
carries an inline `Source:` reference to the authority that settles it. The
form of the reference tells you which authority you are reading:

- **Claims about the code cite the source**, as `Source: server.js:L7`, so
  any statement about what the program contains or does can be confirmed or
  refuted in seconds. Where a section states a source-derived fact, the
  locator is given in that section rather than left to be inferred. Where a
  claim is instead about the *annotated* file in the working tree — its
  documentation blocks, which the baseline does not contain — the reference
  names the construct in words, because a baseline locator cannot number a
  line that the annotation added.
- **Claims about another page in this set cite that page**, in the same
  form: `Source: docs/api-reference/module-bindings.md`, narrowed to a line
  range where one statement rather than a whole page is meant. Which page
  owns a unit, and what the two function pages have in common, are
  properties of those files, so those files are the authority — which is
  also why the inventory names its owning pages as live links.
- **Claims reproduced from the upstream technical specification cite its
  section**, as `Source: specification §2.1`. The feature identifiers
  `F-001`, `F-002` and `F-003`, their names and their priorities are taken
  from the feature catalog at §2.1 rather than derived from the source: the
  source shows the behavior, the specification supplies the identifier.
- **Statements the page makes about itself cite the section they describe**,
  as an anchor you can follow, such as
  [Documented unit inventory](#documented-unit-inventory). Its routing
  sentences, its stated conventions — including the two below — and the
  lead-ins that introduce a cited table are of this kind: they describe the
  page in front of you rather than asserting anything about the code, so the
  anchor is the reference and the page is the authority.

Two further conventions govern the source locators themselves:

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
the specification half only. `Source: docs/usage.md`,
`docs/getting-started.md`, `docs/architecture/overview.md`.

Four leaf pages sit beneath this index.
`Source: docs/api-reference/`.

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
exceptions. The codebase contains exactly two functions
(`Source: server.js:L6-L10`, `server.js:L12-L14`), so the directory holds
exactly two files, which is what makes the coverage claim self-evident
rather than asserted: a reader counts the pages and counts the functions.

The two pages follow an identical section structure — Purpose,
Registration, Signature, Parameters, Returns, Behavior, Invariants, What it
deliberately ignores, Examples, Error behavior, and Source and traceability.
That structure is shared on purpose: it is what lets a reviewer compare the
two functions section by section, and what gives a third function an obvious
pattern to follow if one is ever added. A few cross-cutting facts are shared
along with it, stated in full on both pages rather than cross-referenced,
because each page has to stand on its own: the launch command, and the note
that each page's inline counterpart is the JSDoc `@callback` block above the
function it documents.
`Source: docs/api-reference/functions/request-handler-callback.md`,
`docs/api-reference/functions/listen-readiness-callback.md`.

What is distinct is each function's own substance, in every one of those
sections. FN-1 documents two parameters, the response contract it produces,
and the request it never reads (`Source: server.js:L6-L10`); FN-2 documents
a zero-arity invocation, its one-shot semantics, its closure over the
`hostname` and `port` constants, and the bind failure that stops it from
running at all (`Source: server.js:L12-L14`). Neither page's behavior,
parameters, examples or error cases are transferable to the other, which is
the sense in which the per-function documentation is unique.

## Documented unit inventory

Nine units make up the complete code surface of this repository.
`Source: server.js:L1-L14`. Each has its own entry on exactly one owning
page, and no unit is folded into another's description.

The inventory is presented as two tables rather than one so that every row
stays inside this set's line width. The **Unit** column is the key that
joins them and every unit appears exactly once in each: the table
immediately below gives element, kind and locator, and
[Where each unit is documented](#where-each-unit-is-documented) gives
feature and owning page for the same nine units in the same order. The
**Locator** column names the baseline `server.js` line or range on which the
unit appears.

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

The same nine units, in the same order, keyed by the **Unit** column so each
row pairs with its row in the table above. This half of the inventory
answers the two questions the first half does not: which feature the unit
implements, and which single page carries its entry.

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

Eight of the nine units are owned by pages inside this folder: six by
[module bindings][mb] (U-1 through U-5 and U-7), one by the
[Request Handler Callback][fn1] page (U-6), and one by the
[Listen Readiness Callback][fn2] page (U-8).
`Source: docs/api-reference/module-bindings.md`,
`docs/api-reference/functions/request-handler-callback.md`,
`docs/api-reference/functions/listen-readiness-callback.md`.

U-9 is the sole exception, and the only unit owned outside this tier. It is
the executable module body taken as a whole — the ordered bootstrap sequence
from the `require` through to the readiness log — and it is documented by
the [architecture overview][ov], which owns bootstrap ordering. It is
enumerated here so the inventory is complete, and documented there rather
than duplicated here. `Source: server.js:L1-L14`.

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

Those figures are counted off the inventory rather than from any separate
tally, and they reconcile to it exactly: 2 functions (U-6, U-8) plus 4
module-scope bindings (U-1 `http`, U-2 `hostname`, U-3 `port`, U-5 `server`)
plus 2 call sites (U-4, U-7) plus 1 module body (U-9) is 9 units. The single
source file counted in the table is `server.js` itself, whose bootstrap
sequence is U-9. `Source:`
[Documented unit inventory](#documented-unit-inventory) above.

The exported-symbol row reads 0 of 0 and is marked not applicable rather
than incomplete. There are no exported symbols to document
(`Source: server.js:L1-L14`), and that absence is itself documented in
[No importable API surface](#no-importable-api-surface) — a denominator of
zero is a property of the code, not a gap in the coverage.

## No importable API surface

This section exists because it inverts the default expectation a reader
brings to a Node.js module. `server.js` declares no `module.exports`
anywhere, so there is nothing to import from it and the exported-symbol
count is 0 of 0. `Source: server.js:L1-L14`.

That is mechanically checkable, but the check has to search what *executes*
rather than the file as it reads. `server.js` now carries JSDoc
documentation blocks, and one of them — the `@file` block that opens the
annotated file, above `server.js:L1` — mentions `module.exports` in prose
while explaining that the file assigns to it nowhere, so searching the raw
file finds that sentence and reports a match. The comment text has
to come out first, and it has to come out as whole `/* … */` spans: the
documentation blocks end on the same physical lines as the two arrow
signatures, so a filter that discards comment-bearing *lines* discards
executable code with them.

Removing the comment spans and counting what remains:

```bash
node -e 'const src = require("node:fs").readFileSync("server.js", "utf8");
const code = src.replace(/\/\*[\s\S]*?\*\//g, "");
console.log((code.match(/module\.exports/g) || []).length);'
```

Observed output, with exit status `0` — it is safe under `set -e`:

```text
0
```

The substitution removes the five `/* … */` documentation blocks and nothing
else, so what gets searched is the eleven executable statements of the
program with both arrow signatures intact — `(req, res) => {` at
`server.js:L6` and `() => {` at `server.js:L12` survive the strip, because
only the comment span ahead of each is taken out. Taking out whole comment
spans rather than comment-bearing lines is what makes the result a statement
about the program instead of a statement about a filtered view of it, and
the same property makes the command a safe basis for any other
"does this appear in the code" question asked of this file.
`Source: server.js:L6`, `server.js:L12`.

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
range of source is meant. `Source: server.js:L6-L10`,
`server.js:L12-L14`.

The functions are deliberately **not** named or extracted in the source,
even though named functions would be easier to index. Naming them would be a
change to executable code, and this engagement documents the code rather
than altering it. JSDoc's `@callback` tag documents them where they are
defined instead, which introduces the documentation-level type names
`RequestHandlerCallback` and `ListenReadinessCallback` without touching a
statement. Those two names are declared in the `@callback` blocks that sit
immediately above the baseline `server.js:L6` and `server.js:L12` call
sites; they name the callback *types* for documentation and tooling, and
neither is an identifier the running program can refer to.
`Source: server.js:L6`, `server.js:L12`.

## Feature traceability

The three features below are those defined for this system upstream. Their
identifiers, names and priorities are reproduced from the feature catalog
rather than derived from the source, so that the documentation and the
specification can be cross-checked against each other; the behavior each
feature names is cited to `server.js` in the list under the table.
`Source: specification §2.1`.

| ID    | Feature                       | Priority | Units               |
| ----- | ----------------------------- | -------- | ------------------- |
| F-001 | HTTP Server Listener          | Critical | U-1 – U-5, U-7, U-9 |
| F-002 | Uniform HTTP Response Handler | Critical | U-6, U-9            |
| F-003 | Startup Readiness Logging     | Medium   | U-2, U-3, U-8, U-9  |

- **F-001 HTTP Server Listener** (Critical) — imports the core `http`
  module, declares the bind address and port, creates the server, and binds
  the listening socket. Implemented by U-1, U-2, U-3, U-4, U-5, U-7 and
  U-9. `Source: server.js:L1`, `server.js:L3-L4`, `server.js:L6`,
  `server.js:L12`; identifier, name and priority from
  `specification §2.1`.
- **F-002 Uniform HTTP Response Handler** (Critical) — answers every
  dispatched request through one unconditional path, setting status `200`,
  `Content-Type: text/plain` and the same 14-byte greeting body, with no
  branch on method, path, header or body. Implemented by U-6, within the
  bootstrap sequence U-9. `Source: server.js:L6-L10`. That uniformity is
  scoped to **ordinary requests — the ones the runtime parses and emits as
  the server's `'request'` event** and therefore dispatches to the Request
  Handler Callback: the single `http.createServer(...)` call registers the
  callback for `'request'` and for no other event, and the file registers
  no listener of any other kind. `Source: server.js:L6`,
  `server.js:L1-L14`. Within the documented dispatched-method observations
  — GET, POST, PUT, PATCH, DELETE, OPTIONS and HEAD — `HEAD` is the only
  client-visible variation, and the runtime owns it rather than the
  handler: it suppresses the response body and omits `Content-Length`
  entirely, while the handler runs exactly as it does for any other
  request because it cannot tell one method from another.
  `Source: server.js:L6-L10`. Client input that the runtime answers
  itself, or closes, before dispatch never reaches F-002 at all; the
  case-by-case detail belongs to [requests that never reach the Request
  Handler Callback](../architecture/request-lifecycle.md#requests-that-never-reach-the-request-handler-callback).
  The [HTTP endpoint](./http-endpoint.md) page carries the contract in
  full, including the per-method observations. Identifier, name and
  priority from `specification §2.1.2`.
- **F-003 Startup Readiness Logging** (Medium) — emits one line to stdout
  naming the address the service was bound to, interpolating the same
  `hostname` and `port` constants that were passed to `listen`. Implemented
  by U-8, using U-2 and U-3, within the bootstrap sequence U-9.
  `Source: server.js:L12-L14`; identifier, name and priority from
  `specification §2.1.3`.

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
