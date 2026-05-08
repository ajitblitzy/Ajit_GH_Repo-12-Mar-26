"""Minimal Python 3 ASGI HTTP server that returns ``Hello, World!\\n`` on every request.

This module is a Python 3 port of the original Node.js ``server.js`` (a 14-line
``http.createServer`` scaffold). It uses Starlette as the lightweight ASGI
framework and Uvicorn (with ``uvloop`` and ``httptools`` from the ``[standard]``
extra) as the high-performance network server.

The server is intentionally route-agnostic: every URL path and every HTTP
method (including non-standard verbs such as ``TRACE``, ``CONNECT``, and
WebDAV's ``PROPFIND``/``MKCOL``/``LOCK``) receives the same plain-text
response, preserving the original Node.js behavior [server.js:L6-L10] in
which ``http.createServer`` invokes the callback for any well-formed HTTP
request regardless of method. To achieve this, the application is wired
through a single ``Mount`` whose matcher only inspects path and scope
type — never the HTTP method — so the per-method 405 filtering performed
by ``starlette.routing.Route`` is bypassed. The host/port pair is hardcoded
to ``127.0.0.1:3000`` to retain the loopback-only test fixture semantics
[server.js:L3-L4, L12].

Performance enhancements (per AAP §0.6.2):
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
"""

from __future__ import annotations

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Mount, request_response
import uvicorn


# Module-level configuration constants. These mirror the original Node.js
# constants verbatim ([server.js:L3-L4]) and are deliberately hardcoded — no
# environment-variable overrides — so the server's network surface remains
# deterministic and loopback-only, matching the original test-fixture
# semantics described in AAP §0.1.1.
HOSTNAME: str = "127.0.0.1"
PORT: int = 3000

# Pre-encoded response body. Storing the payload as ``bytes`` once at module
# load (instead of encoding ``"Hello, World!\n"`` on every request) is the
# concrete, AAP-mandated performance optimization: it eliminates the
# per-request UTF-8 encode step that would otherwise occur inside Starlette's
# response construction. The leading underscore marks the constant as a
# private, module-internal helper per AAP §0.7.3 ("code quality conventions").
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


# Starlette ASGI application with a single catch-all ``Mount`` that dispatches
# every matching request to ``handler``. ``Mount`` is used here in preference
# to ``Route`` because ``Route.matches`` filters by HTTP method (returning a
# ``Match.PARTIAL`` result that the router maps to ``405 Method Not Allowed``
# for any verb not listed in ``methods=[...]``), whereas ``Mount.matches``
# only considers the request path and the ASGI scope type. Mounting at the
# root path ``"/"`` therefore matches every URL under every HTTP method —
# standard or extension (e.g., ``TRACE``, ``CONNECT``, WebDAV's ``PROPFIND``,
# ``MKCOL``, ``LOCK``) — exactly mirroring the original Node.js behavior in
# which ``http.createServer((req, res) => {...})`` invokes the callback for
# any well-formed HTTP request regardless of method [server.js:L6-L10]. This
# satisfies AAP §0.1.1's "every URL, method, and request body" guarantee.
#
# The handler function ``handler(request) -> Response`` keeps the
# request/response signature mandated by AAP §0.6.1; ``request_response``
# adapts it into a method-agnostic ASGI application that ``Mount`` can host.
app: Starlette = Starlette(
    routes=[
        Mount("/", app=request_response(handler)),
    ],
)


if __name__ == "__main__":
    # Emit the user-visible startup log line BEFORE handing control to Uvicorn.
    # This preserves the message ordering of the original Node.js callback at
    # server.js:L13 — for the typical successful-start case, the line appears
    # immediately, just as ``console.log`` did when ``server.listen`` succeeded.
    #
    # ``flush=True`` is critical: when ``stdout`` is redirected to a file or
    # pipe (e.g., ``python server.py > log 2>&1``, systemd, Docker, cron) it
    # is block-buffered by default (typically 4-8 KB), whereas Uvicorn's
    # logger writes to stderr with line-buffering / immediate flush. Without
    # an explicit flush the F-004 message is held in Python's userspace
    # buffer while Uvicorn's INFO lines reach the terminal first, inverting
    # the user-visible ordering that AAP §0.1.1 / §0.6.1 mandate. Forcing a
    # flush here makes the F-004 line the first byte of stdout in every
    # execution context (TTY, file, pipe).
    print(f"Server running at http://{HOSTNAME}:{PORT}/", flush=True)

    # ``uvicorn.run`` blocks the main thread until SIGINT/SIGTERM. With
    # ``uvicorn[standard]`` installed, Uvicorn auto-selects ``uvloop`` (libuv
    # event loop) and ``httptools`` (Cython HTTP/1.1 parser) without any
    # explicit configuration — the same low-level engines Node.js uses. No
    # ``workers``, ``reload``, or ``log_level`` arguments are passed: those
    # are explicitly out of scope per AAP §0.2.2, and single-process
    # operation is required to mirror the original Node.js runtime model.
    uvicorn.run(app, host=HOSTNAME, port=PORT)
