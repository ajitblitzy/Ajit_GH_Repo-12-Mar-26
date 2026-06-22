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

# Single blueprint that owns the catch-all route; registered by create_app().
bp = Blueprint("main", __name__)

# Precomputed response body (bytes) for minimal per-request work (AAP §0.6.3 P-2).
# Exactly mirrors server.js line 9: res.end('Hello, World!\n').
_BODY = b"Hello, World!\n"

# Every standard HTTP method is handled identically (route/method-agnostic, F-002).
HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]


@bp.route("/", defaults={"path": ""}, methods=HTTP_METHODS)
@bp.route("/<path:path>", methods=HTTP_METHODS)
def catch_all(path):
    """Return the static plain-text response for every path and method.

    Ports server.js lines 7-9 (statusCode=200; Content-Type text/plain;
    body 'Hello, World!\\n'). content_type is set explicitly so Werkzeug
    does NOT append '; charset=utf-8'.
    """
    return Response(_BODY, status=200, content_type="text/plain")
