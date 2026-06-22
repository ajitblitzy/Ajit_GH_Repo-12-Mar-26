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

import pytest
from flask import Flask

import wsgi
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
# F-004 - operational startup parity: log ONLY after a successful bind
#
# The original Node server logs from inside server.listen(port, host, callback)
# (server.js L12-13); that callback fires solely on a SUCCESSFUL bind. These
# regression tests pin wsgi.serve() to the same semantics: the startup banner is
# printed only after make_server() binds the socket, and never when the bind
# fails. serve() is driven with make_server monkeypatched so no real, blocking
# server is ever started (the existing import-safety guarantee is preserved).
# ===========================================================================
def test_serve_does_not_log_when_bind_fails(monkeypatch, capsys):
    """No startup banner is printed if the socket bind fails (F-004 parity).

    Simulates an occupied port. Werkzeug's ``make_server`` binds the socket
    inside its constructor; on failure (``OSError`` from ``server_bind``) it
    prints the error to stderr and calls ``sys.exit(1)`` -- i.e. it raises
    ``SystemExit`` and never returns (confirmed from werkzeug/serving.py
    ``BaseWSGIServer.__init__``). This test reproduces that real behavior, then
    asserts serve() let the exception propagate and did NOT print the success
    banner first -- mirroring Node, whose ``server.listen`` callback never runs
    on a failed bind. This is the regression guard for the critical
    pre-bind-logging defect (a revert to "print then bind" would print the
    banner here and fail this test).
    """

    def _bind_fails_like_werkzeug(*args, **kwargs):
        # Werkzeug prints to stderr then sys.exit(1) on a failed bind.
        raise SystemExit(1)

    monkeypatch.setattr(wsgi, "make_server", _bind_fails_like_werkzeug)

    with pytest.raises(SystemExit):
        wsgi.serve()

    captured = capsys.readouterr()
    # The success banner must NOT have been printed before the failed bind.
    assert captured.out == ""
    assert EXPECTED_STARTUP_MESSAGE not in captured.out


def test_serve_logs_after_successful_bind_then_serves(monkeypatch, capsys):
    """The banner is printed exactly once, after bind, then serve_forever runs.

    Replaces make_server() with a fake whose constructor stands in for a
    successful bind and whose serve_forever() merely records that it ran. serve()
    must: (1) bind, (2) print exactly the startup line, (3) call serve_forever --
    in that order. Asserting the call order proves the banner is emitted only on
    the post-bind path, and asserting exact stdout proves no extra dev-server
    banner/warning or access log is produced (operational-output parity).
    """
    events = []

    class _FakeServer:
        def serve_forever(self):
            events.append("serve_forever")

    def _fake_make_server(host, port, application, **kwargs):
        # Record the bind with the address it was given (must be loopback:3000).
        events.append(("make_server", host, port))
        return _FakeServer()

    monkeypatch.setattr(wsgi, "make_server", _fake_make_server)

    wsgi.serve()

    captured = capsys.readouterr()
    # Exactly the startup line and a single trailing newline -- nothing else.
    assert captured.out == EXPECTED_STARTUP_MESSAGE + "\n"
    # Bind happened first (at the required address), serve_forever ran after.
    assert events == [
        ("make_server", Config.HOST, Config.PORT),
        "serve_forever",
    ]
