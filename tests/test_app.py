"""Behavioral-parity tests for the migrated Python 3 / Flask application.

These tests prove that the Flask rewrite reproduces the EXACT externally
observable HTTP contract of the original Node.js ``server.js`` (features
F-001..F-004 in the Technical Specification and the AAP §0.9 validation
matrix). They are the automated evidence that "current functionality is not
impacted" by the migration.

Original Node.js behavior being preserved (``server.js`` lines 1-14):
    * For EVERY request (any path, any HTTP method):
        - status        : 200
        - Content-Type  : text/plain        (no "; charset=utf-8")
        - body          : b"Hello, World!\n" (14 bytes, trailing newline)
    * Loopback binding : 127.0.0.1:3000
    * Startup log line : "Server running at http://127.0.0.1:3000/"

Run from the repository root with::

    pytest

Import resolution relies on the root ``pyproject.toml`` setting
``[tool.pytest.ini_options] pythonpath = ["."]`` so that ``app`` and ``wsgi``
import cleanly without installing the package.
"""

import http.client
import os
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

import pytest
from flask import Flask

from app import create_app
from app.config import Config
from wsgi import startup_message

# --- Exact contract constants (byte-for-byte parity with server.js) ---------
EXPECTED_STATUS = 200
EXPECTED_CONTENT_TYPE = "text/plain"  # EXACT - no "; charset=utf-8"
EXPECTED_BODY = b"Hello, World!\n"  # 14 bytes including trailing newline
EXPECTED_STARTUP_MESSAGE = "Server running at http://127.0.0.1:3000/"

# --- Route- and method-agnostic matrix (AAP 0.9.1) --------------------------
HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
PATHS = ["/", "/anything", "/a/b/c"]


# --- Fixtures ---------------------------------------------------------------
@pytest.fixture
def app():
    """Build a fresh Flask app via the application factory (F-001)."""
    return create_app()


@pytest.fixture
def client(app):
    """Flask test client for issuing in-process requests."""
    return app.test_client()


# ===========================================================================
# F-001 - server / application creation
# ===========================================================================
def test_create_app_returns_flask_instance(app):
    """create_app() returns a Flask application instance (F-001)."""
    assert isinstance(app, Flask)


def test_test_client_connects_and_responds(client):
    """The test client connects and receives a response (F-001)."""
    response = client.get("/")
    assert response is not None
    assert response.status_code == EXPECTED_STATUS


# ===========================================================================
# F-002 - static response contract: status / content-type / body
# ===========================================================================
def test_status_code_is_200(client):
    """Status is exactly 200 (F-002, server.js L7)."""
    assert client.get("/").status_code == EXPECTED_STATUS


def test_content_type_is_text_plain_without_charset(client):
    """Content-Type is EXACTLY 'text/plain' with NO '; charset=utf-8' (F-002, 0.9.2).

    A failure here that shows 'text/plain; charset=utf-8' indicates the route
    used ``mimetype=`` instead of ``content_type=``.
    """
    response = client.get("/")
    assert response.headers["Content-Type"] == EXPECTED_CONTENT_TYPE


def test_body_is_exact_bytes(client):
    """Body is exactly b'Hello, World!\\n' including the trailing newline (F-002, 0.9.2)."""
    response = client.get("/")
    assert response.data == EXPECTED_BODY


def test_body_is_fourteen_bytes(client):
    """Body length is exactly 14 bytes - reinforces byte-parity (F-002, server.js L9)."""
    assert len(client.get("/").data) == 14


# ===========================================================================
# F-002 byte-nuance - no application-level 'Server' header (AAP 0.9.2)
# ===========================================================================
@pytest.mark.parametrize("method", ["GET", "POST", "TRACE"])
def test_no_application_level_server_header(client, method):
    """The app contributes NO 'Server' response header (AAP 0.9.2 byte-nuance).

    Node's core ``http`` server sends no 'Server' header by default, whereas
    Werkzeug/WSGI servers add one. The application factory strips any app-level
    'Server' header via an ``after_request`` hook. The in-process test client
    surfaces only app-level headers (it does not run ``WSGIRequestHandler``,
    which is what would add the HTTP-layer 'Server' header), so this asserts the
    application's own contribution is absent across both the routed path (GET,
    POST) and the 405-normalized path (TRACE). The HTTP-layer suppression for a
    real socket is asserted by ``test_direct_run_logs_after_successful_bind_and_serves``.
    """
    response = client.open("/", method=method)
    assert "Server" not in response.headers


# ===========================================================================
# F-002 - route- and method-agnostic behavior
# ===========================================================================
@pytest.mark.parametrize("path", PATHS)
@pytest.mark.parametrize("method", HTTP_METHODS)
def test_identical_response_across_methods_and_paths(client, method, path):
    """Every (method, path) combination returns the identical contract (F-002).

    All combinations yield status 200 and Content-Type 'text/plain'. Non-HEAD
    methods return the full body; HEAD returns an empty body per HTTP semantics
    (Werkzeug strips it - this matches Node's core http server, which also
    suppresses HEAD bodies), so for HEAD only status and headers are asserted.
    """
    response = client.open(path, method=method)

    assert response.status_code == EXPECTED_STATUS
    assert response.headers["Content-Type"] == EXPECTED_CONTENT_TYPE

    if method == "HEAD":
        # HTTP semantics: HEAD carries headers/status but no message body.
        assert response.data == b""
    else:
        assert response.data == EXPECTED_BODY


# ===========================================================================
# F-002 - TRUE method-agnostic parity: arbitrary / non-listed / custom verbs
# ===========================================================================
# The original Node core-http callback never branched on the request method, so
# it answered EVERY method identically -- including uncommon verbs (TRACE,
# PROPFIND, CONNECT) and arbitrary custom verbs the Flask router cannot be
# pre-registered for. These cases exercise the application-level 405 handler in
# ``app/routes.py`` that normalizes "Method Not Allowed" back into the exact 200
# contract (AAP 0.1.1 / 0.7.2; F-002-RQ-004). They guard against the regression
# where unlisted methods returned "405 text/html" instead of the static response.
NON_LISTED_METHODS = [
    "TRACE",       # standard HTTP verb, intentionally not in HTTP_METHODS
    "PROPFIND",    # WebDAV
    "CONNECT",     # tunnel verb
    "MKCOL",       # WebDAV
    "REPORT",      # WebDAV / versioning
    "PURGE",       # non-standard cache-invalidation verb
    "FROBNICATE",  # entirely arbitrary custom verb
]


@pytest.mark.parametrize("path", PATHS)
@pytest.mark.parametrize("method", NON_LISTED_METHODS)
def test_arbitrary_methods_return_identical_contract(client, method, path):
    """Non-listed / custom HTTP methods return the SAME 200 contract (F-002).

    Reproduces the method-agnostic Node handler for verbs the Flask route is not
    registered for. Without the application-level 405 normalizer these would
    return '405 Method Not Allowed' with an HTML body; this test fails loudly if
    that regression returns.
    """
    response = client.open(path, method=method)

    assert response.status_code == EXPECTED_STATUS
    assert response.headers["Content-Type"] == EXPECTED_CONTENT_TYPE
    assert response.data == EXPECTED_BODY
    # Byte-parity: a real 405 carries an 'Allow' header; the original Node server
    # sent none, so the normalized response must not include one either.
    assert "Allow" not in response.headers


# ===========================================================================
# F-003 - host / port binding configuration
# ===========================================================================
def test_config_host_is_loopback():
    """Config.HOST is exactly '127.0.0.1' (F-003, server.js L3)."""
    assert Config.HOST == "127.0.0.1"


def test_config_port_is_3000():
    """Config.PORT is exactly the integer 3000 (F-003, server.js L4)."""
    assert Config.PORT == 3000


# ===========================================================================
# F-004 - startup log line
# ===========================================================================
def test_startup_message_matches_exactly():
    """startup_message() equals the original Node.js startup log verbatim (F-004, server.js L13)."""
    assert startup_message() == EXPECTED_STARTUP_MESSAGE


# ===========================================================================
# F-004 - operational parity: direct-run (`python wsgi.py`) bind/log ordering
# ===========================================================================
# These tests launch the WSGI entrypoint as a real OS subprocess (exactly as a
# developer runs ``python wsgi.py``) and assert the startup-log/bind ordering
# the original Node ``server.listen(port, host, cb)`` guaranteed: the success
# banner is emitted ONLY after the socket is successfully bound, because Node
# logged inside the listen callback (server.js L12-13). They also confirm the
# real HTTP layer reproduces the full contract -- including the suppressed
# 'Server' header that the in-process test client cannot exercise (AAP 0.9.2).
#
# PYTHONUNBUFFERED=1 is set for the child only so its stdout is observable while
# it blocks in ``serve_forever`` (a piped child is otherwise block-buffered).
# This is a test-harness concern; it does not change wsgi.py behavior.
_REPO_ROOT = Path(__file__).resolve().parents[1]
_WSGI_PATH = _REPO_ROOT / "wsgi.py"


def _drain(stream, sink):
    """Continuously read lines from a subprocess text stream into ``sink``."""
    for line in iter(stream.readline, ""):
        sink.append(line)
    stream.close()


def _occupy_port(host, port):
    """Bind+listen a socket so a *second* bind on the same port must fail.

    On Windows ``SO_EXCLUSIVEADDRUSE`` is required: Werkzeug's server enables
    ``SO_REUSEADDR``, which would otherwise let the child bind the same port and
    defeat the bind-failure probe.
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
    sock.bind((host, port))
    sock.listen(5)
    return sock


def _spawn_wsgi(stderr_to_stdout):
    """Launch ``python wsgi.py`` as a subprocess with unbuffered stdout."""
    env = dict(os.environ, PYTHONUNBUFFERED="1")
    return subprocess.Popen(
        [sys.executable, str(_WSGI_PATH)],
        cwd=str(_REPO_ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT if stderr_to_stdout else subprocess.PIPE,
        text=True,
        env=env,
    )


def test_direct_run_logs_after_successful_bind_and_serves():
    """`python wsgi.py` binds, THEN logs, then serves the exact contract (F-004).

    Asserts that, on a successful bind:
      * the server actually accepts connections (bind succeeded),
      * a real-socket GET returns 200 / text/plain / b'Hello, World!\\n',
      * an arbitrary method (TRACE) returns the same contract through the REAL
        server -- method-agnostic at the HTTP layer, not just the test client,
      * NO 'Server' header is present on the real HTTP response (AAP 0.9.2),
      * the exact success banner WAS emitted (it is printed after the bind).
    """
    proc = _spawn_wsgi(stderr_to_stdout=True)
    captured = []
    reader = threading.Thread(target=_drain, args=(proc.stdout, captured), daemon=True)
    reader.start()
    try:
        # Wait until the server accepts a connection => the bind has succeeded.
        deadline = time.time() + 20
        connected = False
        while time.time() < deadline:
            assert proc.poll() is None, "wsgi.py exited before it could bind"
            try:
                with socket.create_connection((Config.HOST, Config.PORT), timeout=0.5):
                    connected = True
                    break
            except OSError:
                time.sleep(0.2)
        assert connected, "server never accepted a connection within the timeout"

        # Nominal method through the real HTTP server.
        conn = http.client.HTTPConnection(Config.HOST, Config.PORT, timeout=5)
        conn.request("GET", "/anything")
        resp = conn.getresponse()
        body = resp.read()
        assert resp.status == EXPECTED_STATUS
        assert resp.getheader("Content-Type") == EXPECTED_CONTENT_TYPE
        assert body == EXPECTED_BODY
        assert resp.getheader("Server") is None  # AAP 0.9.2: no Server header
        conn.close()

        # Arbitrary method through the real HTTP server (method-agnostic parity).
        conn = http.client.HTTPConnection(Config.HOST, Config.PORT, timeout=5)
        conn.request("TRACE", "/")
        resp = conn.getresponse()
        body = resp.read()
        assert resp.status == EXPECTED_STATUS
        assert resp.getheader("Content-Type") == EXPECTED_CONTENT_TYPE
        assert body == EXPECTED_BODY
        assert resp.getheader("Server") is None
        conn.close()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=10)
        reader.join(timeout=5)

    # The banner is printed only AFTER a successful bind -> it must be present here.
    assert EXPECTED_STARTUP_MESSAGE in "".join(captured)


def test_direct_run_does_not_log_success_on_bind_failure():
    """`python wsgi.py` must NOT print the success banner when the bind fails (F-004).

    The original Node server logged inside the ``listen`` callback, so the banner
    appeared only on a successful bind; an occupied port crashed the process with
    NO success line. This pre-occupies 127.0.0.1:3000 and asserts the migrated
    entrypoint (a) never emits the success banner and (b) exits non-zero -- i.e.
    it fails loudly instead of falsely reporting success. This guards the exact
    regression flagged in review (banner printed before bind).
    """
    occupier = _occupy_port(Config.HOST, Config.PORT)
    try:
        proc = _spawn_wsgi(stderr_to_stdout=False)
        try:
            stdout, _stderr = proc.communicate(timeout=20)
        except subprocess.TimeoutExpired:
            proc.kill()
            stdout, _stderr = proc.communicate()
        assert EXPECTED_STARTUP_MESSAGE not in stdout
        assert proc.returncode is not None and proc.returncode != 0
    finally:
        occupier.close()
