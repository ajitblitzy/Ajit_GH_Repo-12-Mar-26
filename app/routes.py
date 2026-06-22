"""Blueprint hosting the single catch-all view for the Flask HTTP server.

This module is the Python/Flask port of the inline request handler from the
original Node.js server (``server.js`` lines 6-9)::

    const server = http.createServer((req, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Hello, World!\\n');
    });

It preserves feature **F-002** (static response; route- and method-agnostic)
with BYTE-FOR-BYTE parity (AAP Sections 0.9.1 / 0.9.2): every request -- for
*any* path and *any* HTTP method -- receives HTTP ``200``, a
``Content-Type: text/plain`` header (with NO ``; charset=utf-8`` suffix), and
the exact body ``Hello, World!\\n`` (14 bytes).

The blueprint is intentionally minimal: it adds no routing differentiation,
no method differentiation, no error handling, no middleware, and no logging,
in keeping with the migration's exact-parity scope (AAP Sections 0.2.2 / 0.6.1).
The application factory in ``app/__init__.py`` registers this blueprint via
``from .routes import bp``.
"""

from flask import Blueprint, Response
from werkzeug.routing import Rule

# Single blueprint that owns the catch-all route; registered by create_app().
bp = Blueprint("main", __name__)

# Precomputed response body (bytes) for minimal per-request work (AAP §0.6.3 P-2).
# Exactly mirrors server.js line 9: res.end('Hello, World!\n').
_BODY = b"Hello, World!\n"

# Blueprint-namespaced endpoint shared by the URL rules and the view-function
# registration in _register_catch_all() below.
_ENDPOINT = "main.catch_all"


def catch_all(path):
    """Return the static plain-text response for every path and method.

    Ports server.js lines 7-9 (statusCode=200; Content-Type text/plain;
    body 'Hello, World!\\n'). content_type is set explicitly so Werkzeug
    does NOT append '; charset=utf-8'.

    The function never inspects the matched ``path`` or the request method --
    exactly like the original Node handler (server.js lines 6-9), which read
    neither ``req.url`` nor ``req.method`` and answered every request the same
    way.
    """
    return Response(_BODY, status=200, content_type="text/plain")


@bp.record_once
def _register_catch_all(setup_state):
    """Register the catch-all view for EVERY path and EVERY HTTP method.

    Why not ``@bp.route(..., methods=[...])``? Flask's ``add_url_rule`` always
    reduces ``methods`` to a *finite* set, so any method token NOT in that set
    (e.g. ``TRACE``, ``PROPFIND``, ``MKCOL``, or any custom verb) would get a
    Flask ``405 Method Not Allowed`` instead of the parity response. The
    original Node ``http.createServer`` handler never inspected the method and
    answered EVERY method identically (server.js lines 6-9), so a finite list
    breaks exact behavioral parity (F-002; AAP Sections 0.9.1 / 0.9.2).

    To reproduce Node's behavior exactly, the catch-all is registered as
    Werkzeug :class:`~werkzeug.routing.Rule` objects with ``methods=None``. A
    rule whose ``methods`` is ``None`` matches ANY HTTP method token, so the
    view is dispatched for every method:

    * ``HEAD`` still returns an empty body -- Werkzeug's
      ``Response.get_app_iter`` strips the body based on ``REQUEST_METHOD``,
      independent of routing -- matching Node, which also suppresses HEAD
      bodies.
    * ``OPTIONS`` is answered with the same parity body. Because no rule lists
      ``OPTIONS`` explicitly, Werkzeug adds no automatic-OPTIONS handler and
      therefore no ``Allow`` header -- matching Node, which sends neither.

    Two rules cover the whole URL space: ``/`` (with ``path=""`` supplied via
    ``defaults`` so :func:`catch_all` always receives its argument) and
    ``/<path:path>`` for every other path, nested paths included. There is no
    implicit ``/static`` route to intercept any path (the factory builds the
    app with ``static_folder=None``), so EVERY path reaches this view.

    Registration is deferred to blueprint-registration time via
    ``record_once`` so the rules are added to the application's URL map exactly
    once, when ``create_app()`` calls ``app.register_blueprint(bp)``.

    Args:
        setup_state: The Flask blueprint setup state provided at registration;
            ``setup_state.app`` is the application receiving the rules.
    """
    app = setup_state.app
    # Bind the blueprint-namespaced endpoint to the catch-all view function.
    app.view_functions[_ENDPOINT] = catch_all
    # Root path: defaults={"path": ""} guarantees catch_all(path) gets an arg.
    app.url_map.add(
        Rule("/", defaults={"path": ""}, endpoint=_ENDPOINT, methods=None)
    )
    # Every other path (nested paths and what would have been /static/* too).
    app.url_map.add(Rule("/<path:path>", endpoint=_ENDPOINT, methods=None))
