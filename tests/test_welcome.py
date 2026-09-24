"""Verify the stdout contract of the root-level ``Welcome.py`` module.

This suite is the product's only automated gate; the contract it covers
is the exact printed text, an empty standard error and an exit status
of 0.
"""

import contextlib
import importlib
import io
import subprocess
import sys
import unittest

import Welcome

# Transcribed from welcome_to_blitzy.png; do not reformat this literal.
# It is independent of Welcome.WELCOME_TEXT so that a drifted payload
# fails here rather than being read back from the constant it verifies.
EXPECTED_STDOUT = (
    "Welcome to Blitzy\n"
    "AI-Powered Code Generation & Technical Specifications\n"
)

# The payload without the newline that ``print()`` supplies. Derived from
# this module's own literal, never from the module under test.
EXPECTED_TEXT = EXPECTED_STDOUT[:-1]

# A payload-independent string for exercising the emission flow alone.
# Its edge spaces make the probe detect emitter whitespace normalization.
PROBE_TEXT = "  probe  "


class WelcomeOutputTests(unittest.TestCase):
    """Assert every clause of ``Welcome.py``'s standard-output contract."""

    def test_main_writes_expected_text_to_stdout(self):
        """Prove main() writes the payload and exactly one newline."""
        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer):
            Welcome.main()
        self.assertEqual(buffer.getvalue(), EXPECTED_STDOUT)

    def test_print_welcome_text_appends_single_newline(self):
        """Prove the emission flow adds one newline and alters nothing."""
        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer):
            Welcome.print_welcome_text(PROBE_TEXT)
        self.assertEqual(buffer.getvalue(), PROBE_TEXT + "\n")

    def test_get_welcome_text_carries_no_trailing_newline(self):
        """Prove the payload accessor leaves the newline to print()."""
        text = Welcome.get_welcome_text()
        self.assertEqual(text, EXPECTED_TEXT)
        self.assertFalse(text.endswith("\n"))

    def test_import_of_module_produces_no_output(self):
        """Prove re-importing the module writes nothing to stdout."""
        # Narrow claim: importing emits no output, not that it is cheap.
        # Import work is one constant binding, three function definitions
        # and the __name__ guard comparison, which stays false under
        # reload because __name__ remains "Welcome", so main() never runs.
        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer):
            importlib.reload(Welcome)
        self.assertEqual(buffer.getvalue(), "")

    def test_script_execution_honours_full_contract(self):
        """Prove running the file exits 0 with the payload and no stderr."""
        # A hung child is killed and raises TimeoutExpired instead of
        # stalling the gate; 60 s leaves ample margin for slow hosts.
        result = subprocess.run(
            [sys.executable, Welcome.__file__],
            capture_output=True,
            text=True,
            timeout=60,
        )
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, EXPECTED_STDOUT)
        self.assertEqual(result.stderr, "")


if __name__ == "__main__":
    unittest.main()
