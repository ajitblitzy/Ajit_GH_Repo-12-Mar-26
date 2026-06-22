# hao-backprop-test

A minimal HTTP test project for backprop integration. It runs a tiny HTTP
server that has been ported **in place** from the original JavaScript HTTP
implementation (its built-in `http` module) to **Python 3 + Flask**, served
over WSGI.

The migration preserves the HTTP behavior exactly. The server is route- and
method-agnostic: it answers **every** request — any path and any HTTP method —
with the same static response:

- Status: `200 OK`
- Header: `Content-Type: text/plain`
- Body: `Hello, World!` (with a trailing newline)

## Requirements

- **Python 3.12+** (the project targets `requires-python >= 3.12`).

The runtime stack is Flask (with Werkzeug) plus a production WSGI server
(`gunicorn` on Linux/Unix, `waitress` for cross-platform/Windows). Exact,
pinned versions are declared in [`requirements.txt`](requirements.txt) and
[`requirements-dev.txt`](requirements-dev.txt).

## Setup / Installation

Create and activate a virtual environment, then install the dependencies.

**1. Create a virtual environment**

Use a Python 3.12+ interpreter whose `ensurepip` works. On Windows the `python`
found on `PATH` may be a newer build whose `ensurepip` fails to bootstrap pip, so
select Python 3.12 explicitly with the `py` launcher (or the full interpreter
path) instead of the bare `python` command.

```bash
# macOS / Linux
python3 -m venv .venv
```

```powershell
# Windows (PowerShell) — select Python 3.12 explicitly via the py launcher
py -3.12 -m venv .venv
```

```powershell
# Windows (PowerShell) — alternative: use the full interpreter path
C:\Python312\python.exe -m venv .venv
```

**2. Activate it**

```bash
# macOS / Linux
source .venv/bin/activate
```

```powershell
# Windows (PowerShell)
.venv\Scripts\Activate.ps1
```

```bat
:: Windows (cmd)
.venv\Scripts\activate.bat
```

**3. Install dependencies**

```bash
# Runtime dependencies (Flask, Werkzeug, gunicorn, waitress)
pip install -r requirements.txt

# Development / test dependencies (adds pytest)
pip install -r requirements-dev.txt
```

## Running the server

All three options serve the same application and bind to **`127.0.0.1:3000`**
(loopback only). The choice of WSGI server is purely a performance lever: it
enables concurrent, production-grade request handling and does **not** change
any response.

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

> `gunicorn` runs multiple worker processes and is the production server for
> Linux/Unix. `waitress` is a pure-Python, threaded server that also runs on
> Windows. Both serve the identical `wsgi:app` and produce byte-identical
> responses — the server choice affects concurrency and throughput, never the
> response itself.
>
> The server's default `Server:` response header is suppressed on every serving
> path so responses stay byte-identical to the original JavaScript HTTP server, which
> sends no `Server` header. This is enforced in code — it does **not** depend on
> any run-command flag: `wsgi.py` handles the development server (`python
> wsgi.py`, via a custom request handler) and applies guarded patches for both
> `gunicorn` and `waitress` automatically (each activates only when serving
> under that server, so no separate config file or argument is needed). Passing
> `waitress-serve --ident=` is therefore optional (it has the same effect),
> while an explicit `--ident=<value>` is an intentional opt-out.
> (`gunicorn` is Linux/Unix-only — imports the Unix-only `fcntl` module — so on
> Windows use `waitress`.)

## Verifying behavior

With the server running, send a request to any path with any method:

```bash
curl -i http://127.0.0.1:3000/
```

Response:

```http
HTTP/1.1 200 OK
Content-Type: text/plain

Hello, World!
```

The body is exactly `Hello, World!` followed by a trailing newline
(`Hello, World!\n`, 14 bytes). Because the server is route- and method-agnostic,
every request returns the same status `200` and `Content-Type: text/plain` — for
**any** path (e.g. `/`, `/anything`, `/a/b/c`, even `/static/anything`) and
**any** HTTP method token, including non-standard verbs such as `TRACE` or
`PROPFIND`, not only the common `GET` / `POST` / `PUT` / `DELETE` / `PATCH` /
`HEAD` / `OPTIONS`. Every non-`HEAD` method returns the 14-byte `Hello, World!\n`
body; a `HEAD` request returns the identical status and headers but **no response
body**, per HTTP semantics (matching the original JavaScript HTTP server, which likewise
omits the body for `HEAD`):

```bash
curl -i -X POST     http://127.0.0.1:3000/anything
curl -i -X DELETE   http://127.0.0.1:3000/a/b/c
curl -i -X PROPFIND http://127.0.0.1:3000/static/anything
```

## Running tests

From the repository root:

```bash
pytest
```

The behavioral-parity suite lives in [`tests/test_app.py`](tests/test_app.py).
It asserts that the original contract is preserved after the migration:
status `200`, `Content-Type: text/plain`, body `Hello, World!\n`, and the
`127.0.0.1:3000` binding plus the exact startup-log line
(`Server running at http://127.0.0.1:3000/`).

## Project structure

```text
.
├── wsgi.py               # WSGI entrypoint; binds 127.0.0.1:3000 (after a successful bind), prints the startup log, and suppresses the Server header for byte-parity
├── app/
│   ├── __init__.py       # create_app() application factory; registers the blueprint
│   ├── config.py         # Config: HOST = '127.0.0.1', PORT = 3000
│   └── routes.py         # Blueprint with the catch-all view (static 200 / text/plain response)
├── tests/
│   ├── __init__.py       # test package marker
│   └── test_app.py       # behavioral-parity tests (F-001..F-004)
├── requirements.txt      # runtime dependencies (Flask, Werkzeug, gunicorn, waitress)
├── requirements-dev.txt  # development / test dependencies (pytest)
├── pyproject.toml        # project metadata + pytest configuration
└── .gitignore            # Python ignore patterns (.venv/, __pycache__/, *.pyc)
```
