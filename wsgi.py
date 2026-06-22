"""WSGI entrypoint for the migrated Flask application.

This module is the Python/Flask port of the *server bootstrap* portion of the
original Node.js server (``server.js`` lines 12-13)::

    server.listen(port, hostname, () => {
      console.log(`Server running at http://${hostname}:${port}/`);
    });

It fulfills the final two responsibilities of the in-place Node.js -> Python 3 /
Flask migration:

* **F-003 (host/port binding)** -- bind exclusively to the loopback interface
  ``127.0.0.1`` on TCP port ``3000`` (values sourced from
  :class:`app.config.Config`, identical to ``server.js`` lines 3-4).
* **F-004 (startup log)** -- emit the exact line
  ``Server running at http://127.0.0.1:3000/`` to stdout, byte-for-byte
  identical to the Node implementation (``server.js`` line 13), and -- crucially
  -- ONLY after the socket has successfully bound, mirroring Node's
  ``server.listen(port, host, callback)`` semantics where the callback (which
  logs) fires solely on a successful listen.

Design (AAP Section 0.3.3 -- WSGI Entrypoint Separation)
--------------------------------------------------------
Application *creation* lives in the :func:`app.create_app` factory; this file
only handles *serving*. The separation is what enables the performance objective
(AAP Section 0.6.3, lever **P-1**): because a module-level WSGI callable named
``app`` is exposed here, a production WSGI server can import and serve it with
real concurrency, for example::

    # Linux / Unix -- multiple worker processes
    gunicorn --workers 4 --bind 127.0.0.1:3000 wsgi:app

    # Cross-platform / Windows -- thread pool
    waitress-serve --ident= --listen=127.0.0.1:3000 wsgi:app

Server-header byte-parity (AAP Section 0.9.2)
---------------------------------------------
Node's core ``http`` server sends no ``Server`` response header; Werkzeug,
gunicorn, and waitress each add one. For byte-parity the header is suppressed at
the serving layer (the only place it can be removed -- it is injected after the
Flask response is produced), and every supported serving path handles it within
the AAP-scoped files:

* **dev server** (``python wsgi.py``) -- the custom request handler
  :class:`_NoServerHeaderWSGIRequestHandler` below omits the header.
* **waitress** -- the ``--ident=`` argument (empty identity) omits the header.
* **gunicorn** -- :func:`_suppress_gunicorn_server_header` below patches
  gunicorn's response-header construction. It runs at import time but ONLY when
  this module is being imported *by gunicorn* (i.e. ``gunicorn wsgi:app``), so
  the dev-server, test, and waitress paths incur no side effects and take on no
  dependency on gunicorn internals.

Running this file directly provides a convenience fallback that mirrors the
original ``node server.js`` invocation::

    python wsgi.py

It binds ``127.0.0.1:3000`` first and, only on a successful bind, prints the
startup line and then serves forever via Werkzeug's WSGI server
(:func:`werkzeug.serving.make_server`). The server is created directly rather
than via ``app.run()``/``run_simple`` so that no development-server banner,
"development server" warning, or per-request access log is emitted -- the
process writes ONLY the single required startup line to stdout, matching the
Node process's operational output (AAP Section 0.9.1 / F-004). The debugger and
auto-reloader are likewise never engaged (AAP Section 0.6.3, lever **P-3**, so
no development-server overhead is incurred).

Import safety
-------------
Importing this module (e.g. ``from wsgi import app, startup_message``) has **no
side effects beyond building the application object** (and, under gunicorn only,
installing the header patch) -- it never starts a server. Serving happens *only*
via :func:`serve`, invoked under the ``if __name__ == "__main__":`` guard. This
keeps the module safe to import from tests and from WSGI servers alike.

Deliberate non-responsibilities (out of scope -- AAP Sections 0.2.2 / 0.6.1;
must NOT be added here): routing or HTTP-method differentiation, request/body
parsing, middleware, error handling, ``SIGINT``/``SIGTERM`` graceful-shutdown
handling (issues I-2 / I-3 are intentionally left unimplemented to preserve
exact parity), TLS/HTTPS, CORS, rate limiting, and structured logging
frameworks. The HTTP contract itself (status ``200``, ``Content-Type:
text/plain`` without a charset suffix, body ``Hello, World!\\n`` for every path
and method) is owned by the ``app/`` package; this entrypoint merely serves it.
"""

import sys

from werkzeug.serving import WSGIRequestHandler, make_server

from app import create_app
from app.config import Config

# ---------------------------------------------------------------------------
# Module-level WSGI callable (CRITICAL for production serving).
#
# Named *exactly* ``app`` at module scope so production WSGI servers can locate
# it via the ``wsgi:app`` import string -- e.g. ``gunicorn ... wsgi:app`` or
# ``waitress-serve ... wsgi:app`` (AAP Section 0.3.3; performance lever P-1).
#
# Building the application here (rather than inside the ``__main__`` guard) is
# what makes the callable importable; the factory has no side effects, so
# importing this module never starts a server.
# ---------------------------------------------------------------------------
app = create_app()


def startup_message() -> str:
    """Return the exact server-startup log line.

    Ports the template-literal log statement from ``server.js`` line 13
    (``console.log(`Server running at http://${hostname}:${port}/`)``) and
    reproduces it byte-for-byte (feature **F-004**).

    The host and port are read from :class:`app.config.Config` -- the same
    single source of truth used to bind the server -- guaranteeing the logged
    address can never drift from the address actually served. With the migrated
    defaults ``Config.HOST == '127.0.0.1'`` and ``Config.PORT == 3000`` the
    returned value is exactly::

        Server running at http://127.0.0.1:3000/

    This helper is intentionally pure (no I/O, no side effects) so the
    behavioral-parity test suite (``tests/test_app.py``) can assert the exact
    string without having to start a blocking server.

    Returns:
        str: The startup banner, formatted as
        ``"Server running at http://{HOST}:{PORT}/"``.
    """
    return f"Server running at http://{Config.HOST}:{Config.PORT}/"


def _suppress_gunicorn_server_header():
    """Patch gunicorn so its responses omit the ``Server`` header (byte-parity).

    Node's core ``http`` server sends **no** ``Server`` response header; gunicorn
    injects ``Server: gunicorn/<version>`` for every response. It builds the
    line in ``gunicorn.http.wsgi.Response.default_headers()`` and writes it ahead
    of the application's WSGI headers -- i.e. at the SERVING layer, *after* the
    Flask application has produced its response -- so it cannot be removed by a
    Flask ``after_request`` hook or by any WSGI middleware. It must be suppressed
    in gunicorn itself (AAP Section 0.9.2).

    Without a dedicated gunicorn config file (one would fall outside the frozen
    AAP file plan), the single AAP-scoped injection point that gunicorn always
    exercises is the import of the ``wsgi:app`` callable -- this very module.
    This helper is therefore invoked once at import time, but it is carefully
    scoped so it is a pure no-op everywhere except under gunicorn:

    * It returns immediately unless ``gunicorn`` is already imported
      (``"gunicorn" in sys.modules``). That is true precisely when this module
      is being loaded by the ``gunicorn`` console script (``gunicorn wsgi:app``)
      and false for ``python wsgi.py``, the pytest suite, and
      ``waitress-serve``. Those paths thus take on no side effects and no
      gunicorn dependency.
    * gunicorn is Linux/Unix-only (``gunicorn.util`` imports the Unix-only
      ``fcntl`` module), so the deferred ``import`` is wrapped defensively; on
      Windows or any environment without gunicorn it can never raise.
    * A sentinel attribute makes the wrap idempotent, so repeated imports across
      forked workers never double-strip.

    The pure header-filtering itself preserves every other header (status line,
    ``Date``, ``Connection``, ``Content-Length``, the application's
    ``Content-Type``) and drops only the ``Server:`` line, yielding output
    byte-identical to Node's core ``http`` and consistent with the dev-server
    and waitress paths.
    """
    # Only meaningful when this module is being imported *by* gunicorn; for the
    # dev server, tests, and waitress this is a guaranteed no-op.
    if "gunicorn" not in sys.modules:
        return

    try:
        from gunicorn.http import wsgi as gunicorn_wsgi
    except Exception:
        # gunicorn is Linux/Unix-only (imports fcntl); never break import here.
        return

    response_cls = gunicorn_wsgi.Response
    marker = "_parity_no_server_header_patched"
    if getattr(response_cls, marker, False):
        return  # Already patched in this process; idempotent.

    _original_default_headers = response_cls.default_headers

    def default_headers(self):
        # Reuse gunicorn's own header construction, then drop the Server line.
        return [
            line
            for line in _original_default_headers(self)
            if not line.lower().startswith("server:")
        ]

    response_cls.default_headers = default_headers
    setattr(response_cls, marker, True)


# Apply gunicorn's Server-header parity at import time. Guarded inside the helper
# so it activates ONLY under gunicorn (``gunicorn wsgi:app``); for ``python
# wsgi.py``, the test client, and waitress it returns immediately and changes
# nothing (no side effects, no gunicorn import). See AAP Section 0.9.2.
_suppress_gunicorn_server_header()


class _NoServerHeaderWSGIRequestHandler(WSGIRequestHandler):
    """Werkzeug dev-server request handler tuned for exact Node parity.

    Used only by the direct-run path (:func:`serve`). It makes two adjustments
    so the development server's observable behavior matches Node's core ``http``
    server:

    1. **No ``Server`` header.** The standard library's
       ``BaseHTTPRequestHandler.send_response()`` adds a
       ``Server: Werkzeug/<ver> Python/<ver>`` response header. Node sends no
       ``Server`` header, so for byte-parity (AAP Section 0.9.2) it is dropped
       here -- at the serving layer, the ONLY place it can be removed. A Flask
       ``after_request`` hook cannot do this because the server injects the
       header after the Flask response has been produced. Overriding
       :meth:`send_header` to skip the ``Server`` field leaves every other
       header (``Date``, ``Content-Type``, ``Content-Length``, ``Connection``)
       untouched, matching the header set Node emits, minus ``Server``.
    2. **No per-request access log.** :meth:`log_request` is overridden to a
       no-op so the server does not write a ``"GET / HTTP/1.1" 200 -`` style
       line per request. Node's core ``http`` server emits no such per-request
       output, so suppressing it keeps the process's operational output to ONLY
       the single startup line (AAP Section 0.9.1 / F-004; review finding on
       direct-run output parity).
    """

    def send_header(self, keyword, value):
        # Drop the auto-added Server header; pass every other header through.
        if keyword.lower() == "server":
            return
        super().send_header(keyword, value)

    def log_request(self, code="-", size="-"):
        # Suppress the dev server's per-request access log line. Node's core
        # http server prints nothing per request, so for operational-output
        # parity (a single startup line and nothing else) this is a no-op.
        return


def serve():
    """Bind ``127.0.0.1:3000``, then -- only on success -- log and serve forever.

    This is the Python equivalent of ``server.listen(port, hostname, callback)``
    from ``server.js`` lines 12-13, and it reproduces that call's operational
    semantics exactly:

    1. **Bind first.** :func:`werkzeug.serving.make_server` creates the WSGI
       server and binds the listening socket inside its constructor. If the bind
       fails -- e.g. port ``3000`` is already in use -- it raises ``OSError``
       *here*, before anything is printed. This mirrors Node, whose
       ``server.listen`` callback (which logs) does NOT fire on a failed bind, so
       the success banner is never emitted when the server cannot come up
       (review finding F1; AAP Section 0.9.1 / F-004).
    2. **Then log.** Only after a successful bind is the exact startup line
       printed (feature **F-004**). ``flush=True`` forces the line out
       immediately: :meth:`serve_forever` below blocks indefinitely, and Python
       block-buffers stdout when it is redirected to a pipe/file, so without an
       explicit flush the banner could remain trapped in the buffer behind the
       never-returning server. Flushing preserves F-004 parity in
       redirected/captured contexts and mirrors Node's ``console.log``.
    3. **Then serve.** :meth:`serve_forever` handles requests until the process
       is terminated. Going through ``make_server`` rather than ``app.run()``
       deliberately bypasses Werkzeug's ``run_simple``, which would otherwise
       print a startup banner and a "development server" warning and log every
       request -- output the Node process never produces. Combined with the
       request handler's silenced :meth:`log_request`, the process emits ONLY
       the single startup line (review finding F2; AAP Section 0.9.1).

    The server binds to ``Config.HOST:Config.PORT`` = ``127.0.0.1:3000`` --
    loopback only, never ``0.0.0.0`` (AAP Section 0.2.2) -- sourced from
    :class:`~app.config.Config` so the bound address always matches the logged
    one. ``threaded=True`` matches the default of the ``app.run()`` call this
    replaces, preserving concurrent request handling; it affects the serving
    model only and never alters a response. No debugger or auto-reloader is
    engaged (AAP Section 0.6.3, lever **P-3**).
    """
    # 1. Create + bind the server. make_server binds the socket in its
    #    constructor, so a failed bind (e.g. port in use) raises OSError HERE,
    #    before the banner is printed -- matching Node's listen callback, which
    #    only fires on a successful bind.
    server = make_server(
        Config.HOST,
        Config.PORT,
        app,
        threaded=True,
        request_handler=_NoServerHeaderWSGIRequestHandler,
    )

    # 2. Bind succeeded -> emit the exact startup line (F-004). flush=True so the
    #    line is observable immediately even when stdout is redirected, since
    #    serve_forever() below never returns.
    print(startup_message(), flush=True)

    # 3. Serve indefinitely. make_server + serve_forever emit no dev-server
    #    banner/warning, and the request handler suppresses per-request access
    #    logs, so stdout/stderr carry ONLY the startup line above.
    server.serve_forever()


if __name__ == "__main__":
    # Direct-invocation path (``python wsgi.py``) -- the Python equivalent of
    # ``node server.js``. All binding/logging/serving lives in serve() so its
    # bind-then-log ordering is unit-testable (see tests/test_app.py) without
    # starting a real, blocking server.
    serve()
