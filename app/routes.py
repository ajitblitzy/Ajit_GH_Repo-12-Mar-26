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
    the methods it was registered for, and any other method yields a
    ``405 Method Not Allowed`` HTML error page. To restore exact parity without
    enumerating an impossible-to-know set of custom verbs, this module pairs the
    explicit-method catch-all view with an application-level ``405`` error
    handler (:func:`_method_not_allowed`) that returns the very same static
    response. The observable result matches the Node handler exactly: the
    status, Content-Type and body never depend on the request method.

    The explicit ``HTTP_METHODS`` list is deliberately retained (rather than
    dropped) so the standard verbs flow through the view itself, preserving
    Flask's built-in semantics for them -- notably an automatic empty body for
    ``HEAD`` and a full body for the explicitly listed ``OPTIONS`` (AAP F-002
    HEAD/OPTIONS rows). Non-listed/custom methods are normalized by the 405
    handler. Normalizing a 405 back into the original 200 contract is
    parity-RESTORING, not new error-handling behavior: the source server
    produced no 405s at all, so nothing observable is *added* (AAP section
    0.2.2 forbids only NEW capabilities).

Beyond this the blueprint introduces no request parsing, authentication, CORS,
middleware, or logging -- preserving the minimal surface of the original
handler (AAP sections 0.2.2, 0.6.1).
"""

from flask import Blueprint, Response

# Single blueprint that owns the catch-all route; registered by create_app().
bp = Blueprint("main", __name__)

# Precomputed response body (bytes) for minimal per-request work (AAP §0.6.3 P-2).
# Exactly mirrors server.js line 9: res.end('Hello, World!\n').
_BODY = b"Hello, World!\n"

# Standard HTTP methods handled directly by the catch-all view. Non-listed/custom
# methods (TRACE, PROPFIND, CONNECT, ...) are normalized to the identical response
# by the app-level 405 handler below, making the app truly method-agnostic (F-002).
# OPTIONS is listed explicitly so it returns the full body (not Flask's automatic
# empty 200); HEAD is listed so Flask emits the headers with an automatic empty
# body -- both matching the AAP F-002 HEAD/OPTIONS contract.
HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]


def _static_response() -> Response:
    """Build the single static plain-text response shared by every code path.

    Ports server.js lines 7-9 (statusCode=200; Content-Type 'text/plain';
    body 'Hello, World!\\n'). ``content_type`` is set explicitly so Werkzeug does
    NOT append '; charset=utf-8', preserving byte-parity with Node's exact header
    (AAP section 0.9.2). Defining the contract in exactly one place keeps the
    catch-all view (standard methods) and the 405 handler (non-listed/custom
    methods) perfectly in sync.
    """
    return Response(_BODY, status=200, content_type="text/plain")


@bp.route("/", defaults={"path": ""}, methods=HTTP_METHODS)
@bp.route("/<path:path>", methods=HTTP_METHODS)
def catch_all(path):
    """Return the static plain-text response for every path and standard method.

    Ports server.js lines 7-9. Registered for every path (root + ``/<path:path>``)
    across the standard ``HTTP_METHODS``; non-listed/custom methods reach the
    identical response via :func:`_method_not_allowed`.
    """
    return _static_response()


@bp.app_errorhandler(405)
def _method_not_allowed(_error):
    """Normalize ``405 Method Not Allowed`` into the original ``200`` contract.

    Registered application-wide via ``app_errorhandler`` (NOT blueprint-scoped)
    because Flask raises the 405 during URL routing -- before any blueprint view
    runs -- whenever a request uses a method the catch-all rule was not registered
    for (TRACE, PROPFIND, CONNECT, or arbitrary custom verbs). Returning the shared
    :func:`_static_response` makes those methods indistinguishable from the
    standard ones, exactly reproducing the method-agnostic Node handler
    (F-002-RQ-004). This RESTORES the original contract rather than adding new
    error-handling behavior: the source server never produced a 405 (AAP §0.2.2).

    A fresh :class:`~flask.Response` is returned (not the raised
    :class:`~werkzeug.exceptions.MethodNotAllowed`'s own response), so the default
    405's ``Allow`` header is NOT carried over -- preserving byte-parity with Node,
    which sends no ``Allow`` header. The ``_error`` argument is intentionally
    ignored; the response never depends on the request method. The application
    factory's ``after_request`` hook still runs for this response, keeping the
    ``Server`` header suppressed at the app level (AAP section 0.9.2).
    """
    return _static_response()
