# hao-backprop-test

test project for backprop integration. `README.md:1-2`

Two independent Node.js scripts in one test fixture: nothing to install or build. Run
every command below from the repository root.

## Welcome.js

The script is one statement `Welcome.js:1`.

```bash
node Welcome.js
```

```text
Welcome to Blitzy
```

It exits with status `0` and writes nothing to stderr.

## server.js

An HTTP server on Node's `http` module `server.js:1-14`.

```bash
node server.js
```

It prints `Server running at http://127.0.0.1:3000/`; every request returns status
`200`, `Content-Type: text/plain`, and the 14-byte body `Hello, World!` followed by a
newline; check it with `curl -i http://127.0.0.1:3000/`; stop with Ctrl+C. It does
not route by path or method, read environment or configuration, or handle errors; a port
already in use ends the process with status `1`.

## Files

- `Welcome.js` — the one-line greeting script.
- `server.js` — the HTTP server.
- `README.md` — the project identity in one sentence.
- `blitzy/documentation/Project Guide.md` — the delivery and verification record.

## Check the work

Re-run both commands above, `curl` included, and compare the output again. While it is
still untracked, `git status --porcelain --untracked-files=all` prints `?? PROJECT.md`
and nothing else, and `git diff --stat` prints nothing because no tracked file changed.
On the committed tree `git log --stat -1 -- PROJECT.md` names `PROJECT.md` as the only
changed file.

```bash
git status --porcelain --untracked-files=all
git diff --stat
```
