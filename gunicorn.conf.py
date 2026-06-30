"""Gunicorn configuration -- suppress the auto-added ``Server`` response header.

Purpose (byte-parity; AAP section 0.9.2; review finding WSGI-1):
    The original Node.js core-``http`` server sent **no** ``Server`` response
    header. Gunicorn, however, hardcodes one: :meth:`gunicorn.http.wsgi.Response
    .default_headers` always emits a ``Server: gunicorn/<version>`` line, and
    gunicorn exposes **no** command-line flag or setting to disable it. Because
    that header is written by the *server* layer -- after the Flask application
    has produced its response -- the app-level ``after_request`` hook in
    :func:`app.create_app` cannot remove it (it never sees the server-added
    header). The only correct place to suppress it for the gunicorn serving path
    is the server itself, which is exactly what this configuration file does.

Usage (documented in README.md)::

    gunicorn --config gunicorn.conf.py --workers 4 --bind 127.0.0.1:3000 wsgi:app

Mechanism:
    Gunicorn executes this configuration file on startup. We wrap
    ``Response.default_headers`` with a small filter that drops the auto-added
    ``Server:`` line while leaving every other byte of the response untouched --
    the status line, ``Date``, ``Connection``, ``Transfer-Encoding`` (when
    present), and all application headers (which gunicorn appends *separately*,
    after ``default_headers()``, so they are never affected by this filter).
    The result is byte-identical to the original Node response, with no
    ``Server`` header.

Scope (parity mandate -- AAP sections 0.2.2, 0.6.1):
    This file changes only the serving model's header output. It introduces no
    routing, request parsing, middleware, error handling, signal/graceful-
    shutdown handling, logging framework, or TLS. It does not alter status,
    content type, or body.

Platform note:
    Gunicorn depends on the Unix-only ``fcntl`` module and runs only on POSIX
    platforms (it cannot run on Windows -- use waitress there). The monkeypatch
    is therefore installed only when ``os.name == "posix"``. This guard also
    keeps the module importable on non-POSIX hosts (where ``gunicorn.http.wsgi``
    cannot be imported), so the pure :func:`_strip_server_header` predicate
    remains unit-testable everywhere.
"""

import os


def _strip_server_header(header_lines):
    """Return ``header_lines`` with any ``Server:`` line removed.

    Pure, dependency-free helper (independently unit-testable): given the list
    of raw header-line strings gunicorn would send (each like
    ``"Server: gunicorn/26.0.0\\r\\n"``), return a new list omitting only the
    ``Server`` header line (case-insensitive match on the ``server:`` field
    name). Every other line -- the HTTP status line, ``Date``, ``Connection``,
    ``Transfer-Encoding`` -- is preserved in order.

    Args:
        header_lines: Iterable of ``"<Name>: <value>\\r\\n"`` strings (plus the
            leading ``"HTTP/x.y <status>\\r\\n"`` status line) as produced by
            :meth:`gunicorn.http.wsgi.Response.default_headers`.

    Returns:
        list[str]: The same lines, minus any line whose field name is
        ``Server`` (the status line and all other headers are kept).
    """
    return [line for line in header_lines if not line.lower().startswith("server:")]


def _install():
    """Monkeypatch gunicorn's ``Response.default_headers`` to drop ``Server:``.

    Imports gunicorn's WSGI response machinery (only available on POSIX, where
    gunicorn runs) and wraps ``default_headers`` with :func:`_strip_server_header`.
    Idempotent: a sentinel attribute prevents double-wrapping if the config is
    ever loaded more than once.
    """
    from gunicorn.http import wsgi as gunicorn_wsgi

    original_default_headers = gunicorn_wsgi.Response.default_headers

    # Idempotency guard -- never wrap an already-wrapped method.
    if getattr(original_default_headers, "_strips_server_header", False):
        return

    def default_headers(self):
        # Delegate to gunicorn's original implementation, then strip ONLY the
        # auto-added 'Server:' line for byte-parity with the Node server.
        return _strip_server_header(original_default_headers(self))

    default_headers._strips_server_header = True
    gunicorn_wsgi.Response.default_headers = default_headers


# Gunicorn runs only on POSIX platforms (it requires the Unix-only `fcntl`
# module). Install the patch there; on non-POSIX hosts there is no gunicorn to
# configure, and skipping keeps this module importable (e.g. for unit tests).
if os.name == "posix":
    _install()
