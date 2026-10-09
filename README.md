# Server.js

A single-file Node.js HTTP service. `GET /` answers with the welcome message as plain text, any other path answers `404`, and any non-`GET` method on the root answers `405`. It uses built-in Node.js modules only, so there is nothing to install, nothing to build and no dependency to resolve.

## Install

Node.js 18 or later is the whole requirement. The service imports only `node:http`, the manifest declares no dependency at all, and no package is fetched, resolved or compiled. There is no install step, so `npm start` and `npm test` run from a fresh checkout as they are, and no `node_modules` directory is ever created.

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

A `PORT` that is present but unusable is not silently replaced by `3000` — the process writes a message to stderr and exits with a non-zero code, serving nothing, and the same happens when the port cannot be bound at all. Only the startup line goes to stdout and every failure goes to stderr, so a start either announces itself or fails loudly, and a refused start can be told from a running service by the exit code alone. A successful run serves until it is stopped.

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
| Manifest parity | `npm start` | identical stdout line and identical responses to `node Server.js` |
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
