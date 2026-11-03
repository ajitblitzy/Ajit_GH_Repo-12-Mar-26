"""Write the fixed greeting ``Welcome to Blitzy`` to standard output.

Running this module writes the greeting followed by one line feed and exits
with status 0.  Importing it writes nothing on any stream.
"""

import os
import sys

MESSAGE = "Welcome to Blitzy"

STDOUT_FAILURE = "welcome.py: error: cannot write to standard output"


def _fail_stdout():
    """Report an unusable standard output on stderr, then exit 1."""
    if sys.stdout is not None:
        # sys.stdout exists but need not be writable (descriptor 1 may be a
        # pipe whose reader is gone), so retarget it at /dev/null: the
        # interpreter flushes the standard streams again at shutdown, and a
        # second failure there would add an ignored-exception notice beside
        # the single diagnostic line.
        os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
    sys.stderr.write(STDOUT_FAILURE + "\n")
    raise SystemExit(1)


def main():
    """Write the greeting to standard output.

    Exit with status 1 when that stream cannot be written.
    """
    if sys.stdout is None:
        _fail_stdout()
    try:
        sys.stdout.write(MESSAGE + "\n")
        # Standard output is block-buffered when it is not a terminal, so the
        # flush here is what makes a failed write surface in this handler
        # instead of at interpreter shutdown.
        sys.stdout.flush()
    except OSError:
        _fail_stdout()


if __name__ == "__main__":
    main()
