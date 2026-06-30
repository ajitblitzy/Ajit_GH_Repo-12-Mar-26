"""WSGI entrypoint for the Flask (WSGI) port of the original Node.js server.

This module is the serving boundary of the migrated application. It fulfills two
distinct responsibilities, mirroring the two roles that ``server.listen(...)``
played in the original Node.js implementation (``server.js`` lines 12-13)::

    server.listen(port, hostname, () => {
      console.log(`Server running at http://${hostname}:${port}/`);
    });

1. **Production WSGI callable** -- It exposes a module-level ``app`` object so a
   production WSGI server can import and serve it. Both supported servers locate
   the application via the ``wsgi:app`` import string using command-line options
   only (no extra server-config module is required)::

       waitress-serve --ident= --listen=127.0.0.1:3000 wsgi:app   # cross-platform (threads)
       gunicorn --workers 4 --bind 127.0.0.1:3000 wsgi:app        # Linux/Unix (multi-worker)

   Running under a multi-worker/multi-threaded WSGI server is the primary
   performance lever of this migration (AAP section 0.6.3, P-1; section 0.3.3
   "WSGI Entrypoint Separation"): it enables concurrent request handling without
   altering any observable response.

   Server-header byte-parity (AAP section 0.9.2): Node's core ``http`` server
   sends no ``Server`` response header, but a WSGI server typically adds its own
   *after* the Flask app has produced the response -- so an app-level
   ``after_request`` hook alone cannot remove it. The two serving paths that run
   in this project's environment suppress the header using only declared files
   and accepted command-line options: ``waitress`` via ``--ident=`` (an empty
   identity emits no ``Server`` header), and the direct-run path below via
   :class:`_NoServerHeaderRequestHandler`. ``waitress`` is therefore the
   recommended cross-platform path (including Windows) for strict header parity;
   ``gunicorn`` is offered as the Linux multi-worker performance option.

2. **Direct-run entrypoint** -- When executed directly (``python wsgi.py``) it
   binds the loopback interface FIRST and prints the exact startup line only
   after the bind succeeds, exactly reproducing the original Node.js behavior in
   which ``console.log`` ran *inside* the ``server.listen`` callback -- i.e.
   after the socket was ready (features F-003 host/port + F-004 startup log).

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

from werkzeug.serving import WSGIRequestHandler, make_server

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
    # Production deployments instead import ``wsgi:app`` under waitress/gunicorn
    # (see module docstring) for concurrent serving.
    #
    # Bind FIRST, log SECOND -- matching Node's semantics (server.js lines
    # 12-13), where console.log ran *inside* the server.listen callback, i.e.
    # only after the socket was successfully bound. werkzeug.serving.make_server
    # binds the socket inside its constructor (server_bind + server_activate);
    # if the port is already in use it prints its own diagnostic and raises
    # SystemExit right there -- BEFORE returning -- so the success banner below
    # is never reached on a failed bind (AAP section 0.9.1 F-004; operational-
    # parity finding). This deliberately leaves an occupied-port bind as an
    # unhandled crash, exactly like the original Node server, which had no
    # 'error' listener (AAP section 0.6.1 issues I-2/I-3: error handling and
    # graceful shutdown are intentionally NOT added).
    #
    # Bind exclusively to the loopback interface and port from Config
    # (127.0.0.1:3000) -- network parity with the original (F-003). NEVER bind
    # 0.0.0.0 or any public interface (AAP section 0.2.2).
    #
    # threaded=True matches Flask's app.run default (which sets threaded=True),
    # preserving the direct-run concurrency behavior unchanged. make_server uses
    # no debugger and no auto-reloader, so development-server overhead is absent
    # (AAP section 0.6.3, P-3) -- these affect only the serving model, never the
    # byte-identical response.
    #
    # request_handler=_NoServerHeaderRequestHandler installs the custom handler
    # that suppresses Werkzeug's auto-added 'Server' header, restoring exact
    # byte-parity with the original Node server for this direct-run path (AAP
    # section 0.9.2).
    server = make_server(
        Config.HOST,
        Config.PORT,
        app,
        threaded=True,
        request_handler=_NoServerHeaderRequestHandler,
    )

    # Reached ONLY after a successful bind above. Emit the exact startup line
    # (F-004), then hand control to the serve loop. serve_forever() blocks,
    # dispatching requests until interrupted; it catches KeyboardInterrupt and
    # closes the listening socket cleanly on Ctrl+C.
    print(startup_message())
    server.serve_forever()
