"""WSGI entrypoint for the Flask (WSGI) port of the original Node.js server.

This module is the serving boundary of the migrated application. It fulfills two
distinct responsibilities, mirroring the two roles that ``server.listen(...)``
played in the original Node.js implementation (``server.js`` lines 12-13)::

    server.listen(port, hostname, () => {
      console.log(`Server running at http://${hostname}:${port}/`);
    });

1. **Production WSGI callable** -- It exposes a module-level ``app`` object so a
   production WSGI server can import and serve it. Both supported servers locate
   the application via the ``wsgi:app`` import string::

       gunicorn --config gunicorn.conf.py --bind 127.0.0.1:3000 wsgi:app  # Linux/Unix (multi-worker)
       waitress-serve --ident= --listen=127.0.0.1:3000 wsgi:app           # cross-platform (threads)

   Running under a multi-worker/multi-threaded WSGI server is the primary
   performance lever of this migration (AAP section 0.6.3, P-1; section 0.3.3
   "WSGI Entrypoint Separation"): it enables concurrent request handling without
   altering any observable response.

   Server-header byte-parity (AAP section 0.9.2): Node's core ``http`` server
   sends no ``Server`` response header, but every WSGI server adds its own
   *after* the Flask app has produced the response -- so an app-level
   ``after_request`` hook cannot remove it. Each documented serving path is
   therefore configured at the server level to suppress that header:
   ``gunicorn`` via ``gunicorn.conf.py`` (drops the auto-added ``Server:``
   line), ``waitress`` via ``--ident=`` (empty identity emits no ``Server``
   header), and the direct-run path below via
   :class:`_NoServerHeaderRequestHandler`.

2. **Direct-run entrypoint** -- When executed directly (``python wsgi.py``) it
   prints the exact startup line and then binds the loopback interface, exactly
   reproducing the original Node.js behavior (features F-003 host/port + F-004
   startup log).

Host and port are NOT hardcoded here; they are read from
:class:`app.config.Config` (``HOST='127.0.0.1'``, ``PORT=3000``), which is the
single source of truth ported from ``server.js`` lines 3-4. This keeps the bind
address and the startup-log line in lock-step with the values the Flask
application factory loads, guaranteeing they can never diverge.

Import-safety contract (CRITICAL):
    Importing this module (e.g. ``from wsgi import app, startup_message`` -- as
    a WSGI server or the test suite does) constructs the Flask application via
    :func:`app.create_app` but MUST NOT start a server and MUST NOT block. All
    network binding happens strictly inside the ``if __name__ == "__main__"``
    guard, so production servers stay in full control of the serving model.

Scope guard (parity mandate -- AAP sections 0.2.2, 0.6.1):
    This entrypoint deliberately contains nothing beyond app exposure, the
    single startup print, and the bind call. No routing, request parsing,
    middleware, error handling, signal/graceful-shutdown handling, logging
    frameworks, or TLS is introduced. Source issues I-2 (no error handling) and
    I-3 (no graceful shutdown) are intentionally left unimplemented because
    adding them would change observable behavior and break exact parity.
"""

from werkzeug.serving import WSGIRequestHandler

from app import create_app
from app.config import Config

# Module-level WSGI application callable.
#
# This name MUST remain exactly ``app`` so the ``wsgi:app`` import string used by
# gunicorn and waitress resolves correctly (AAP section 0.3.3). Constructing it
# at import time is intentional and side-effect-free: create_app() only builds
# and configures the Flask app (registering the catch-all blueprint); it does
# NOT bind a socket or start serving. This is what lets a production WSGI server
# import the ready-to-serve application and manage concurrency itself.
app = create_app()


def startup_message() -> str:
    """Return the exact startup-log line, byte-for-byte matching the original.

    Ports ``server.js`` line 13::

        console.log(`Server running at http://${hostname}:${port}/`);

    The line is built from :class:`app.config.Config` so it always reflects the
    same HOST/PORT the application binds to. With the migration's preserved
    defaults (``Config.HOST == '127.0.0.1'`` and ``Config.PORT == 3000``) the
    returned string is exactly::

        Server running at http://127.0.0.1:3000/

    Factoring this into a tiny, side-effect-free helper makes the F-004 startup
    log directly assertable by the behavioral-parity test suite
    (``tests/test_app.py``) without having to launch a blocking server.

    Returns:
        str: The startup banner, e.g. ``"Server running at http://127.0.0.1:3000/"``.
    """
    return f"Server running at http://{Config.HOST}:{Config.PORT}/"


class _NoServerHeaderRequestHandler(WSGIRequestHandler):
    """Werkzeug request handler that omits the auto-added ``Server`` header.

    Byte-parity rationale (AAP section 0.9.2; review finding WSGI-1):
        The original Node.js core-``http`` server emitted **no** ``Server``
        response header. Werkzeug's development server, however, inherits
        :meth:`http.server.BaseHTTPRequestHandler.send_response`, which
        unconditionally writes ``Server: Werkzeug/<ver> Python/<ver>`` (via
        ``self.version_string()``). That header is added by the *server* layer,
        after the Flask application has finished producing the response, so the
        app-level ``after_request`` hook in :func:`app.create_app` cannot reach
        or remove it. Suppressing it must therefore happen here, in the request
        handler -- the only layer with control over the raw response headers for
        the direct-run (``python wsgi.py``) path.

    Implementation:
        Override :meth:`send_header` to silently drop the ``Server`` field while
        delegating every other header to the base implementation. This is
        surgical: the status line, ``Date``, ``Connection`` (including the base
        method's keep-alive/close bookkeeping for the ``Connection`` header),
        ``Content-Type``, ``Content-Length`` and body are all left byte-for-byte
        unchanged. Only the ``Server`` line is removed, restoring exact parity
        with the original Node response.
    """

    def send_header(self, keyword: str, value: str) -> None:  # type: ignore[override]
        # Suppress ONLY the 'Server' header (case-insensitive). All other
        # headers -- and the Connection-tracking side effects the base method
        # performs for the 'Connection' header -- are preserved by delegating
        # to super().send_header for every non-Server field.
        if keyword.lower() == "server":
            return
        super().send_header(keyword, value)


if __name__ == "__main__":
    # Direct-run path (``python wsgi.py``) -- the development/convenience server.
    #
    # Print the startup banner FIRST, mirroring Node's callback that logged only
    # after the socket was ready (server.js lines 12-13), then bind the loopback
    # interface. Production deployments instead import ``wsgi:app`` under
    # gunicorn/waitress (see module docstring) for concurrent serving.
    print(startup_message())

    # Bind exclusively to the loopback interface and port from Config
    # (127.0.0.1:3000) -- network parity with the original (F-003). NEVER bind
    # 0.0.0.0 or any public interface (AAP section 0.2.2).
    #
    # debug=False and use_reloader=False strip development-server overhead and
    # keep a single, predictable process for the direct-run path (AAP section
    # 0.6.3, P-3). These flags affect only the serving model, never the
    # response: the body, status, and headers remain byte-identical.
    #
    # request_handler=_NoServerHeaderRequestHandler installs the custom handler
    # that suppresses Werkzeug's auto-added 'Server' header, restoring exact
    # byte-parity with the original Node server for this direct-run path (AAP
    # section 0.9.2; finding WSGI-1). Flask forwards this option straight to
    # werkzeug.serving.run_simple, which accepts a ``request_handler`` class.
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=False,
        use_reloader=False,
        request_handler=_NoServerHeaderRequestHandler,
    )
