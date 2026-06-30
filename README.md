# hao-backprop-test

A minimal HTTP test project for backprop integration, implemented in **Python 3** with
[Flask](https://flask.palletsprojects.com/) (a WSGI application, migrated from the original
Node.js `http` server). The behavior is intentionally tiny and fixed: the server replies to
**every** request — any URL path, any HTTP method — with the same static response:

- Status: `200 OK`
- Header: `Content-Type: text/plain`
- Body: `Hello, World!` (with a trailing newline)

The HTTP contract is identical to the original Node.js implementation; only the technology
stack changed.

## Requirements

- **Python 3.12+** — the project targets `requires-python >= 3.12`.

Runtime and development dependencies are pinned in the manifests:

| Package  | Version  | Role                                                        |
| -------- | -------- | ----------------------------------------------------------- |
| Flask    | 3.1.3    | WSGI web framework (core of the application)                |
| Werkzeug | 3.1.8    | WSGI/HTTP library underpinning Flask                        |
| gunicorn | 26.0.0   | Production WSGI server for Linux/Unix (multi-worker)        |
| waitress | 3.0.2    | Pure-Python, cross-platform WSGI server (used on Windows)   |
| pytest   | 9.1.1    | Test runner for the behavioral-parity suite (dev only)      |

## Setup

Create and activate a virtual environment, then install the dependencies.

### 1. Create a virtual environment

```bash
python -m venv .venv
```

> **Windows note:** on some Windows images the bundled `python -m venv` cannot
> bootstrap `pip` (its `ensurepip` step fails with a file-copy error), leaving a
> `.venv` directory without `Scripts\pip.exe`. If that happens, create the
> environment with [uv](https://github.com/astral-sh/uv) instead, which seeds
> `pip` directly:
>
> ```powershell
> uv venv .venv --seed --python "C:\Program Files\Python313\python.exe"
> ```
>
> After this, the normal `.venv\Scripts\python -m pip install ...` workflow below
> works unchanged.

### 2. Activate it

**macOS / Linux:**

```bash
source .venv/bin/activate
```

**Windows (PowerShell):**

```powershell
.venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**

```bat
.venv\Scripts\activate.bat
```

### 3. Install dependencies

Runtime only:

```bash
pip install -r requirements.txt
```

Runtime plus the test tooling (recommended for development):

```bash
pip install -r requirements-dev.txt
```

## Running the server

All three options below bind to the loopback interface `127.0.0.1` on port `3000` and serve
the identical response. The server is loopback-only by design.

### Development (simplest)

```bash
python wsgi.py
```

On a successful bind this prints exactly:

```text
Server running at http://127.0.0.1:3000/
```

### Production — Linux / Unix (multi-worker)

```bash
gunicorn --workers 4 --bind 127.0.0.1:3000 wsgi:app
```

### Production — cross-platform / Windows (threaded)

```bash
waitress-serve --listen=127.0.0.1:3000 wsgi:app
```

The choice of WSGI server is purely a performance lever: running multiple worker processes
(gunicorn) or a thread pool (waitress) enables concurrent, production-grade request handling
for higher throughput. It does **not** change any response. On Windows, **waitress** is the
supported production server and on its own satisfies this concurrent, production-grade serving
objective; gunicorn's multi-worker mode is the Linux/Unix performance option. Note that gunicorn
depends on the Unix-only `fcntl` module and cannot run on Windows — use waitress there.

#### A note on the `Server` header

The original Node.js server sent **no** `Server` response header, so for byte-for-byte parity
the migrated app sends none either. A WSGI server adds its own `Server` header *after* the
application has produced the response, so it cannot be removed inside the Flask app (or by a
WSGI middleware) — it has to be handled at the serving layer. Importing `wsgi:app` installs that
suppression automatically, so **no special flags are required** on any serving path:

- **Development (`python wsgi.py`)** — a custom Werkzeug request handler suppresses the
  `Server` header.
- **waitress** — importing `wsgi:app` sets waitress's default server identity to empty, so the
  plain `waitress-serve --listen=127.0.0.1:3000 wsgi:app` command emits **no** `Server` header.
  (Passing an explicit `--ident=<value>` still overrides this if a custom identity is ever
  wanted.) This is the recommended cross-platform production path.
- **gunicorn** — importing `wsgi:app` removes the `Server` line from gunicorn's default
  headers, so `gunicorn --bind 127.0.0.1:3000 wsgi:app` also emits no `Server` header on Linux.
  (gunicorn cannot run on Windows — it needs the Unix-only `fcntl` module — so this applies to
  Linux/Unix deployments; use waitress on Windows.)

In every case the status, `Content-Type`, and body are identical — `200` / `text/plain` /
`Hello, World!\n` — regardless of which server is used, and no `Server` header is emitted.

## Verifying behavior

With the server running, issue a request with `curl`:

```bash
curl -i http://127.0.0.1:3000/
```

The response is:

```text
HTTP/1.1 200 OK
Content-Type: text/plain

Hello, World!
```

The body is `Hello, World!` followed by a trailing newline (i.e. `Hello, World!\n`). On every
serving path (development, waitress, and gunicorn on Linux) the response carries **no**
`Server` header, exactly like the original Node.js server (see
[A note on the `Server` header](#a-note-on-the-server-header) above for how each serving path
handles this).

Because the handler is route- and method-agnostic, **any** path and **any** HTTP method
return the identical response:

```bash
curl -i http://127.0.0.1:3000/anything
curl -i http://127.0.0.1:3000/a/b/c
curl -i -X POST http://127.0.0.1:3000/
curl -i -X DELETE http://127.0.0.1:3000/any/route
```

Every combination of method (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`) and
path yields the same `200` status and the same `Content-Type: text/plain` header. Per HTTP
semantics, `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, and `OPTIONS` return the full 14-byte
`Hello, World!` body (including its trailing newline), while `HEAD` returns the identical
status and headers — including `Content-Length: 14` — but no response body. The handler is
genuinely method-agnostic, so non-standard verbs (for example `TRACE`, `PROPFIND`, or an
arbitrary custom method) return that same `200` / `text/plain` response as well.

## Running tests

Install the development dependencies (see [Setup](#setup)), then run the suite from the
repository root:

```bash
pytest
```

The behavioral-parity suite in `tests/test_app.py` asserts the full HTTP contract: status
`200`, header `Content-Type: text/plain`, body `Hello, World!\n`, and the `127.0.0.1:3000`
binding / startup-log contract — evidence that the migrated application matches the original
Node.js behavior exactly.

## Project structure

```text
.
├── wsgi.py               # WSGI entrypoint; exposes `app`; binds 127.0.0.1:3000 and prints the startup log
├── app/
│   ├── __init__.py       # create_app() application factory
│   ├── config.py         # Config: HOST / PORT (127.0.0.1:3000)
│   └── routes.py         # Blueprint with the catch-all static-response view
├── tests/
│   ├── __init__.py       # Test package marker
│   └── test_app.py       # Behavioral-parity tests (F-001..F-004)
├── requirements.txt      # Runtime dependencies (Flask, Werkzeug, gunicorn, waitress)
├── requirements-dev.txt  # Development/test dependencies (adds pytest)
├── pyproject.toml        # Project metadata + pytest configuration
└── .gitignore
```
