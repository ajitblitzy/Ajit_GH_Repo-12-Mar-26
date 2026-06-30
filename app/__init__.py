"""Application package for the Flask (WSGI) port of the original Node.js server.

This module is BOTH the ``app`` package marker (it makes ``app/`` an importable
Python package) AND the home of the **application factory** (``create_app``),
applying the Application Factory pattern (AAP section 0.3.3).

It replaces the ``http.createServer(...)`` wiring from the original Node.js
implementation (``server.js`` line 6)::

    const server = http.createServer((req, res) => { ... });

and preserves feature **F-001** (server/application creation). By exposing a
testable factory instead of a side-effecting top-level script, it also resolves
source issue **I-4** (the original ``server.js`` could not be imported or unit
tested).

Importing this package has **no side effects** beyond defining
:func:`create_app`: it does NOT instantiate an app at import time and does NOT
start a server. The module-level ``app = create_app()`` WSGI callable lives in
``wsgi.py`` (consumed by gunicorn/waitress), and the test suite builds its own
instance via ``create_app().test_client()``.

Consumers:
    * ``wsgi.py`` -- ``from app import create_app`` then ``app = create_app()``.
    * ``tests/test_app.py`` -- ``from app import create_app`` then
      ``app.test_client()`` for behavioral-parity assertions.
"""

from flask import Flask

from .config import Config
from .routes import bp


def create_app():
    """Application factory: build, configure, and return the Flask app.

    Replaces the http.createServer(...) wiring from the original Node.js
    server (server.js line 6). Loads HOST/PORT from Config and registers
    the catch-all blueprint that reproduces the static 'Hello, World!\\n'
    response for every path and HTTP method (F-001 + F-002).
    """
    # static_folder=None disables Flask's default `/static/<path:filename>`
    # route. That auto-registered rule is MORE specific than the blueprint
    # catch-all `/<path:path>`, so leaving it active would shadow `/static/...`
    # requests (returning 404 text/html for GET and an empty text/html response
    # for OPTIONS) and break F-002 route/method-agnostic byte parity. Disabling
    # it lets EVERY path -- including `/static/...` -- fall through to the
    # catch-all view and return the identical 200 / text/plain /
    # b"Hello, World!\n" response, exactly as the original Node.js handler did.
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)
    app.register_blueprint(bp)

    @app.after_request
    def _normalize_headers(response):
        # App-level layer of the 'Server'-header byte-parity contract (AAP
        # §0.9.2): Node's core `http` server sends no 'Server' header, so we
        # ensure the Flask *application* never emits one either.
        #
        # IMPORTANT -- this hook alone is NOT sufficient at serving time. Real
        # WSGI servers (Werkzeug's dev server, waitress, gunicorn) add their own
        # 'Server' header AFTER Flask response processing, so after_request can
        # never see or remove the server-added value. That is handled at the
        # server level per serving path: the direct-run path (`python wsgi.py`)
        # installs a custom Werkzeug request handler that suppresses it, and
        # `waitress-serve --ident=` emits no 'Server' header (the recommended
        # cross-platform production path). This pop remains as defense-in-depth
        # and keeps responses clean under the Flask test_client, which has no
        # server layer of its own.
        response.headers.pop("Server", None)
        return response

    return app
