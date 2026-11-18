# hao-backprop-test

test project for backprop integration. (`README.md:2`)

This is a two-file Node.js test fixture.
There is nothing to install and nothing to build.
Run every command below from the repository root.
The two executables are independent: they share only the host Node.js runtime, with no
shared module, state, port, invocation or configuration (`Welcome.js:1`, `server.js:1-14`).

## Welcome.js

A one-line script that prints a single line to stdout (`Welcome.js:1`).

```bash
node Welcome.js
```

```text
Welcome to Blitzy
```

The process exits with status `0` and writes nothing to stderr.

## server.js

A small HTTP server with one fixed response (`server.js:1-14`). Start it in one terminal and leave it running:

```bash
node server.js
```

It prints `Server running at http://127.0.0.1:3000/` and serves `http://127.0.0.1:3000/`.
Every request returns status `200`, `Content-Type: text/plain`, and the 14-byte body `Hello, World!`
followed by a newline; from a second terminal, check it with `curl -i http://127.0.0.1:3000/`. Stop
it with Ctrl+C. It does not route by path or method, does not read environment variables or
configuration, and has no error handling, so a port already in use ends the process with status `1`.

## Files

- `Welcome.js` — the one-line greeting script (`Welcome.js:1`).
- `server.js` — the HTTP server (`server.js:1-14`).
- `README.md` — the project identity in one sentence (`README.md:1-2`).
- `blitzy/documentation/Project Guide.md` — the delivery and verification record (`blitzy/documentation/Project Guide.md:1-381`).

## Check the work

Re-run `node Welcome.js` and the `node server.js` plus `curl` comparison above and compare their output
again. Then confirm the tree is clean: `git status --porcelain --untracked-files=all` and `git diff --stat`
both print nothing, because `PROJECT.md` is committed and no other tracked file changed.

```bash
git status --porcelain --untracked-files=all
git diff --stat
```
