# Server.js

A single-file Node.js HTTP service. `GET /` answers with the welcome message as plain text, any other path answers `404`, and any non-`GET` method on the root answers `405`. It uses built-in Node.js modules only, so there is nothing to install, nothing to build and no dependency to resolve.

## Install

Node.js 18 or later runs the service. It imports only `node:http`, the manifest declares no dependency at all, and no package is fetched, resolved or compiled, so there is no install step: `npm start` runs from a fresh checkout as it is, and no `node_modules` directory is ever created. The automated check is narrower than the service: `npm test` runs the built-in test runner, whose `--test` flag arrived in v18.1.0 and whose `before` and `after` hooks arrived in v18.8.0, and the check starts and stops its child through those hooks — but a release carrying both does not necessarily run them, so the check needs a release whose runner actually calls them. Measured by running the check on every release of the Node.js 18.x, 20.x, 22.x, 24.x and 26.x lines from v18.0.0 to v26.11.1 — 161 builds in all — it passes on v18.19.0 to v18.20.8, on v20.7.0 to v20.12.2, on v20.15.0 to v20.20.2 and on every release of the 22.x, 24.x and 26.x lines from v22.2.0 onward, while every earlier release fails or never finishes. Run `npm test` on a current LTS line — v22.23.3 is the version this project is developed and verified on — or on one of the ranges above.

## Run

```bash
node Server.js
```

`npm start` runs the same command and behaves identically. The port is bound first, and the startup line is written to stdout only once the bind has succeeded:

```
Server running on port 3000
```

The port comes from the `PORT` environment variable: when the variable is absent the port is `3000`, and when it is present the value must be an integer from 1 to 65535 inclusive.

```bash
PORT=4000 node Server.js     # prints: Server running on port 4000
```

A `PORT` that is present but unusable is not silently replaced by `3000` — the process writes a message to stderr and exits with a non-zero code, serving nothing, and the same happens when the port cannot be bound at all. Only the startup line goes to stdout and every failure goes to stderr, so a start either announces itself or fails loudly, and a refused start can be told from a running service by the exit code alone. A successful run serves until it is stopped: `SIGINT` or `SIGTERM` closes the server, releases the port and leaves the process with exit code `0`.

## Verify

Start the service with `node Server.js` (or `npm start`), then run these commands in another terminal.

| Check | Command | Expected result |
| --- | --- | --- |
| Root success | `curl -i http://localhost:3000/` | `HTTP/1.1 200 OK`, `Content-Type: text/plain; charset=utf-8`, body `Welcome to Blity`, no trailing newline (16 bytes) |
| Unknown path | `curl -i http://localhost:3000/anything` | `HTTP/1.1 404 Not Found`, body `Not Found` |
| Non-`GET` on the root | `curl -i -X POST http://localhost:3000/` | `HTTP/1.1 405 Method Not Allowed`, body `Method Not Allowed` |
| Port from the environment | `PORT=4000 node Server.js` | stdout `Server running on port 4000`; `curl -i http://localhost:4000/` returns the same `200` response |
| Invalid port value | `PORT=abc node Server.js` | stderr `Invalid PORT value: "abc" (expected an integer between 1 and 65535)`; exit code 1; nothing served |
| Occupied port | start one instance, then run `node Server.js` again | stderr `Failed to start server on port 3000: <runtime reason>`; exit code 1; the first instance keeps serving |
| Graceful stop | start the service, then `kill -TERM <pid>` | exit code `0`; the port is free again |
| Manifest parity | `npm start` (stop the running instance first, so port `3000` is free) | identical stdout line and identical responses to `node Server.js` |
| Automated check | `npm test` | the three assertions pass and the child process is gone afterwards |

The length of the root body can be checked on its own:

```bash
curl -sS -o /dev/null -w '%{size_download}\n' http://localhost:3000/
```

which prints `16`. The `500` case cannot be raised by any request input, so it is verified by inspection of the containment block in `Server.js` rather than by a command.

## The served text

A `GET` to `/` answers with exactly

`Welcome to Blity`

The message is `Welcome to ` followed by `Blity` — capital `B`, a single `i` — with no trailing newline and no extra characters, so the body is exactly 16 bytes.
