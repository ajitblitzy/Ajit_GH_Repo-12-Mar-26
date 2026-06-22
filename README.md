# hao-backprop-test

A minimal HTTP test project for backprop integration. It runs a tiny HTTP
server that has been migrated **in place** from Node.js (the built-in `http`
module) to **Python 3 + Flask**, served over WSGI.

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

```bash
python -m venv .venv
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
(`Hello, World!\n`). Because the server is route- and method-agnostic, every
combination returns the identical response. For example, any path
(`/`, `/anything`, `/a/b/c`) and any HTTP method
(`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`) yields the same
`200` / `text/plain` / `Hello, World!\n`:

```bash
curl -i -X POST   http://127.0.0.1:3000/anything
curl -i -X DELETE http://127.0.0.1:3000/a/b/c
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
├── wsgi.py               # WSGI entrypoint; __main__ binds 127.0.0.1:3000 and prints the startup log
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
