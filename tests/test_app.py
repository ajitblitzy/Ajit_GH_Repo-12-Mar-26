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
