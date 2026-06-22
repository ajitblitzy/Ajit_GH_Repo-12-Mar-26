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
  identical to the Node implementation (``server.js`` line 13).

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
    waitress-serve --listen=127.0.0.1:3000 wsgi:app

Running this file directly provides a convenience fallback that mirrors the
original ``node server.js`` invocation::

    python wsgi.py

which prints the startup line and serves the app on ``127.0.0.1:3000`` via
Flask's built-in server (with the debugger and auto-reloader disabled, AAP
Section 0.6.3, lever **P-3**, so no development-server overhead is incurred).

Import safety
-------------
Importing this module (e.g. ``from wsgi import app, startup_message``) has **no
side effects beyond building the application object** -- it never starts a
server. Serving happens *only* under the ``if __name__ == "__main__":`` guard.
This keeps the module safe to import from tests and from WSGI servers alike.

Deliberate non-responsibilities (out of scope -- AAP Sections 0.2.2 / 0.6.1;
must NOT be added here): routing or HTTP-method differentiation, request/body
parsing, middleware, error handling, ``SIGINT``/``SIGTERM`` graceful-shutdown
handling (issues I-2 / I-3 are intentionally left unimplemented to preserve
exact parity), TLS/HTTPS, CORS, rate limiting, and structured logging
frameworks. The HTTP contract itself (status ``200``, ``Content-Type:
text/plain`` without a charset suffix, body ``Hello, World!\\n`` for every path
and method) is owned by the ``app/`` package; this entrypoint merely serves it.
"""

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


if __name__ == "__main__":
    # Direct-invocation path (``python wsgi.py``) -- the Python equivalent of
    # ``node server.js``. This replaces ``server.listen(port, hostname, cb)``
    # from server.js lines 12-13.
    #
    # 1. Print the exact startup line FIRST, matching the original where the log
    #    accompanies the server coming up (feature F-004). ``flush=True`` forces
    #    the line out immediately: ``app.run()`` below blocks indefinitely, and
    #    Python block-buffers stdout when it is redirected to a pipe/file, so
    #    without an explicit flush the banner could remain trapped in the buffer
    #    behind the never-returning server and never be observed. Flushing
    #    preserves F-004 parity in redirected/captured contexts and mirrors
    #    Node's ``console.log`` behavior.
    print(startup_message(), flush=True)

    # 2. Bind to the loopback interface 127.0.0.1:3000 (feature F-003), sourced
    #    from Config so the bound address matches the logged one exactly. Never
    #    bind to 0.0.0.0 / a public interface (AAP Section 0.2.2). The debugger
    #    and auto-reloader are disabled to avoid development-server overhead
    #    (AAP Section 0.6.3, lever P-3); these flags affect the serving model
    #    only and never alter a response.
    app.run(host=Config.HOST, port=Config.PORT, debug=False, use_reloader=False)
