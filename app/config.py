"""Centralized application configuration for the Flask migration target.

This module is part of the in-place Node.js -> Python 3 / Flask migration. It
implements the Configuration Object pattern, centralizing the two constants that
were hardcoded inline in the original Node.js server (``server.js`` lines 3-4)::

    const hostname = '127.0.0.1';
    const port = 3000;

By moving these magic constants into a single ``Config`` class we preserve
feature F-003 (loopback host/port binding) with byte-identical default values
while eliminating the inline configuration smell from the original script.

The values defined here are consumed by:

* ``wsgi.py`` -> ``from app.config import Config`` -- reads ``Config.HOST`` and
  ``Config.PORT`` to bind the server and to build the exact startup log line
  ``Server running at http://127.0.0.1:3000/``.
* ``app/__init__.py`` -> ``app.config.from_object(Config)`` inside the
  application factory.

Important: Flask's ``app.config.from_object()`` only imports attributes whose
names are entirely UPPERCASE. ``HOST`` and ``PORT`` are therefore deliberately
uppercase; renaming them to lowercase would cause the factory to silently
ignore them.
"""


class Config:
    """Application configuration holding the loopback bind address.

    Mirrors the previously hardcoded constants from the original Node.js
    server (``server.js`` lines 3-4)::

        const hostname = '127.0.0.1';
        const port = 3000;

    Consumed by ``wsgi.py`` (server binding + startup log) and by the
    application factory in ``app/__init__.py`` via
    ``app.config.from_object(Config)``. Only UPPERCASE attributes are picked up
    by Flask's ``from_object`` loader, so both attributes are uppercase.
    """

    #: Loopback interface the server binds to (matches server.js L3; F-003).
    HOST = "127.0.0.1"

    #: TCP port the server listens on (matches server.js L4; F-003).
    PORT = 3000
