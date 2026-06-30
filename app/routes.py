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
  precisely why the response sets ``content_type=`` rather than ``mimetype=``:
  Werkzeug appends the charset for ``mimetype=`` but emits the bare value for
  ``content_type=`` (empirically verified against Flask 3.1.3 / Werkzeug 3.1.8).
* Body of exactly ``Hello, World!\\n`` (13 visible characters + trailing
  newline = 14 bytes).

True method-agnostic parity (AAP sections 0.1.1, 0.7.2; F-002-RQ-004):
    The original Node core-``http`` callback never inspected the request method,
    so it answered **every** method -- standard (GET/POST/...), uncommon
    (TRACE/PROPFIND/CONNECT) and arbitrary/custom verbs alike -- with the same
    200 response. Flask, by contrast, routes by method: a URL rule only matches
    the methods it was registered for, and any other method would otherwise
    yield a ``405 Method Not Allowed``. To reproduce the source's method-agnostic
    behavior at the ROUTING layer -- without enumerating an impossible-to-know
    set of custom verbs -- the application factory installs a custom URL rule
    class, ``_AnyMethodRule`` (in :mod:`app`), whose ``methods`` attribute is
    ``None``. That makes Werkzeug's matcher skip method filtering, so the
    catch-all rules match ANY verb and run this view. The observable result
    matches the Node handler exactly: the status, Content-Type and body never
    depend on the request method, and the application never produces a 405 to
    begin with -- so no error handling is introduced (AAP section 0.2.2 forbids
    only NEW capabilities).

    The explicit ``HTTP_METHODS`` list is deliberately retained (rather than
    dropped) so Flask still applies its built-in semantics for the standard
    verbs -- notably an automatic empty body for ``HEAD`` and, because OPTIONS is
    listed explicitly, a full body for ``OPTIONS`` rather than Flask's automatic
    empty OPTIONS response (AAP F-002 HEAD/OPTIONS rows). Non-listed/custom verbs
    simply match the same rules via ``_AnyMethodRule`` and run the same view,
    yielding the identical static response.

Beyond this the blueprint introduces no request parsing, authentication, CORS,
middleware, error handling, or logging -- preserving the minimal surface of the
original handler (AAP sections 0.2.2, 0.6.1).
"""

from flask import Blueprint, Response

# Single blueprint that owns the catch-all route; registered by create_app().
bp = Blueprint("main", __name__)

# Precomputed response body (bytes) for minimal per-request work (AAP §0.6.3 P-2).
# Exactly mirrors server.js line 9: res.end('Hello, World!\n').
_BODY = b"Hello, World!\n"

# Standard HTTP methods listed explicitly on the catch-all view so Flask applies
# its built-in semantics for them: HEAD gets an automatic empty body, and -- because
# OPTIONS is listed -- OPTIONS returns the full body rather than Flask's automatic
# empty 200 (AAP F-002 HEAD/OPTIONS contract). Non-listed/custom verbs (TRACE,
# PROPFIND, CONNECT, ...) match these same rules via the app's _AnyMethodRule
# (methods=None) and run the same view, so the app is truly method-agnostic (F-002)
# with no error handling involved.
HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]


def _static_response() -> Response:
    """Build the single static plain-text response shared by every code path.

    Ports server.js lines 7-9 (statusCode=200; Content-Type 'text/plain';
    body 'Hello, World!\\n'). ``content_type`` is set explicitly so Werkzeug does
    NOT append '; charset=utf-8', preserving byte-parity with Node's exact header
    (AAP section 0.9.2). Defining the contract in exactly one place keeps every
    request -- every path and every HTTP method -- answered by a single,
    identical response object.
    """
    return Response(_BODY, status=200, content_type="text/plain")


@bp.route("/", defaults={"path": ""}, methods=HTTP_METHODS)
@bp.route("/<path:path>", methods=HTTP_METHODS)
def catch_all(path):
    """Return the static plain-text response for every path and HTTP method.

    Ports server.js lines 7-9. Registered for every path (root + ``/<path:path>``);
    the standard ``HTTP_METHODS`` flow through Flask's normal semantics, while
    non-listed/custom verbs match these same rules via the app's ``_AnyMethodRule``
    (``methods=None``) and reach this identical response. The view body therefore
    never depends on the request method -- exactly reproducing the method-agnostic
    Node handler (F-002-RQ-004).
    """
    return _static_response()
