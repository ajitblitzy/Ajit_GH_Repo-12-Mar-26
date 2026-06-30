"""Catch-all route blueprint for the Flask (WSGI) migration of ``server.js``.

This module ports the inline Node.js request handler (``server.js`` lines 6-9)::

    const server = http.createServer((req, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Hello, World!\\n');
    });

into a Flask :class:`~flask.Blueprint` exposing a single *catch-all* view that
answers **every** path and **every** HTTP method with a byte-for-byte identical
static response (feature F-002; AAP sections 0.1, 0.3, 0.4, 0.9).

Behavioral contract reproduced EXACTLY (AAP section 0.9.1 / 0.9.2):

* Status ``200`` for any request, regardless of path or method.
* ``Content-Type: text/plain`` with **no** ``; charset=utf-8`` suffix. This is
  precisely why the view sets ``content_type=`` rather than ``mimetype=``:
  Werkzeug appends the charset for ``mimetype=`` but emits the bare value for
  ``content_type=`` (empirically verified against Flask 3.1.3 / Werkzeug 3.1.8).
* Body of exactly ``Hello, World!\\n`` (13 visible characters + trailing
  newline = 14 bytes).

The blueprint is intentionally route- and method-agnostic: it never branches on
the request path or method, and introduces no error handling, request parsing,
authentication, CORS, middleware, or logging. This minimal surface preserves
exact parity with the original handler (AAP sections 0.2.2, 0.6.1).
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
