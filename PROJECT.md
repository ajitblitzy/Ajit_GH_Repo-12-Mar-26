# hao-backprop-test

test project for backprop integration.

This is a test fixture of two independent Node.js scripts: nothing to install and
nothing to build. Run every command below from the repository root.

## Welcome.js

The whole script is one statement [Welcome.js:1].

```bash
node Welcome.js
```

Expected output:

```text
Welcome to Blitzy
```

The process exits with status `0` and writes nothing to stderr.

## server.js

A small HTTP server built on Node's built-in `http` module [server.js:1-14].
Start it and leave it running:

```bash
node server.js
```

It prints `Server running at http://127.0.0.1:3000/` and answers requests at
`http://127.0.0.1:3000/`. Every request returns status `200`,
`Content-Type: text/plain`, and the 14-byte body `Hello, World!` followed by a
newline; check it with `curl -i http://127.0.0.1:3000/`. Stop it with Ctrl+C.
It does not route by path or method, does not read environment variables or
configuration, and has no error handling, so a port already in use ends the
process with status `1`.

## Files

- `Welcome.js` — the one-line greeting script.
- `server.js` — the HTTP server.
- `README.md` — the project identity in one sentence.
- `blitzy/documentation/Project Guide.md` — the delivery and verification record.

## Check the work

Re-run `node Welcome.js` and the `node server.js` plus `curl` comparison above, and
compare their output again before accepting this document. Then confirm the change's
footprint while it is still untracked: `git status --porcelain --untracked-files=all`
prints `?? PROJECT.md` and nothing else, and `git diff --stat` prints nothing because
no tracked file changed.

```bash
git status --porcelain --untracked-files=all
git diff --stat
```
