# Data and State

This is the data and state area document for this repository. It answers four
questions about the program in this checkout: what data comes in, what data
goes out, what the running process remembers, and what is stored anywhere
after the process stops.

## Verification baseline

- **Documentation baseline branch** — `17-Aug-2026-Br1`, the branch this
  document was written against [.git/HEAD:ref].
- **Documentation baseline commit** — `1484182`, whose subject line is
  `Add files via upload` [.:git log -1 --oneline 1484182].
- **Files tracked at that commit** — `README.md` and `server.js`, nothing else
  [.:git ls-tree -r --name-only 1484182].
- **Program files, at that commit and now** — one, `server.js`
  [.:git ls-tree -r --name-only 1484182] [.:git ls-files].
- **Runtime used for every observation below** — Node.js 24.19.0, verified on
  August 17, 2026 (**Observed on Node.js 24.19.0 on August 17, 2026**).
- **Schema, migration, fixture, seed, or data file tracked** — none
  [.:git ls-files].

Every statement below carries exactly one evidence label:

- **Source-defined** — read directly from the code in this checkout.
- **Observed on Node.js 24.19.0 on August 17, 2026** — measured by running
  that code under that runtime on that date. Results from any other Node.js
  version are not reported as this program's behavior.
- **Absent in the current checkout** — verified to be missing from this
  checkout, and scoped to it.
- **Recommendation** — a suggestion for future work, never a description of
  current behavior.

## Purpose and audience

Read this document if you are new to the repository and need to know what
data the program touches before you rely on it, extend it, or deploy it. It
is organised around three questions:

- Which data does the program read, and which data does it send back?
- What does it remember, both across requests and across restarts?
- What follows from those answers when the process is restarted or when
  someone asks for a second instance?

The short version, expanded and evidenced below: almost no data enters, one
fixed literal leaves, and nothing durable is kept. The process itself is not
empty while it runs — it holds real in-memory state — and that distinction is
the one thing to get right about this area.

Prerequisites, the quick-start commands, and the map of every area document
belong to [the project README](../../README.md); this document does not
repeat them.

## Terms used in this document

- **Request object** — the value a Node.js HTTP server hands to the
  application for each delivered request, conventionally named `req`. It
  exposes the request's method, path, headers, and body stream.
- **Response object** — the companion value, conventionally named `res`, that
  the application writes the reply into.
- **In-memory state** — data a process holds in its own memory. It exists
  only while that process runs and disappears when the process ends.
- **Durable persistence** — data written somewhere that outlives the process:
  a database, a file on disk, an object store, or a queue.
- **Configuration state** — the values that decide how a program behaves, and
  the place those values come from: a literal in the source, an environment
  variable, a command-line argument, or a configuration file.
- **Idempotence** — a property of a request: repeating it leaves the system in
  the same condition and produces the same result as sending it once.
- **Horizontal scaling** — serving more traffic by running more instances of
  the same program side by side.
- **Sticky session** — routing every request from one client to the same
  instance, which is necessary when that instance holds state the client's
  later requests depend on.

## Request data: what enters

- **Source-defined:** the request callback is declared with both parameters,
  `(req, res)` [server.js:6], so the request object is available to the
  application on every delivered ordinary request.
- **Source-defined:** the callback body never reads it. Its three statements
  set a status code, set one header, and end the response [server.js:7-9],
  and nothing between the opening and closing braces dereferences `req`
  [server.js:6-10].
- **Source-defined:** because of that, no request method, path, query string,
  header, cookie, or body is consumed, parsed, buffered, copied, or persisted
  anywhere in the file [server.js:1-14]. There is no body-stream listener, no
  parser call, and no assignment that captures a request value
  [server.js:1-14].
- **Observed on Node.js 24.19.0 on August 17, 2026:** the behavior matches.
  Ordinary `GET`, `POST`, and `OPTIONS` requests — sent to `/`, to a nested
  path carrying a query string, with a form-encoded request body, and with a
  cookie and a custom header attached — each received the same status code,
  the same media type, and the same 14-byte body. No value that was sent
  appeared anywhere in any response [server.js:6-10].
- **Observed on Node.js 24.19.0 on August 17, 2026:** ten concurrent requests
  on ten different paths returned ten identical responses [server.js:6-10].

Three consequences matter to a new engineer.

- **Source-defined:** the response is independent of the request. The values
  written back are literals [server.js:7-9], so no part of the reply is
  derived from what the caller sent [server.js:6-10].
- **Source-defined:** every delivered ordinary request is therefore
  idempotent as far as this program is concerned. Repeating it changes
  nothing, because the callback stores nothing and alters nothing
  [server.js:7-9].
- **Source-defined:** there is no request data to validate, because none is
  read [server.js:6-10]. That is an absence of input, not a control: the
  callback contains no check, no allow-list, and no size limit
  [server.js:1-14]. What that absence means for exposure, and the full
  inventory of controls, belong to [the security area](./security.md).

The runtime still parses incoming bytes before the callback ever runs, and it
answers some requests without involving the callback at all. Which requests
reach the callback, and what the runtime does with the rest, belong to
[the networking area](./networking.md); this document only records that
whatever arrives is not read by the application [server.js:6-10].

## Response data: what leaves

- **Source-defined:** the reply is fixed. The callback sets status code `200`
  [server.js:7], sets `Content-Type: text/plain` [server.js:8], and ends the
  response with the string `Hello, World!\n` [server.js:9].
- **Source-defined:** all three values are literals written into the source
  [server.js:7-9]. None is looked up, computed, formatted from a template, or
  read from a source of record, because there is no store, client, or file
  read in the file to read one from [server.js:1-14].
- **Source-defined:** the payload therefore carries no user data, no
  environment data, and no system data — no identifier, no timestamp, no
  hostname, no version, and no request echo [server.js:7-9].
- **Observed on Node.js 24.19.0 on August 17, 2026:** the body is 14 bytes on
  every response, and it was byte-identical across the whole request matrix
  above [server.js:9]. The response size does not vary with the request,
  because the payload does not vary with the request [server.js:7-9].

The response also carries fields the application never sets, which the
runtime adds while serializing the reply. Those fields, including the one
whose value changes on every response, are catalogued in
[the application and runtime area](./application-runtime.md) and
[the networking area](./networking.md); this document does not restate them.

## Configuration state

- **Source-defined:** the two listener settings — the bind address on line 3 and
  the TCP port on line 4 — are module-scope constants [server.js:3-4]. They are
  evaluated once, while the script loads, and are passed to the listener call
  unchanged [server.js:12]. They are two of the program's five configuration
  literals; the canonical list of all five is owned by
  [the application and runtime area](./application-runtime.md#configuration-constants),
  and this document uses "listener settings" for these two so that the narrower
  pair is never mistaken for the whole set.
- **Source-defined:** nothing else supplies configuration. The 14 lines
  contain no `process.env` read, no `process.argv` read, and no configuration
  or `.env` file read [server.js:1-14], so no environment variable,
  command-line option, or configuration file can influence behavior.
- **Observed on Node.js 24.19.0 on August 17, 2026:** launching the process
  with port and host environment variables set to different values changed
  nothing. The listener still bound `127.0.0.1:3000`, the alternative port had
  no listener at all, and the response body was unchanged
  [server.js:3-4,12].
- **Absent in the current checkout:** there is no configuration file, no
  defaults module, and no schema that validates configuration; no such path is
  tracked, and the only tracked paths besides `server.js` are Markdown
  documents [.:git ls-files].

Configuration therefore exists only in source. Changing any value means
editing `server.js` and restarting the process, because the constants are
read once during load [server.js:1-14]. **This documentation change does not
make that edit**: it treats `server.js` as read-only evidence. The canonical
table of all five hard-coded values, with the source
line and the change procedure for each, is owned by the
[configuration constants](./application-runtime.md#configuration-constants)
section of the application and runtime area and is deliberately not
duplicated here.

## No application persistence

**Absent in the current checkout.** Nothing this program does is written
anywhere that outlives a request [server.js:1-14], and the repository contains
nothing for it to write to [.:git ls-files]. Every item below was checked
against the whole file [server.js:1-14] and against the tracked file list
[.:git ls-files].

Every store and side effect below is **Absent in the current checkout**:

- **Database, ORM, or query layer** — no database or ORM client is imported or
  called anywhere; the file's only import is the core HTTP module [server.js:1]
  and it makes no other call [server.js:1-14].
- **File read or file write** — no file-system module, read, write, append, or
  write stream appears in the file [server.js:1-14].
- **Cache, in-process or external** — no cache client exists, and there is no
  module-scope collection to cache into [server.js:1-14].
- **Session, cookie, or token store** — the callback never reads or issues a
  cookie [server.js:6-10] and no store exists to keep one in [server.js:1-14].
- **Queue, topic, or event stream** — no producer, consumer, or broker client
  is created [server.js:1-14].
- **Outbound API or service call** — no outbound HTTP client, request, or
  fetch call appears in the file [server.js:1-14].
- **Schema, migration, fixture, or seed data** — no such path is tracked;
  besides `server.js`, every tracked path is a Markdown document
  [.:git ls-files].
- **Retained record of request data** — the only statement that writes to a
  process output stream is the readiness line [server.js:13]; the callback
  writes only the reply itself and records nothing [server.js:7-9].

- **Observed on Node.js 24.19.0 on August 17, 2026:** the request matrix above
  changed no file in the checkout. A recursive snapshot of every file in the
  checkout — path, size, and modification time — was identical before the
  process started and after the whole matrix had been served: no file was
  added, changed, or removed [server.js:1-14].
- **Observed on Node.js 24.19.0 on August 17, 2026:** the application's
  standard output after the matrix was byte-for-byte the single readiness
  line printed at startup [server.js:13]. The cookie value, the custom
  header, and the request body that had been sent appear in no application
  output and in no file this program wrote. Which signals the program emits,
  and which it does not, belong to
  [the observability area](./observability.md).

Read those two results for exactly what they measure, which is the application:
together they show that the current source performs no persistence, no echo of
request data, and no request logging [server.js:6-10]. They are not a statement
about the host or the runtime, and they were never capable of being one. Request
bytes still occupy kernel buffers and process memory while an exchange is being
handled, and anything outside this program — the operating system, the client, a
proxy or tunnel in the path, a packet capture, a swap file, a core dump — is
neither measured by those two checks nor prevented by any line of the code
[server.js:1-14].

One conclusion follows from that, and one that is commonly drawn does not.
**Source-defined:** the program holds no source of record, so no data can go
stale, be lost, or be corrupted by it [server.js:1-14]. What does **not** follow
is that there is no data to protect. A request can carry personal data or a
credential in a header, a path, a query string, or a body, and the runtime hands
the whole request object to the callback [server.js:6]; this program neither
inspects nor retains any of it, so it creates no store to govern — which is why
[the capability list](#absent-data-capabilities) later in this document is a
list of absences rather than a list of policies [server.js:1-14] — but the data
in transit is real all the same, and protecting it is a transport and exposure
concern owned by [the security area](./security.md).

## Transient runtime state that does exist

Read this section carefully, because the previous one is easy to over-read.
The application keeps no cross-request state and no durable state — but the
process is not empty while it runs. A Node.js HTTP server necessarily holds
live objects and operating-system handles in memory, and this program is no
exception.

Each entry below names what the running process holds, what created it, how long
it lives, and whether the application shares it between requests:

- **The server object, kept in a module-scope constant.**
  - *Created by:* `http.createServer()` on line 6 [server.js:6].
  - *Lifetime:* from load until the process ends.
  - *Shared between requests by the application?* No — the request callback
    stores no request or business state on it, and the application's only use of
    the object is the `server.listen` call on line 12 [server.js:12].
- **The bound listening handle.**
  - *Created by:* `server.listen()` on line 12 [server.js:12].
  - *Lifetime:* from a successful bind until the process ends or the listener
    closes.
  - *Shared between requests by the application?* Not applicable — it accepts
    connections and carries no application data [server.js:12].
- **One open connection per connected client.**
  - *Created by:* the runtime, on each accepted connection.
  - *Lifetime:* until the client or the runtime closes it.
  - *Shared between requests by the application?* No — the callback never
    touches the connection [server.js:6-10].
- **One request object and one response object per in-flight request.**
  - *Created by:* the runtime, on each delivered ordinary request.
  - *Lifetime:* until that response is finished.
  - *Shared between requests by the application?* No — each pair serves one
    invocation of the callback and is then dropped [server.js:6-10].

- **Observed on Node.js 24.19.0 on August 17, 2026:** before the listener was
  bound, the process reported no active resources at all; once the bind
  succeeded, its active resources contained the TCP server handle, and the
  listener reported its address as `127.0.0.1` port `3000` [server.js:12].
- **Observed on Node.js 24.19.0 on August 17, 2026:** with one keep-alive
  client attached, the server reported exactly one open connection and the
  process's active resources contained that client socket in addition to the
  server handle. After the client disconnected, the open-connection count
  returned to zero [server.js:12].
- **Observed on Node.js 24.19.0 on August 17, 2026:** two requests were
  carried by two distinct pairs of objects — a separate request object and a
  separate response object each time — so nothing is reused between
  invocations of the callback [server.js:6-10].
- **Observed on Node.js 24.19.0 on August 17, 2026:** those per-request
  objects are released once the exchange finishes. Weak references to the
  first request's pair were both empty after five further requests and a
  forced garbage collection, which means nothing in the application had
  retained them [server.js:6-10].
- **Observed on Node.js 24.19.0 on August 17, 2026:** the application adds no
  property of its own to the server object. Compared with a freshly
  constructed server, the only extra own property on the running one was a
  key set by the runtime's own bind bookkeeping [server.js:6,12].
- **Source-defined:** there is nowhere for state to accumulate. Every variable
  declaration in the file uses `const` — the only other bindings are the `req`
  and `res` parameters the runtime supplies per request [server.js:6] — and the
  file contains no counter, array, map, set, or cache at module scope
  [server.js:1-14].
- **Observed on Node.js 24.19.0 on August 17, 2026:** when the listener was
  closed, the process's active resources returned to empty [server.js:12].
  The listening handle is what keeps the process alive; the process lifecycle
  itself is owned by
  [the application and runtime area](./application-runtime.md).

State the distinction precisely when describing this program: **the
application keeps no cross-request and no durable state**, and every value it
returns is a literal [server.js:7-9]. That is a different claim from "the
process holds nothing" — the list above states exactly what it does hold. The
in-memory state is the runtime's own machinery for accepting connections and
carrying one request at a time, and none of it is a place where the
application stores anything [server.js:1-14].

Two values in this area are inherently volatile and are deliberately not
published as fixed facts: the number of open connections, which depends on
how many clients are attached at that moment, and the process identifier,
which differs on every launch.

## Restart implications

- **Source-defined:** because the application stores nothing, a restart has
  nothing to migrate, back up, warm, or reconcile. There is no cache to
  repopulate, no schema to check, and no buffered data to flush, because none
  of those exist [server.js:1-14].
- **Observed on Node.js 24.19.0 on August 17, 2026:** after the process was
  stopped, port `3000` was free again and a fresh request to it was refused
  at the connection level [server.js:3-4].
- **Observed on Node.js 24.19.0 on August 17, 2026:** a newly started process
  printed its readiness line again and answered the next request with the
  same status code, the same media type, the same set of header names, and
  the same 14-byte body as the run before it. Nothing carried over, and
  nothing needed to [server.js:7-9,12-13].
- **Observed on Node.js 24.19.0 on August 17, 2026:** the checkout was
  unchanged across the stop and the start, so a restart leaves no residue on
  disk either [server.js:1-14].
- **Source-defined:** what a restart does discard is the in-memory state in
  the list above — the server object, the listening handle, and any open
  connection or in-flight request pair [server.js:6,12]. Nothing in the file
  lets an in-flight request finish first, because it contains no shutdown
  path at all [server.js:1-14]. Signal handling and shutdown behavior are
  owned by [the application and runtime area](./application-runtime.md), and
  the readiness line as a signal is owned by
  [the observability area](./observability.md).

## Scaling implications

- **Source-defined:** the application shares no state between requests, so
  requests are independent of one another and of the order in which they
  arrive [server.js:6-10]. There is no data affinity between a client and an
  instance, which means a sticky session would serve no purpose here
  [server.js:1-14].
- **Observed on Node.js 24.19.0 on August 17, 2026:** ten concurrent requests
  on ten different paths were answered identically, with no interference
  between them [server.js:6-10].
- **Source-defined:** what blocks horizontal scaling today is not data, it is
  the fixed socket. The port is a literal [server.js:4] and the bind address
  is a literal [server.js:3], so two instances on one host would both try to
  claim the same address and port [server.js:12].
- **Observed on Node.js 24.19.0 on August 17, 2026:** starting a second
  process while the first held the port failed. The second process reported an
  address-already-in-use error, never printed its readiness line, and exited
  with a non-zero status [server.js:4,12].
- **Absent in the current checkout:** there is no load balancer, reverse
  proxy, process manager, or clustering configuration that could place several
  instances behind one address; no such definition is tracked anywhere in the
  repository [.:git ls-files]. The substrate that would be required is owned by
  [the infrastructure area](./infrastructure.md).

The practical reading for a new engineer: the data behavior imposes no
obstacle to running many copies of this program — there is no shared state to
coordinate and no session to pin — but nothing in this checkout provides a way
to run them [.:git ls-files].

## Absent data capabilities

Every capability below is **Absent in the current checkout**, and each entry
repeats the label so that no entry can be skimmed as if it were present.

- **Durable storage of any kind** — **Absent in the current checkout.**
  - *Evidence:* no database, file write, or object-store client appears in the
    file [server.js:1-14].
  - *Implication:* the program writes nothing that outlives it, so no state of
    its own survives a stop, and every run starts from the same fixed literals
    [server.js:7-9].
- **Data model or schema** — **Absent in the current checkout.**
  - *Evidence:* no schema, model, or type definition is tracked
    [.:git ls-files].
  - *Implication:* there is no contract to validate data against and none to
    version.
- **Input validation** — **Absent in the current checkout.**
  - *Evidence:* the callback reads no part of the request [server.js:6-10].
  - *Implication:* nothing arrives to be checked today; validation becomes
    mandatory on the change that first reads the request.
- **Serialization beyond a plain-text literal** — **Absent in the current
  checkout.**
  - *Evidence:* the body is a fixed string sent as `text/plain`
    [server.js:8-9].
  - *Implication:* no encoder, content negotiation, or structured payload exists
    to version or test.
- **Caching** — **Absent in the current checkout.**
  - *Evidence:* no cache client and no module-scope collection exist
    [server.js:1-14].
  - *Implication:* every response is produced from the literal, so there is
    nothing to invalidate.
- **Session management** — **Absent in the current checkout.**
  - *Evidence:* no cookie is read or issued and no session store exists
    [server.js:1-14].
  - *Implication:* clients are indistinguishable to the application, so no
    identity or continuity is possible.
- **Data retention or deletion policy** — **Absent in the current checkout.**
  - *Evidence:* nothing is retained, so nothing can expire [server.js:1-14].
  - *Implication:* a policy has to be written before the program stores
    anything.
- **Backup and restore** — **Absent in the current checkout.**
  - *Evidence:* there is no state to back up and no backup procedure is tracked
    [.:git ls-files].
  - *Implication:* recovery today consists of starting the process again.
- **Personal data handling** — **Absent in the current checkout.**
  - *Evidence:* no request data is read [server.js:6-10] and the response
    carries none [server.js:7-9].
  - *Implication:* a request may well arrive carrying personal data — a client
    can put it in a header, a path, a query string, or a body, and the runtime
    hands the whole request object to the callback [server.js:6]. What the
    application does with it is nothing: it does not inspect, persist, echo, or
    emit it, so no personal data is read or stored by this program. That removes
    the storage obligations — retention, deletion, encryption at rest — but
    not the transit ones: such a request still crosses an unencrypted local
    connection, which is a transport concern owned by
    [the security area](./security.md). Storage obligations begin with the first
    change that reads the request.
- **Encryption at rest** — **Absent in the current checkout.**
  - *Evidence:* nothing is written, so there is nothing at rest to encrypt
    [server.js:1-14].
  - *Implication:* the control becomes relevant only once storage is introduced.
- **Data migration path** — **Absent in the current checkout.**
  - *Evidence:* no migration tool, script, or version marker is tracked
    [.:git ls-files].
  - *Implication:* a first store will need a migration strategy defined
    alongside it.

Protection of data in transit and the exposure boundary are a security
concern rather than a storage concern; they are owned by
[the security area](./security.md).

## Recommendations

Nothing in this section is implemented. Each item is advisory and applies only
if this program grows beyond the local fixture it is today.

- **Recommendation:** decide the data model before adding a store. There is no
  schema to extend today [.:git ls-files], so the first design decision is
  unconstrained and should be made deliberately rather than incidentally.
- **Recommendation:** validate and bound request data on the same change that
  first reads it. Nothing is read today [server.js:6-10]; as soon as a method,
  path, header, or body is consumed, size limits and input checks become
  necessary, and [the security area](./security.md) records why.
- **Recommendation:** keep the response a literal, or make it explicitly
  derived. A reply that quietly begins to reflect request or environment data
  changes what this program exposes [server.js:7-9].
- **Recommendation:** prefer state held outside the process to state held
  inside it, if state is introduced at all, so that requests stay independent
  and no sticky session is needed.
- **Recommendation:** write retention, deletion, personal-data, encryption,
  and backup policies before the program accepts real data rather than
  afterwards.
- **Recommendation:** define a migration path together with the first store,
  including how a schema change is applied and how it is rolled back.
- **Recommendation:** re-run the observations in this document after any
  change to `server.js` or to the Node.js version used to verify them, and
  update the verification baseline at the top of this file.

## Source map and related areas

Lines this document cites: [server.js:1] for the single core-module import,
[server.js:3-4] for the two configuration literals, [server.js:6] for the
callback signature and the server object, [server.js:6-10] for the callback
body that never reads the request, [server.js:7-9] for the fixed response
values, [server.js:12] for the bind that creates the listening handle,
[server.js:13] for the readiness line, and [server.js:1-14] for every
whole-file absence check. Absences in the checkout as it stands cite
[.:git ls-files], and the baseline commit and its file list cite
[.:git log -1 --oneline 1484182] and [.:git ls-tree -r --name-only 1484182].
The branch this document was written against is cited as [.git/HEAD:ref], and
every absence claim here is scoped to it. Remote URLs and clone hooks are never
cited, because they belong to an individual clone rather than to tracked
content — and a remote URL can carry an access credential;
[the project README](../../README.md#current-checkout) explains all of that once
for the whole set.

Continue reading:

- [The project README](../../README.md) — prerequisites, quick start, and the
  map of every area document.
- [Application and runtime](./application-runtime.md) — the canonical
  configuration constants table, the line-by-line source map, and the process
  lifecycle that bounds every piece of in-memory state described here.
- [Security](./security.md) — what follows from reading no request data and
  storing nothing, including the controls that are absent.
- [Networking](./networking.md) — which requests reach the callback at all,
  and the response fields the runtime adds to the fixed payload.
- [Infrastructure](./infrastructure.md) — the substrate a second instance
  would require.
- [Observability](./observability.md) — the readiness line as a signal, and
  what is not recorded about a request.
