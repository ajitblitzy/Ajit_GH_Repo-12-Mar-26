"""Minimal Python 3 ASGI HTTP server that returns ``Hello, World!\\n`` on every request.

This module is a Python 3 port of the original Node.js ``server.js`` (a 14-line
``http.createServer`` scaffold). It uses Starlette as the lightweight ASGI
framework and Uvicorn (with ``uvloop`` and ``httptools`` from the ``[standard]``
extra) as the high-performance network server.

The server is intentionally route-agnostic AND method-agnostic: every URL path
(including paths that contain newline characters such as ``%0a`` or ``%0d%0a``
percent-encoded sequences) and every HTTP method that the underlying parser
admits, receives the same plain-text response. This preserves the original
behavior of the Node.js implementation [server.js:L6-L10]. The host/port pair
is hardcoded to ``127.0.0.1:3000`` to retain the loopback-only test fixture
semantics [server.js:L3-L4, L12].

Performance notes (per AAP §0.6.2):
    * ``uvicorn[standard]`` auto-selects ``uvloop`` (Cython libuv event loop)
      and ``httptools`` (Cython ``llhttp`` parser) — the same low-level
      primitives Node.js uses internally.
    * The response body is pre-encoded once at module load as a ``bytes``
      literal (``_RESPONSE_BODY``), eliminating per-request UTF-8 conversion.
    * The handler is declared ``async def`` so Starlette schedules it directly
      on the event loop instead of dispatching it through a thread-pool
      executor.
    * The bare ``Response`` primitive is used rather than ``PlainTextResponse``
      to skip a redundant ``str -> bytes`` encode step inside Starlette's
      response pipeline.

Routing notes (resolves Findings #1 and #2 from the API+BACKEND smoke test):
    * Starlette's default ``Route`` with the ``{rest_of_path:path}`` convertor
      uses a regex (``".*"``) that does NOT enable Python's DOTALL flag, so
      paths containing newline characters fail to match and the framework
      returns 404 (Finding #1). The ``_CatchAllMount`` subclass below
      overrides ``path_regex`` with a ``[\\s\\S]*`` pattern (a DOTALL-
      equivalent character class) that matches any character including
      ``\\n`` and ``\\r``.
    * Starlette's default ``Route`` with a function endpoint silently coerces
      ``methods=None`` into ``methods=["GET"]`` and rejects all other methods
      with 405, breaking the AAP §0.7.1 "any method" contract for ``TRACE``,
      ``CONNECT``, and similar verbs (Finding #2). ``Mount`` does not enforce
      a methods list at all: every HTTP method the underlying parser
      (``httptools`` / ``llhttp``) admits is dispatched directly to the
      wrapped ASGI app, restoring method-agnostic dispatch.

Stdout buffering note (resolves Finding #3 from the API+BACKEND smoke test):
    * The startup log line is emitted via ``print(..., flush=True)`` so it
      appears as the FIRST line of stdout even when stdout is redirected to a
      file or pipe (Python's default behavior for non-TTY stdout is
      block-buffering). Without ``flush=True``, Uvicorn's stderr-bound INFO
      logs interleave ahead of the AAP §0.6.1-mandated startup signature in
      the merged stdout/stderr log file, breaking integrations with process
      supervisors that scrape the first stdout line as a startup signal.
"""

from __future__ import annotations

import re

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Mount, request_response
from starlette.types import ASGIApp
import uvicorn


# ---------------------------------------------------------------------------
# Module-level configuration constants.
#
# These mirror the original Node.js constants verbatim:
#   * ``HOSTNAME`` corresponds to ``const hostname = '127.0.0.1'`` [server.js:L3]
#   * ``PORT`` corresponds to ``const port = 3000``                [server.js:L4]
#
# They are deliberately hardcoded — no environment-variable overrides — so the
# server's network surface remains deterministic and loopback-only, matching
# the original test-fixture semantics described in the AAP §0.1.1.
# ---------------------------------------------------------------------------
HOSTNAME: str = "127.0.0.1"
PORT: int = 3000

# Pre-encoded response body. Storing the payload as ``bytes`` once at module
# load (instead of encoding ``"Hello, World!\n"`` on every request) is the
# concrete, AAP-mandated performance optimization: it eliminates the per-request
# UTF-8 encode step that would otherwise occur inside Starlette's response
# construction. The leading underscore marks the constant as a private,
# module-internal helper per AAP §0.7.3 ("code quality conventions").
#
# Length: 14 bytes total — ``Hello, World!`` (13) + ``\n`` (1) — byte-identical
# to the literal passed to ``res.end('Hello, World!\n')`` at server.js:L9.
_RESPONSE_BODY: bytes = b"Hello, World!\n"


async def handler(request: Request) -> Response:
    """Return the static ``Hello, World!\\n`` plain-text response for every request.

    The ``request`` argument is intentionally ignored — routing, query string,
    headers, body, and HTTP method have no effect on the response. This mirrors
    the original Node.js handler at server.js lines 6-10, which sets
    ``res.statusCode = 200``, ``Content-Type: text/plain``, and ends the
    response with ``'Hello, World!\\n'`` regardless of the incoming request.

    Args:
        request: The incoming Starlette ``Request`` object. Accepted for ASGI
            interface compliance and ignored by design (route-agnostic
            behavior, feature F-002 [tech spec §2.1]).

    Returns:
        A Starlette ``Response`` carrying the pre-encoded ``_RESPONSE_BODY``
        bytes, HTTP status ``200``, and ``Content-Type: text/plain`` (Starlette
        appends ``; charset=utf-8`` per HTTP/1.1 best practice; the body itself
        remains byte-identical to the Node.js original).
    """
    return Response(
        content=_RESPONSE_BODY,
        status_code=200,
        media_type="text/plain",
    )


# ---------------------------------------------------------------------------
# Catch-all Mount.
#
# ``_CatchAllMount`` is a small ``starlette.routing.Mount`` subclass that
# overrides ``path_regex`` with a DOTALL-equivalent pattern. Two benefits flow
# from using ``Mount`` (rather than ``Route``) plus this regex override:
#
#   1. Path-agnosticism (resolves Finding #1):
#      Starlette's default ``PathConvertor`` regex (``".*"``) does not match
#      newline characters because Python's ``.`` does not match ``\n`` without
#      the DOTALL flag. Paths such as ``/x%0ay`` or ``/path%0d%0aHeader``
#      therefore fail to match the catch-all route and the framework returns
#      404 — violating the AAP §0.7.1 "accepted paths (any)" contract. The
#      override below uses ``[\\s\\S]*`` (a character class covering every
#      Unicode code point) which matches any character including ``\\n`` and
#      ``\\r``.
#
#   2. Method-agnosticism (resolves Finding #2):
#      Starlette's ``Route`` class enforces a method-membership check inside
#      ``Route.matches()``. When constructed with a function endpoint (rather
#      than a class endpoint), it silently coerces ``methods=None`` into
#      ``methods=["GET"]``, which means ``TRACE``, ``CONNECT``, and similar
#      verbs are rejected with 405. ``Mount`` carries no ``methods`` attribute
#      and performs no method check in ``Mount.matches()`` — every HTTP method
#      that the underlying parser (``httptools``/``llhttp`` via
#      ``uvicorn[standard]``) admits is dispatched to the wrapped ASGI app.
#      (Custom non-RFC method tokens such as ``FOO`` remain rejected with 400
#      at the ``httptools`` parser layer — that rejection occurs below the
#      application layer and is irreducible without switching parsers, which
#      would forfeit the AAP §0.6.2 performance mandate.)
#
# Together these two adjustments restore the AAP §0.7.1 contract that
# "accepted methods (any), accepted paths (any) — must remain identical" to
# the Node.js original [server.js:L6-L10].
#
# ``Note on the regex syntax``: ``[\s\S]*`` is preferred over the inline flag
# ``(?s).*`` because Python 3.12 raises an error for ``(?aiLmsux)`` flags in
# non-leading positions (deprecated since 3.7). ``[\s\S]*`` is a portable
# character-class form that matches every character on every Python 3.x
# version.
# ---------------------------------------------------------------------------
class _CatchAllMount(Mount):
    """Mount that matches every HTTP path (including paths containing newlines).

    Subclasses ``starlette.routing.Mount`` for one reason only: to replace the
    default ``path_regex`` (which uses the standard ``PathConvertor`` regex
    ``.*`` and therefore fails to match newline characters) with a DOTALL-
    equivalent pattern.

    Mount's intrinsic method-agnosticism (it has no ``methods`` attribute and
    performs no method-membership check in ``matches()``) is preserved
    unchanged, so every HTTP method that ``httptools`` accepts is dispatched
    to the wrapped ASGI app.
    """

    # DOTALL-equivalent regex compiled once at class-definition time. The
    # named group ``path`` is required by ``Mount.matches()`` which reads
    # ``match.groupdict()["path"]`` to compute ``remaining_path``. The
    # character class ``[\s\S]`` covers every Unicode code point, including
    # ``\n`` and ``\r`` which a bare ``.`` does not match in Python without
    # the DOTALL flag.
    _PATH_REGEX = re.compile(r"^/(?P<path>[\s\S]*)$")

    def __init__(self, app: ASGIApp) -> None:
        # Initialize the standard Mount machinery (sets ``self.app``,
        # ``self.path``, ``self.path_format``, ``self.param_convertors``)
        # using the default mounting at ``/``.
        super().__init__("/", app=app)
        # Replace path_regex with our DOTALL-equivalent pattern. The default
        # produced by ``Mount.__init__`` is ``re.compile(r"^/(?P<path>.*)$")``
        # which fails to match URLs containing newline characters.
        self.path_regex = self._PATH_REGEX


# ---------------------------------------------------------------------------
# Starlette ASGI application.
#
# The application is composed of a single ``_CatchAllMount`` that dispatches
# every request to ``request_response(handler)``. ``request_response`` is the
# canonical Starlette helper (also used internally by ``Route`` for function
# endpoints) that adapts a ``handler(request) -> response`` callable into an
# ASGI app: it constructs a ``Request`` from ``(scope, receive, send)``,
# calls our handler with it, then delegates to ``response(scope, receive,
# send)`` to emit the response. This preserves the AAP §0.6.1 mapping from
# the Node.js arrow callback ``(req, res) => {...}`` to the Python coroutine
# ``async def handler(request: Request) -> Response``.
#
# The ``app`` symbol is exposed at module scope so the application can also be
# referenced as ``server:app`` by external Uvicorn invocations (e.g.
# ``uvicorn server:app``) if ever needed; the canonical entrypoint defined
# below uses ``uvicorn.run(app, ...)`` directly.
# ---------------------------------------------------------------------------
app: Starlette = Starlette(routes=[_CatchAllMount(request_response(handler))])


if __name__ == "__main__":
    # Emit the user-visible startup log line BEFORE handing control to Uvicorn.
    # This preserves the message ordering of the original Node.js callback at
    # server.js:L13 — for the typical successful-start case the line appears
    # immediately, just as ``console.log`` did when ``server.listen`` succeeded.
    #
    # ``flush=True`` is essential when stdout is redirected to a file or pipe
    # (the standard pattern used by container orchestrators, systemd,
    # Kubernetes, and process supervisors). Python defaults to block-buffered
    # stdout for non-TTY streams (``sys.stdout.line_buffering == False``), so
    # without ``flush=True`` this line is held in Python's userspace buffer
    # while Uvicorn's INFO logs (which go to stderr, line-buffered by default)
    # reach the merged log first — making the AAP §0.6.1-mandated startup
    # signature NOT the first stdout line and breaking F-004.
    print(f"Server running at http://{HOSTNAME}:{PORT}/", flush=True)

    # ``uvicorn.run`` blocks the main thread until SIGINT/SIGTERM. With
    # ``uvicorn[standard]`` installed, Uvicorn auto-selects ``uvloop`` (libuv
    # event loop) and ``httptools`` (Cython HTTP/1.1 parser) without any
    # explicit configuration — the same low-level engines Node.js uses. No
    # ``workers``, ``reload``, or ``log_level`` arguments are passed: those are
    # explicitly out of scope per AAP §0.2.2, and single-process operation is
    # required to mirror the original Node.js runtime model.
    uvicorn.run(app, host=HOSTNAME, port=PORT)
