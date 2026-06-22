"""Application package and Flask application factory for the migration target.

This module serves a dual role in the in-place Node.js -> Python 3 / Flask
migration:

1. As ``app/__init__.py`` it is the **package marker** that makes ``app/`` an
   importable Python package, so ``from app import create_app`` resolves from
   the repository root.
2. It hosts the **application factory** (``create_app``) implementing the
   Application Factory pattern (AAP Section 0.3.3).

It is the Python/Flask port of the server-creation wiring from the original
Node.js server (``server.js`` line 6)::

    const server = http.createServer((req, res) => { ... });

and therefore preserves feature **F-001** (HTTP server / application creation).
By exposing a parameterless factory instead of running code at import time, it
also resolves source issue **I-4**: the original ``server.js`` was a
side-effecting script with no exports and could not be imported or unit-tested.
The factory makes the application unit-testable via ``app.test_client()``.

Responsibilities (kept intentionally thin):

* Construct the Flask application with ``Flask(__name__, static_folder=None)``
  (the implicit ``/static`` route is disabled so every path hits the catch-all).
* Load configuration from the :class:`~app.config.Config` object, which carries
  the loopback ``HOST``/``PORT`` defaults migrated from ``server.js`` lines 3-4
  (feature **F-003**).
* Register the single catch-all blueprint from :mod:`app.routes`, which returns
  the static ``Hello, World!\\n`` response for every path and HTTP method
  (feature **F-002**).
* Install one ``after_request`` hook that strips any ``Server`` header from the
  application-level response object. NOTE: WSGI servers (Werkzeug / gunicorn /
  waitress) inject their OWN ``Server`` header *after* the Flask response is
  produced, so this hook cannot remove the server-injected one by itself. The
  serving-time ``Server`` suppression required for byte-parity with Node's core
  ``http`` (which emits no ``Server`` header) is implemented at the serving
  layer instead: in ``wsgi.py`` for both the Werkzeug dev server (a custom
  request handler) and gunicorn (a guarded patch applied only when serving
  under gunicorn), plus the waitress ``--ident=`` invocation -- see AAP
  Section 0.9.2.

Deliberate non-responsibilities (out of scope, AAP Sections 0.2.2 / 0.6.1 — must
NOT be added here): route or HTTP-method differentiation, error handlers,
request/body parsing, middleware pipelines, signal/graceful-shutdown handling
(issues I-2 / I-3 are intentionally left unimplemented to preserve exact
parity), TLS, CORS, environment-variable configuration, and logging frameworks.
The factory adds no server startup either: importing this package has **no side
effects** beyond defining ``create_app``. The module-level WSGI callable
(``app = create_app()``) and the ``server.listen``/startup-log equivalent live
in ``wsgi.py``, never here.

Consumers:

* ``wsgi.py`` -> ``from app import create_app`` then ``app = create_app()`` to
  expose the module-level WSGI callable for gunicorn / waitress, and
  ``app.run(host=Config.HOST, port=Config.PORT, ...)`` under ``__main__``.
* ``tests/test_app.py`` -> ``from app import create_app`` then
  ``create_app().test_client()`` for behavioral-parity assertions.
"""

from flask import Flask

from .config import Config
from .routes import bp


def create_app():
    """Build, configure, and return the Flask application.

    Application factory implementing the pattern described in AAP Section
    0.3.3. Replaces the ``http.createServer(...)`` wiring from the original
    Node.js server (``server.js`` line 6) and preserves feature **F-001**.

    The factory performs exactly three configuration steps plus one
    byte-parity hook, in order:

    1. ``Flask(__name__, static_folder=None)`` -- instantiate the application
       bound to this package, with Flask's implicit
       ``/static/<path:filename>`` route DISABLED so that every path is handled
       by the catch-all blueprint (F-002 "every path" parity), not by static
       file serving.
    2. ``app.config.from_object(Config)`` -- load configuration from
       :class:`~app.config.Config`. Only UPPERCASE attributes are imported,
       so ``HOST`` (``'127.0.0.1'``) and ``PORT`` (``3000``) are picked up
       while preserving the loopback defaults migrated from ``server.js``
       lines 3-4 (feature **F-003**).
    3. ``app.register_blueprint(bp)`` -- register the single catch-all
       blueprint from :mod:`app.routes`, reproducing the static
       ``Hello, World!\\n`` response for every path and HTTP method
       (feature **F-002**).

    A single ``after_request`` hook then normalizes the application-level
    response headers (see :func:`_normalize_headers`); the serving-layer
    ``Server``-header suppression required for byte-parity lives in ``wsgi.py``
    (covering both the Werkzeug dev server and gunicorn) plus the waitress
    ``--ident=`` invocation.

    Returns:
        flask.Flask: A fully configured application instance, ready to be
        served by a WSGI server or exercised via ``app.test_client()``. The
        factory never starts a server and has no other side effects.
    """
    # static_folder=None disables Flask's implicit /static/<path:filename>
    # route. That route would otherwise take precedence for /static/* and
    # return 404 (or serve files) instead of the catch-all parity response,
    # breaking the "every path" contract and introducing out-of-scope static
    # file handling (AAP Sections 0.2.2 / 0.9.1). Disabled, EVERY path reaches
    # the catch-all blueprint.
    app = Flask(__name__, static_folder=None)

    # Load the loopback HOST/PORT defaults (F-003). from_object reads only the
    # UPPERCASE attributes (HOST, PORT) from the Config class.
    app.config.from_object(Config)

    # Register the catch-all blueprint that owns the single static response
    # (F-002). All routing/method handling lives in app/routes.py, never here.
    app.register_blueprint(bp)

    @app.after_request
    def _normalize_headers(response):
        """Strip any ``Server`` header from the application-level response.

        Node's core ``http`` server sends no ``Server`` header by default; this
        hook removes one from the Flask response object as an app-level
        normalization (defense-in-depth).

        IMPORTANT: this hook alone does NOT achieve serving-time byte-parity.
        Real WSGI servers (Werkzeug's dev server, gunicorn, waitress) inject
        their own ``Server`` header when they write the HTTP response, *after*
        this hook has already run, so the value they add cannot be removed
        here. The serving-layer suppression that actually secures byte-parity
        (AAP Section 0.9.2) is implemented where each server is configured:
        ``wsgi.py`` provides a custom request handler for the Werkzeug dev
        server and a guarded gunicorn patch, while waitress uses its
        ``--ident=`` invocation. Under Flask's ``test_client`` (which adds no
        ``Server`` header) this hook is a no-op.

        Args:
            response (flask.Response): The outbound response to normalize.

        Returns:
            flask.Response: The same response with any app-level ``Server``
            header removed.
        """
        response.headers.pop("Server", None)
        return response

    return app
