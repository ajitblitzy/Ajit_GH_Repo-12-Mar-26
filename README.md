# hao-backprop-test

Test project for backprop integration. A minimal single-process Python 3 ASGI HTTP server that always returns `Hello, World!\n` with HTTP 200 on every request, regardless of method or path.

## Prerequisites

- Python ≥ 3.10

## Installation

```bash
pip install -r requirements.txt
```

## Running

```bash
python server.py
```

On successful startup, the server prints the following line to stdout:

```
Server running at http://127.0.0.1:3000/
```

The server binds to `127.0.0.1:3000` and is route-agnostic: every URL and every HTTP method returns the same `Hello, World!\n` body with `Content-Type: text/plain` and HTTP 200.
