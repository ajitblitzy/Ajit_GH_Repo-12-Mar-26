# Security

This is the security area document for this repository. It records the
security posture this checkout actually has: what the running process
exposes, who can reach it, which controls exist, which do not, and what would
have to change before the listener is reachable from anywhere other than the
machine it runs on.

It is deliberately narrow. Wire-level and protocol behavior belongs to
[the networking area](./networking.md), and what the program reads, returns,
and stores belongs to [the data and state area](./data-and-state.md). This
document reads the same 14 lines of application code [server.js:1-14]
through one lens only: exposure and control.

## Verification baseline

<!-- markdownlint-disable MD013 -->

| Item | Value | Evidence |
| --- | --- | --- |
| Documentation baseline branch | `17-Aug-2026-Br1` | [.git/HEAD:ref] |
| Documentation baseline commit | `1484182` | [.:git rev-parse HEAD] |
| Tracked files at that commit | `README.md` and `server.js`, nothing else | [.:git ls-files] |
| Runtime behind every runtime-dependent statement below | Node.js 24.19.0, verified on August 17, 2026 | Observed on Node.js 24.19.0 on August 17, 2026 |
| Runtime version declared by the repository | None | [.:git ls-files] |
| Security policy, scanner configuration, or threat model tracked | None | [.:git ls-files] |
| Credential, key, or token in the application source | None | [server.js:1-14] |

<!-- markdownlint-enable MD013 -->

Every statement below carries exactly one evidence label:

- **Source-defined** — read directly from the code in this checkout.
- **Observed on Node.js 24.19.0 on August 17, 2026** — measured by running
  that code under that runtime on that date. Results from any other Node.js
  version are never reported here as this program's behavior.
- **Absent in the current checkout** — verified to be missing from this
  checkout, and scoped to it. Another branch may differ.
- **Recommendation** — advisory only, and never a description of current
  behavior.

Two rules keep this document honest, and both are worth stating before the
first claim:

- Runtime-dependent security-relevant behavior is not re-derived here. Every
  such statement carries the runtime and date above and points to
  [the networking area](./networking.md), which owns the measurements.
- A limit the runtime happens to enforce is never presented as an
  application control. The application sets no timeout, header-size,
  request-size, connection, or socket policy of its own [server.js:1-14].

This document contains no credential, key, token, or repository URL. There is
none in the application source to quote [server.js:1-14], and secret handling
is therefore discussed only in the abstract below.

## Purpose and audience

Read this document before you expose this process to anything, extend it, or
assess it. It answers three questions for someone who has never seen the
repository:

- What does the running process expose today, and to whom?
- Which security controls exist, and which do not?
- What has to change before it is reachable beyond the loopback interface?

The honest summary, evidenced in full below (**Source-defined**): the process
speaks plain HTTP, answers every delivered ordinary request with the same
fixed reply, asks the caller for nothing, reads nothing the caller sent, and
is separated from the wider network by exactly one thing — the address it is
bound to [server.js:1,3,6-9,12]. That is a small exposure, which is not the
same as a strong defence, and the difference is the point of this document.

Prerequisites, the quick-start commands, and the map of every area document
belong to [the project README](../../README.md); this document does not
repeat them.

## Terms used in this document

- **Trust boundary** — the line between components assumed to behave and
  components that are not. Anything crossing it should be treated as
  untrusted until something checks it.
- **Loopback** — the address range a host reserves for talking to itself.
  `127.0.0.1` is its usual IPv4 address, and traffic sent to it does not
  leave the host.
- **Plaintext transport** — carrying HTTP over TCP with no encryption, so
  anything able to observe the connection can read and alter what crosses
  it. The encrypted alternative is HTTPS: the same HTTP carried over TLS.
- **TLS** — Transport Layer Security, the protocol that encrypts a
  connection, protects it from tampering, and lets a client verify the
  server's identity through a certificate. **mTLS** is the mutual variant,
  in which the server also verifies the client's certificate.
- **Authentication** — establishing *who* is making a request, usually by
  checking a credential. **Authorization** is the separate decision about
  *what* that established identity may do. A system can have neither, one,
  or both, and the two are not interchangeable.
- **Credential** — the secret or proof a caller presents in order to be
  authenticated: a password, an API key, a bearer token, or a client
  certificate.
- **Input validation** — checking untrusted request data against an expected
  shape, type, size, and value range before acting on it, and rejecting
  whatever does not match.
- **Output encoding** — escaping data on the way out so a value cannot be
  reinterpreted as markup or code by whatever consumes the response.
- **Rate limiting** — capping how many requests a caller may make within a
  time window so that one caller cannot consume the service's capacity.
  Connection throttling applies the same idea to concurrent connections.
- **Security header** — a response header that instructs a client, usually a
  browser, to apply a protection. `Strict-Transport-Security`,
  `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`,
  and `Referrer-Policy` are the common ones.
- **Audit or access logging** — a durable record of who did what and when.
  It is what makes an action attributable after the fact.
- **Residual risk** — the risk that remains once the controls actually in
  place have been accounted for. It is what you accept by running the system
  as it is.

## Trust and exposure boundary

- **Source-defined:** the bind address is the literal string `127.0.0.1`
  [server.js:3], and it is passed to `server.listen` together with the port
  literal, so exactly one listener is created for that one loopback address
  [server.js:12].
- **Source-defined:** nothing in the file widens that address. There is no
  second `listen` call, no configuration read, and no branch that could
  substitute a different value [server.js:1-14].
- **Observed on Node.js 24.19.0 on August 17, 2026:** only the bound loopback
  address was reached. Every non-loopback address the verification host
  exposed refused the connection, and the host's own machine name did not
  reach this listener either [server.js:3,12]. The measured matrix is owned
  by [the networking area](./networking.md#what-the-listener-exposes) and is
  not restated here.

Binding to `127.0.0.1` is a network reachability constraint, not an
authentication or authorization mechanism [server.js:3,12].

That reading is **Source-defined**: the bind address decides who is able to
connect, and nothing in the code decides who is allowed to
[server.js:1-14]. The sentence above is the one most often got wrong about a
fixture like this, so it is worth expanding:

- **Source-defined:** the callback demands no credential. Its three
  statements set a status code, set one header, and end the response
  [server.js:7-9]; nothing between the braces inspects an `Authorization`
  header, a cookie, a token, or a client certificate [server.js:6-10].
- **Source-defined:** consequently any process or user on the same host —
  including a local account with fewer privileges than the one that started
  the process — reaches the endpoint and receives the full response without
  presenting anything at all [server.js:6-10].
- **Source-defined:** the effective trust boundary is therefore the host
  itself, and everything inside that boundary is trusted by default, because
  nothing in the code distinguishes one caller from another
  [server.js:6-10].

Two practical readings follow, and they pull in opposite directions:

- **Observed on Node.js 24.19.0 on August 17, 2026:** today the exposure is
  genuinely small. The listener was unreachable from off-host, so reaching it
  requires code execution on the machine first [server.js:3,12].
- **Source-defined:** the protection is positional rather than enforced. On
  the day the bind address changes, the process has no control left to fall
  back on, because there was never one in the code [server.js:1-14].

## Transport posture

- **Source-defined:** the only module the program loads is Node's core
  `http` module [server.js:1]. Neither `https` nor `tls` appears anywhere in
  the file, and no certificate, private key, cipher suite, or
  protocol-version setting is configured [server.js:1-14].
- **Source-defined:** every exchange is therefore plain HTTP over TCP.
  Requests and responses cross the connection unencrypted and without
  integrity protection, and the server presents no identity that a client
  could verify [server.js:1,12].
- **Source-defined:** the application sets no `Strict-Transport-Security`
  header and performs no redirect to HTTPS, because the single header it
  sets is `Content-Type` [server.js:8].

What that costs depends entirely on the bind address, so the two cases are
kept apart:

- **Source-defined:** with the listener bound to loopback [server.js:3,12],
  plaintext traffic does not leave the host, so it is not exposed to an
  on-path observer elsewhere on the network. It remains readable by anything
  on the host privileged enough to capture local traffic, and it remains
  unauthenticated in both directions [server.js:6-10].
- **Source-defined:** if the bind address were widened, the same code would
  carry the same plaintext across a routable interface, because there is no
  certificate, no TLS configuration, and no client-verifiable identity
  anywhere in the file to activate [server.js:1,3].
- **Recommendation:** treat TLS termination as a prerequisite for widening
  the bind address rather than as follow-up work. Nothing in this checkout
  implements it [.:git ls-files].

## Request-input posture

- **Source-defined:** the callback is declared with both parameters,
  `(req, res)` [server.js:6], so the request object is available to the
  application on every delivered ordinary request.
- **Source-defined:** it is never dereferenced. No method, path, query
  string, header, cookie, or body is read, parsed, buffered, decoded,
  escaped, stored, or logged anywhere in the file [server.js:6-10]; the
  identifier `req` occurs in the parameter list and nowhere else
  [server.js:1-14].
- **Source-defined:** there is no `try`/`catch`, no schema check, no
  allow-list, and no size check in the file, because no consumed value
  exists for any of them to apply to [server.js:1-14].

That fact cuts both ways, and a new engineer needs both halves rather than
only the flattering one:

- **Source-defined:** the handler has no application-level injection surface.
  No request value ever reaches an interpreter, a file path, a query, a
  shell, or the response body, so within these three statements there is
  nothing for an attacker to inject into [server.js:7-9].
- **Source-defined:** there is equally no validation layer to build on. The
  first change that reads a method, path, header, or body is the change that
  introduces untrusted input to this process, and it will have to bring its
  own checking, size limits, and encoding with it, because nothing here can
  be reused [server.js:6-10].

This is the absence of input handling, not a control doing work: the program
is not rejecting bad input, it is not examining input at all
(**Source-defined**) [server.js:6-10]. What the program reads, returns, and
stores is catalogued by
[the data and state area](./data-and-state.md#request-data-what-enters),
which this document does not restate.

One runtime qualification belongs here, because it is the thing most easily
mistaken for an application control:

- **Observed on Node.js 24.19.0 on August 17, 2026:** malformed request
  lines, unrecognized method tokens, an HTTP/1.1 request carrying no `Host`
  header, and an oversized header block were each rejected by the runtime
  before the callback ran [server.js:1-14]. Those rejections are runtime
  behavior and not application controls; they are owned by
  [the networking area](./networking.md#protocol-and-method-matrix).

## Response posture

- **Source-defined:** the reply is fixed — status code `200`
  [server.js:7], `Content-Type: text/plain` [server.js:8], and the body
  `Hello, World!` followed by a newline [server.js:9].
- **Source-defined:** it discloses nothing. No request value is echoed, and
  no environment value, hostname, file path, version, stack trace, or
  identifier is included, because none is read or computed anywhere in the
  file [server.js:1-14].
- **Source-defined:** `Content-Type` is the only header the application sets
  [server.js:8]. No security header is set: not
  `Strict-Transport-Security`, `Content-Security-Policy`,
  `X-Content-Type-Options`, `X-Frame-Options`, nor `Referrer-Policy`
  [server.js:1-14].
- **Source-defined:** no CORS header is set either, so the response
  expresses no cross-origin policy at all [server.js:8].
- **Observed on Node.js 24.19.0 on August 17, 2026:** the runtime adds
  headers of its own while serializing the reply, and neither `Server` nor
  `X-Powered-By` is among them, so the response discloses no software
  identity. The field-by-field breakdown is owned by
  [the networking area](./networking.md#runtime-generated-response-fields).

One consequence is easy to miss. Because every delivered ordinary request
receives the same `200`, a successful response proves only that the listener
accepted a connection: it is not evidence that the process is healthy, and it
is certainly not evidence that the caller was permitted (**Source-defined**)
[server.js:6-10].

## Control inventory

Every row in this table is **Absent in the current checkout**. The status
column repeats that label deliberately, so that no row can be skimmed as
though the control were present. Nothing in this table is implemented.

<!-- markdownlint-disable MD013 -->

| Control | Status | Evidence in this checkout | Security implication today |
| --- | --- | --- | --- |
| Authentication | Absent in the current checkout | The callback inspects no `Authorization` header, cookie, token, or client certificate; its three statements only write a reply [server.js:6-10] | Every caller that can reach the listener is served identically, and no identity is ever established to attach to a request |
| Authorization or access control | Absent in the current checkout | No code branches on a caller, a path, a method, or a role; every delivered ordinary request receives the same reply [server.js:6-10] | There is nothing to grant or deny, so a permission cannot be expressed, enforced, or reviewed |
| Input validation and schema enforcement | Absent in the current checkout | The request object is never dereferenced, and no schema, type, range, or size check exists anywhere in the file [server.js:6-10] | Nothing arrives to be checked today; validation becomes mandatory on the first change that reads the request |
| Output encoding | Absent in the current checkout | The body is a fixed literal, so no value is escaped on the way out [server.js:9] | No encoding is required while the payload is constant, and it becomes required the moment any response value derives from input |
| Rate limiting or connection throttling set by the application | Absent in the current checkout | No connection cap, per-connection request cap, or throttling policy appears in the file [server.js:1-14] | Concurrency is bounded by host resources and by runtime defaults this repository does not choose. Those defaults are runtime behavior, not an application control; their measured values are owned by [the networking area](./networking.md#timeouts-and-other-runtime-defaults) |
| Security response headers, such as CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, or `Referrer-Policy` | Absent in the current checkout | `Content-Type` is the only header the application sets [server.js:8] | Responses carry no hardening directives, so a browser client receives no policy to enforce on the application's behalf |
| CORS policy | Absent in the current checkout | No `Access-Control-*` header is set, because only `Content-Type` is [server.js:8] | No cross-origin intent is expressed: browser code from another origin cannot read the response, and no origin can be deliberately allowed either |
| Audit or access logging | Absent in the current checkout | The only application output is one readiness line written after a successful bind; no per-request write exists [server.js:6-13] | A request leaves no application record, so local access is not attributable after the fact. Signals and their emitters are owned by the observability area document |
| Secret management | Absent in the current checkout | No credential, key, or token appears in the source, and no `process.env` read, key store, or secret-file read appears either [server.js:1-14] | Nothing is exposed by the code today, and there is equally no established mechanism for a first secret to be supplied through |
| TLS or mTLS | Absent in the current checkout | Only the plaintext core `http` module is imported; neither `https` nor `tls` appears in the file [server.js:1] | Transport is unencrypted and unauthenticated in both directions; the server proves no identity and cannot require one of a client |
| Request-size or header-size policy of the application's own | Absent in the current checkout | No timeout, header-size, request-size, connection, or socket property is set anywhere in the file [server.js:1-14] | The limits actually in force belong to the Node.js version in use rather than to this repository, so they change when the runtime changes. They are runtime behavior, not an application control; see [the networking area](./networking.md#timeouts-and-other-runtime-defaults) |
| Dependency and vulnerability scanning | Absent in the current checkout | No manifest, lockfile, audit configuration, or scanner configuration is tracked [.:git ls-files] | There is no package inventory for a scanner to resolve, and no gate that would notice when the first dependency is added |
| Error handling that avoids leaking internals | Absent in the current checkout | There is no `try`/`catch` in the file, and no listener is attached to the server's `error` event [server.js:12-14] | The application produces no error response of its own, so whatever a failure surfaces is decided by the runtime, and a failure to bind is left unhandled |

<!-- markdownlint-enable MD013 -->

The rate-limiting, request-size, and error-handling rows share one
clarification, because it is the most common misreading of a program this
small. The runtime does enforce header sizes, header timeouts, and request
timeouts, and it does reject malformed requests before the callback runs
(**Observed on Node.js 24.19.0 on August 17, 2026**). None of that is an
application control: the code sets no such policy [server.js:1-14], so every
one of those limits is a property of the Node.js build that happens to be
running, and is owned as evidence by
[the networking area](./networking.md#timeouts-and-other-runtime-defaults).
A control that belongs to the runtime cannot be relied on by this repository,
because this repository does not choose the runtime [.:git ls-files].

## Platform versus package dependency

This distinction is easy to state carelessly in a repository this small, so
it is stated precisely here.

- **Source-defined:** there are **no declared application package
  dependencies**. The single `require` in the file resolves to Node's
  built-in `http` module [server.js:1], and no other module is loaded
  anywhere in the file [server.js:1-14].
- **Absent in the current checkout:** there is no `package.json` and no
  lockfile, so the repository declares no dependency and pins no transitive
  version [.:git ls-files].
- **Source-defined:** Node.js itself is nevertheless a hard dependency. The
  program cannot run without it, and every byte of parsing, protocol
  handling, serialization, and socket management the process performs is
  Node's code rather than this repository's [server.js:1,6,12].

Both halves carry weight. Having no third-party package to patch removes one
class of supply-chain exposure; it does not remove the exposure that arrives
with the platform. A defect in the Node.js HTTP parser, in its socket
handling, or in its TLS stack is a defect this program inherits in full,
because the program delegates all of that work to the runtime
(**Source-defined**) [server.js:1,6,12], and remediating it means changing
the runtime rather than this repository.

**Absent in the current checkout:** the complication is that the runtime is
unspecified. There is no `package.json` `engines` field, no `.nvmrc`, no
`.node-version`, and no `.tool-versions` file, so nothing in the checkout
states which Node.js version is expected or supported [.:git ls-files].
Whoever runs `node server.js` supplies that version, and the code starts just
as readily under an old, unpatched, or end-of-life runtime as under a current
one [server.js:1-14]. The Node.js 24.19.0 baseline named at the top of this
document was selected externally in order to produce the observations cited
here, and is not a repository requirement [.:git ls-files].

## Residual risks

These are the risks that remain given the posture above. Each is stated with
its evidence and its practical consequence, and none of them is mitigated
anywhere in this checkout.

<!-- markdownlint-disable MD013 -->

| Residual risk | Evidence | Practical consequence |
| --- | --- | --- |
| Unauthenticated access from anywhere on the host | No credential is requested or checked [server.js:6-10], and the loopback bind is a reachability constraint rather than a control [server.js:3,12] | Any local user or local process reaches the endpoint and is served. Host access is the only barrier, so the host's own account and process isolation is the entire access-control story |
| No caller distinction, therefore no authorization granularity | Every delivered ordinary request receives the same fixed reply [server.js:7-9] | Even after an identity mechanism is added, there is no existing decision point to attach a policy to; authorization has to be introduced rather than adjusted |
| Plaintext transport becomes network-exposed the moment the bind address widens | The plaintext `http` module is the only one imported [server.js:1], and the bind address is a source literal that nothing overrides [server.js:3] | Changing one line moves an unencrypted, unauthenticated endpoint onto a routable interface. The change is a one-word edit, which is precisely why it needs a deliberate review |
| Unpinned and therefore arbitrary runtime | No `engines` field, `.nvmrc`, `.node-version`, or `.tool-versions` file is tracked [.:git ls-files] | The process may be started under an unpatched or end-of-life Node.js build, and every runtime-enforced limit and protocol behavior shifts with it |
| Local access is not attributable | The application writes one readiness line and nothing per request [server.js:6-13] | There is no record that a request occurred, so misuse cannot be detected, investigated, or ruled out from the application's own output |
| An operational failure is unhandled | No listener is attached to the server's `error` event and there is no `try`/`catch` [server.js:12-14] | A failure such as an already-occupied port is left to the runtime's default handling instead of being caught, reported, or retried by the application |
| Availability is bounded only by the host and by runtime defaults | The application configures no connection cap, no per-connection request cap, and no timeout of its own [server.js:1-14] | A local caller can consume the process's capacity without meeting any application-defined limit, and the limits that do apply change with the Node.js version |
| No security-relevant setting can be changed without editing source | The bind address and port are module-scope literals, and no environment variable, argument, or configuration file is read [server.js:3-4] [server.js:1-14] | Hardening cannot be applied by configuration or by an operator at launch. Every change is a code change followed by a restart |

<!-- markdownlint-enable MD013 -->

One closing note, offered as an assessment derived from the evidence above
rather than as a claim about the code or as repository policy: read against
the repository's own description of itself as a test project [README.md:2],
none of these risks is a defect in a 14-line fixture [server.js:1-14]. They
are the reasons this process should not be treated as a service, and the
list of what a service would have to add.

## Hardening before non-loopback use

Nothing in this section is implemented, and nothing here describes current
behavior. Every item is a **Recommendation**, listed after the limitations
above so the two can never be confused. The ordering is roughly the order in
which the work would have to happen.

- **Recommendation:** pin a supported Node.js version. The checkout declares
  none [.:git ls-files], so record the intended version and enforce it
  before anything else, since every runtime-enforced limit and protocol
  behavior documented in the networking area depends on it.
- **Recommendation:** review the bind address deliberately rather than
  incidentally. It is a source literal today [server.js:3]; treat any change
  to it as a change of exposure that requires the rest of this list, not as
  a configuration tweak.
- **Recommendation:** terminate TLS in front of the process, or in it, before
  any non-loopback exposure. Only the plaintext module is used today
  [server.js:1].
- **Recommendation:** add authentication so a caller's identity is
  established. Nothing is requested or checked today [server.js:6-10], so
  this is new work rather than a tightening of something existing.
- **Recommendation:** add authorization as a separate decision from
  authentication, with an explicit default of denial, so that permission is
  expressed once rather than assumed everywhere.
- **Recommendation:** validate inputs on the same change that first reads
  them. The request object is untouched today [server.js:6-10]; the first
  handler that reads a method, path, header, or body should arrive with its
  type, range, and size checks already written.
- **Recommendation:** add rate limiting and connection throttling as
  application or proxy policy, so that capacity limits stop depending on
  whichever runtime defaults are in force [server.js:1-14].
- **Recommendation:** set request-size, header-size, and timeout policies
  explicitly in code, so that these limits are pinned by this repository
  rather than inherited from the runtime in use [server.js:1-14].
- **Recommendation:** set security response headers appropriate to the
  intended client, and set an explicit CORS policy if a browser client is
  ever intended. Only `Content-Type` is set today [server.js:8].
- **Recommendation:** add access logging that records enough to make a
  request attributable, without recording the request data that would create
  new obligations. Only a readiness line is written today
  [server.js:6-13].
- **Recommendation:** attach a listener to the server's `error` event and
  add a graceful shutdown path on termination signals. Neither exists today
  [server.js:12-14].
- **Recommendation:** decide how errors are reported to a caller before any
  handler can fail, so that a future failure cannot disclose a path, a
  version, or a stack trace. There is no error response in the code today
  [server.js:1-14].
- **Recommendation:** establish secret handling before the first secret
  exists. There is no credential in the source and no mechanism for
  supplying one [server.js:1-14]; supplying secrets through the environment
  or a secret store, never through a tracked file, is the decision to make
  in advance.
- **Recommendation:** adopt a dependency policy and vulnerability scanning at
  the moment the first manifest is added. Neither a manifest nor a scanner
  configuration is tracked today [.:git ls-files].
- **Recommendation:** re-verify this document after any change to
  `server.js`, to the bind address, or to the Node.js version used for
  verification, and update the baseline table at the top of the file.

## Source map and related areas

Lines this document cites: [server.js:1] for the plaintext core-module import
and the absence of any application package import, [server.js:3] for the
loopback bind literal, [server.js:3-4] for the two configuration literals
that cannot be overridden at launch, [server.js:6] for the callback and the
request parameter it never reads, [server.js:6-10] for the callback body that
checks no credential and reads no request data, [server.js:7-9] for the fixed
response values, [server.js:8] for the single application-set header,
[server.js:9] for the body literal, [server.js:12] for the `listen` call that
activates the listener, [server.js:12-14] for the listener startup with no
`error` listener attached, [server.js:6-13] for the readiness line as the
only application output, and [server.js:1-14] for every whole-file absence
check. Checkout-wide absences cite [.:git ls-files], the repository's own
description of itself cites [README.md:2], and the documentation baseline
cites [.git/HEAD:ref] and [.:git rev-parse HEAD].

Continue reading:

- [The project README](../../README.md) — prerequisites, quick start,
  troubleshooting, terminology, and the map of every area document.
- [Networking](./networking.md) — the measured reachability boundary, which
  requests reach the callback at all, the response fields the runtime adds,
  and the runtime limits that this document is careful not to claim as
  application controls.
- [Data and state](./data-and-state.md) — what enters, what leaves, and what
  is stored, including the absent data capabilities that this document's
  control inventory does not duplicate.

Two adjacent concerns are owned elsewhere and are named rather than restated
here: request logging and the readiness line as signals belong to the
observability area document, and the operator handling of a failed start
belongs to the DevOps area document.
