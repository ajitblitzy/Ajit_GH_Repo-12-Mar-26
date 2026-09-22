"""Verify the stdout contract of the root-level ``Welcome.py`` module.

The product's entire observable behaviour is the text it writes to
standard output, so this suite is the whole automated gate: it asserts
that the captured output matches the transcribed payload character for
character, that each flow of ``Welcome.py`` behaves correctly when
exercised on its own, that importing the module emits nothing, and that
running the file as a real process honours the exit-code and empty-stderr
halves of the contract.
"""

import contextlib
import importlib
import io
import subprocess
import sys
import unittest

import Welcome

# Transcribed from welcome_to_blitzy.png and written here independently of
# Welcome.WELCOME_TEXT, so that a drifted payload fails these assertions
# instead of being read back from the constant under test. Do not reformat
# this literal: the two lines, their single spaces, the ASCII hyphen in
# "AI-Powered", the bare "&" and the one trailing newline are the contract.
EXPECTED_STDOUT = (
    "Welcome to Blitzy\n"
    "AI-Powered Code Generation & Technical Specifications\n"
)

# The payload without the newline that ``print()`` supplies. Derived from
# this module's own literal, never from the module under test.
EXPECTED_TEXT = EXPECTED_STDOUT[:-1]

# A payload-independent string for exercising the emission flow alone. Its
# leading and trailing spaces are load-bearing rather than cosmetic: they
# are what makes the emitter assertion fail if print_welcome_text is ever
# changed to strip, lstrip or rstrip its argument instead of printing it
# unchanged. The real payload has no edge whitespace, so this probe is the
# only place that contract is observable. Keep the spaces, and keep the
# value ASCII.
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
        # Narrow claim: this establishes that importing emits no output,
        # not that importing is cheap. The evidence for cheapness is the
        # module body itself, which only defines. Reloading is safe here
        # because __name__ stays "Welcome", so the guard does not fire.
        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer):
            importlib.reload(Welcome)
        self.assertEqual(buffer.getvalue(), "")

    def test_script_execution_honours_full_contract(self):
        """Prove running the file exits 0 with the payload and no stderr."""
        result = subprocess.run(
            [sys.executable, Welcome.__file__],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, EXPECTED_STDOUT)
        self.assertEqual(result.stderr, "")


if __name__ == "__main__":
    unittest.main()
