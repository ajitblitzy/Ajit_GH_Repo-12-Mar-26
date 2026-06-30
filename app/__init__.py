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
from werkzeug.routing import Rule

from .config import Config
from .routes import bp


class _AnyMethodRule(Rule):
    """URL rule that matches **every** HTTP method (true method-agnostic routing).

    Parity rationale (AAP sections 0.1.1, 0.7.2; F-002-RQ-004):
        The original Node core-``http`` callback never inspected the request
        method, so it answered EVERY verb -- standard (GET/POST/...), uncommon
        (TRACE/PROPFIND/CONNECT) and arbitrary custom verbs alike -- with the
        same 200 response. Werkzeug's default :class:`~werkzeug.routing.Rule`
        instead matches only the methods a rule was registered for and raises a
        405 ("Method Not Allowed") for anything else.

        Assigning ``methods = None`` tells Werkzeug's routing state machine to
        skip method filtering entirely, so the rule matches ANY verb and the
        catch-all view runs for all of them -- reproducing the Node handler's
        method-agnostic behavior at the ROUTING layer. This is the in-scope way
        to achieve parity (the migration's mandate is a route-/method-agnostic
        catch-all -- AAP sections 0.1.2, 0.3.1); it adds NO error handling,
        middleware, or any other out-of-scope capability (AAP section 0.2.2):
        the application simply never produces a 405 to begin with, exactly like
        the source server.

    Flask coerces a view's ``methods`` into a set during ``add_url_rule``, so
    ``methods=None`` cannot be passed through the route decorator directly;
    overriding it here (right after the base ``__init__``) is the supported
    extension point. The class is installed via ``app.url_rule_class`` in
    :func:`create_app`. HEAD still yields an automatic empty body and the
    explicitly-listed OPTIONS still returns the full body (both handled at the
    response layer, independent of method matching), preserving the AAP F-002
    HEAD/OPTIONS contract.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # None => Werkzeug's routing matcher does not filter by method, so this
        # rule matches ANY HTTP verb and no 405 is ever raised.
        self.methods = None


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

    # Make the catch-all genuinely method-agnostic at the ROUTING layer: install
    # the custom URL rule (methods=None) BEFORE registering the blueprint so both
    # catch-all rules match EVERY HTTP verb -- standard, uncommon, or arbitrary
    # custom -- and Werkzeug never raises a 405. This reproduces the original
    # Node handler, which ignored the request method entirely, WITHOUT adding any
    # error handling or other out-of-scope capability (AAP sections 0.2.2, 0.7.2;
    # F-002-RQ-004). Ordering matters: Flask builds each blueprint rule using
    # app.url_rule_class at registration time, so it must be set first.
    app.url_rule_class = _AnyMethodRule
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
        # server level by the serving-layer shims in `wsgi.py`:
        # `_install_wsgi_server_header_parity()` makes waitress and gunicorn emit
        # no 'Server' header (intrinsically, with no operator flag required), and
        # `_NoServerHeaderRequestHandler` does the same for the direct-run
        # `python wsgi.py` path. Together they make "no Server header" an
        # intrinsic property of the `wsgi:app` artifact across every serving path.
        # This pop remains as defense-in-depth and keeps responses clean under the
        # Flask test_client, which has no server layer of its own.
        response.headers.pop("Server", None)
        return response

    return app
