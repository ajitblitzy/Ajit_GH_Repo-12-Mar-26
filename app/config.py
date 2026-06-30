"""Application configuration for the Flask port of the original Node.js server.

This module centralizes the network binding constants that were previously
hardcoded inline in the original Node.js implementation (``server.js`` lines
3-4)::

    const hostname = '127.0.0.1';
    const port = 3000;

By moving them into a dedicated :class:`Config` object (the Configuration
Object pattern), the values are defined in exactly one place and consumed by
both the WSGI entrypoint and the Flask application factory, while preserving
the original loopback host/port binding (feature F-003) with identical
default values.
"""


class Config:
    """Centralized application configuration.

    Mirrors the previously hardcoded constants from the original Node.js
    server (``server.js`` lines 3-4)::

        const hostname = '127.0.0.1';
        const port = 3000;

    The attribute names are intentionally **UPPERCASE**: Flask's
    ``app.config.from_object(Config)`` only copies attributes whose names are
    fully uppercase, so any lowercase name would be silently ignored by the
    application factory.

    Consumed by:
        * ``wsgi.py`` -- reads :attr:`HOST` / :attr:`PORT` to bind the server
          and to build the startup log line
          ``Server running at http://127.0.0.1:3000/``.
        * ``app/__init__.py`` -- loads these values into the Flask app via
          ``app.config.from_object(Config)`` inside the application factory.
    """

    #: Loopback interface the server binds to (matches ``server.js`` L3; F-003).
    HOST = "127.0.0.1"

    #: TCP port the server listens on (matches ``server.js`` L4; F-003).
    PORT = 3000
