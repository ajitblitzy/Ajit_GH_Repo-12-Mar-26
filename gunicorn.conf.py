"""Gunicorn server-specific configuration: omit the ``Server`` response header.

Purpose (byte-parity, AAP Sections 0.9.2 / 0.9.3)
-------------------------------------------------
The original Node.js server (``server.js``) uses the core ``http`` module,
which sends **no** ``Server`` response header. Gunicorn, however, injects
``Server: gunicorn/<version>`` for every response: ``gunicorn.http.wsgi`` builds
``Response.default_headers()`` with an unconditional ``"Server: %s\\r\\n" %
self.version`` line (``self.version`` comes from ``gunicorn.SERVER``), and
``Response.send_headers()`` writes those default headers ahead of the
application's WSGI headers. Because the header is added at the SERVING layer --
after the Flask application has produced its response -- it cannot be removed by
a Flask ``after_request`` hook or by any WSGI middleware. It must be suppressed
in gunicorn itself.

This file is gunicorn's idiomatic "server-specific configuration" mechanism. It
wraps ``Response.default_headers()`` so the ``Server:`` line is dropped, leaving
every other header (status line, ``Date``, ``Connection``, ``Content-Length``,
the application's ``Content-Type``) untouched. The result is byte-identical to
Node's core ``http`` (no ``Server`` header) and consistent with the Werkzeug dev
server (``wsgi.py`` request handler) and waitress (``--ident=``).

Usage (Linux / Unix production)
-------------------------------
    gunicorn -c gunicorn.conf.py --workers 4 --bind 127.0.0.1:3000 wsgi:app

This config sets no ``bind``/``workers`` itself (those stay on the command line
or another config); its single responsibility is the ``Server``-header parity.

Platform note / verification
----------------------------
Gunicorn is a Linux/Unix server: importing ``gunicorn.http.wsgi`` requires the
Unix-only ``fcntl`` module and is not importable on Windows. To keep this file
verifiable off-Linux, the gunicorn import is deferred into the lifecycle hooks
below; the pure header-filtering logic lives in :func:`_without_server_header`,
which has no gunicorn dependency and can be unit-tested on any platform. The
patch target (``Response.default_headers`` emitting ``"Server: ...\\r\\n"``) was
confirmed by static inspection of the installed gunicorn 26.0.0 source.
"""

# Sentinel attribute marking the Response class as already patched, so applying
# the patch from more than one hook (e.g. on_starting then post_fork) is
# idempotent and never double-wraps ``default_headers``.
_PATCH_MARKER = "_parity_no_server_header_patched"


def _without_server_header(header_lines):
    """Return ``header_lines`` with any ``Server:`` line removed.

    Pure, dependency-free helper (no gunicorn import) so it is unit-testable on
    any platform. ``header_lines`` is the list of raw header strings produced by
    gunicorn's ``Response.default_headers()`` -- e.g.
    ``["HTTP/1.1 200 OK\\r\\n", "Server: gunicorn/26.0.0\\r\\n",
    "Date: ...\\r\\n", "Connection: keep-alive\\r\\n"]``. The status line and
    all non-``Server`` headers are preserved in order; only the ``Server:``
    line is dropped.

    Args:
        header_lines (list[str]): Raw header lines (each ending in CRLF).

    Returns:
        list[str]: The same lines, minus any line whose name is ``Server``.
    """
    return [
        line for line in header_lines
        if not line.lower().startswith("server:")
    ]


def _install_server_header_suppression():
    """Patch gunicorn's ``Response.default_headers`` to drop the ``Server`` line.

    Imports ``gunicorn.http.wsgi`` lazily (Linux-only dependency) and wraps the
    class-level ``default_headers`` method with :func:`_without_server_header`.
    Idempotent: a sentinel attribute prevents double-wrapping if invoked from
    multiple hooks or multiple times in one process.
    """
    from gunicorn.http import wsgi as _wsgi

    response_cls = _wsgi.Response
    if getattr(response_cls, _PATCH_MARKER, False):
        return

    _original_default_headers = response_cls.default_headers

    def default_headers(self):
        # Reuse gunicorn's own header construction, then strip the Server line.
        return _without_server_header(_original_default_headers(self))

    response_cls.default_headers = default_headers
    setattr(response_cls, _PATCH_MARKER, True)


def on_starting(server):
    """Gunicorn ``on_starting`` hook -- apply the patch in the master process.

    Runs once before workers are forked, so every worker inherits the patched
    ``Response`` class.
    """
    _install_server_header_suppression()


def post_fork(server, worker):
    """Gunicorn ``post_fork`` hook -- ensure the patch is applied per worker.

    Belt-and-suspenders alongside :func:`on_starting`: guarantees the
    suppression is active in each worker regardless of preload/fork semantics.
    Idempotent via the sentinel in :func:`_install_server_header_suppression`.
    """
    _install_server_header_suppression()
