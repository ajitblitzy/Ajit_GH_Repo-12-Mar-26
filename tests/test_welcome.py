"""Prove the behaviour contract of the ``welcome.py`` program.

The suite checks the exact output bytes, the exit status, the silent import
and the failed-write path, using only the standard library, so nothing has to
be installed to verify the program.
"""

import io
import os
import shlex
import subprocess
import sys
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

import welcome

ROOT = Path(__file__).resolve().parents[1]
PROGRAM = ROOT / "welcome.py"
EXPECTED = "Welcome to Blitzy\n"
DIAGNOSTIC = b"welcome.py: error: cannot write to standard output\n"

# The only shell redirections run_program_through_shell accepts: close
# descriptor 1, bind standard input to the null device, close descriptor 0.
REDIRECTION_STDOUT_CLOSED = ">&-"
REDIRECTION_STDIN_DEVNULL = "< /dev/null"
REDIRECTION_STDIN_CLOSED = "<&-"
SUPPORTED_REDIRECTIONS = (
    REDIRECTION_STDOUT_CLOSED,
    REDIRECTION_STDIN_DEVNULL,
    REDIRECTION_STDIN_CLOSED,
)


def run_program(*args, stdout_closed=False):
    """Run the program in a fresh interpreter and return its result.

    The result is a ``(returncode, stdout_bytes, stderr_bytes)`` tuple.  With
    ``stdout_closed`` true the read end of a pipe is closed before the child
    starts, so the child has no reader left and its writes fail with
    ``BrokenPipeError``; that is the deterministic way to reach the program's
    ``OSError`` route, which an in-process call cannot produce.  Both ends of
    that pipe are closed on every path, so no descriptor outlives the call.
    """
    command = [sys.executable, str(PROGRAM), *args]
    if stdout_closed:
        read_fd, write_fd = os.pipe()
        try:
            os.close(read_fd)
            completed = subprocess.run(
                command,
                cwd=str(ROOT),
                stdout=write_fd,
                stderr=subprocess.PIPE,
            )
        finally:
            os.close(write_fd)
        # Nothing the child writes can reach a reader, so no byte of its
        # standard output is observable and the capture is empty by definition.
        return completed.returncode, b"", completed.stderr
    completed = subprocess.run(command, cwd=str(ROOT), capture_output=True)
    return completed.returncode, completed.stdout, completed.stderr


def run_program_through_shell(redirection):
    """Run the program through the platform shell with a redirection applied.

    ``redirection`` must be one of the three supported redirections, passed
    as the module-level constant that holds it: ``>&-``
    (``REDIRECTION_STDOUT_CLOSED``, closing descriptor 1), ``< /dev/null``
    (``REDIRECTION_STDIN_DEVNULL``, binding standard input to the null
    device) or ``<&-`` (``REDIRECTION_STDIN_CLOSED``, closing descriptor 0).
    Any other value raises ``ValueError`` before the command is built, so
    nothing but those three shell operators reaches the command line.  The
    shell applies it to the interpreter the ``exec`` builtin replaces itself
    with, so the descriptor state is in place before the interpreter starts --
    the only way to reach the ``sys.stdout is None`` route, which a closed
    pipe does not take.
    """
    if redirection not in SUPPORTED_REDIRECTIONS:
        raise ValueError(
            "redirection {!r} is not one of the supported redirections: "
            "{}".format(redirection, ", ".join(SUPPORTED_REDIRECTIONS))
        )
    command = "exec {} {} {}".format(
        shlex.quote(sys.executable), shlex.quote(str(PROGRAM)), redirection
    )
    completed = subprocess.run(
        command, cwd=str(ROOT), shell=True, capture_output=True
    )
    return completed.returncode, completed.stdout, completed.stderr


class MessageConstantTests(unittest.TestCase):
    """The greeting is a module-level constant holding exactly the message."""

    def test_message_is_exact_and_unpadded(self):
        self.assertEqual(welcome.MESSAGE, "Welcome to Blitzy")
        self.assertEqual(welcome.MESSAGE, welcome.MESSAGE.strip())


class MainCallableTests(unittest.TestCase):
    """``main()`` writes the greeting and writes nothing to standard error."""

    def test_main_writes_exact_bytes_to_stdout(self):
        stdout = io.StringIO()
        with redirect_stdout(stdout):
            result = welcome.main()
        self.assertIsNone(result)
        self.assertEqual(stdout.getvalue(), EXPECTED)

    def test_main_writes_nothing_to_stderr(self):
        stdout = io.StringIO()
        stderr = io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            welcome.main()
        self.assertEqual(stdout.getvalue(), EXPECTED)
        self.assertEqual(stderr.getvalue(), "")

    def test_main_is_repeatable(self):
        for _ in range(3):
            stdout = io.StringIO()
            with redirect_stdout(stdout):
                welcome.main()
            self.assertEqual(stdout.getvalue(), EXPECTED)


class ProcessBehaviourTests(unittest.TestCase):
    """The process interface: exact bytes, exit status and failed writes."""

    def test_exit_status_and_exact_stdout(self):
        returncode, stdout, stderr = run_program()
        self.assertEqual(returncode, 0)
        self.assertEqual(stdout, EXPECTED.encode("ascii"))
        self.assertEqual(stderr, b"")

    def test_command_line_arguments_are_ignored(self):
        plain = run_program()
        returncode, stdout, stderr = run_program("ignored-argument")
        self.assertEqual(returncode, 0)
        self.assertEqual(stdout, EXPECTED.encode("ascii"))
        self.assertEqual(stderr, b"")
        self.assertEqual((returncode, stdout, stderr), plain)

    def test_import_writes_nothing(self):
        completed = subprocess.run(
            [sys.executable, "-c", "import welcome"],
            cwd=str(ROOT),
            capture_output=True,
        )
        self.assertEqual(completed.returncode, 0)
        self.assertEqual(completed.stdout, b"")
        self.assertEqual(completed.stderr, b"")

    def test_unwritable_pipe_exits_non_zero_with_one_diagnostic_line(self):
        returncode, stdout, stderr = run_program(stdout_closed=True)
        self.assertEqual(returncode, 1)
        self.assertEqual(stdout, b"")
        self.assertEqual(stderr, DIAGNOSTIC)

    def test_closed_stdout_descriptor_exits_non_zero_with_one_diagnostic_line(
        self,
    ):
        returncode, stdout, stderr = run_program_through_shell(
            REDIRECTION_STDOUT_CLOSED
        )
        self.assertEqual(returncode, 1)
        self.assertEqual(stdout, b"")
        self.assertEqual(stderr, DIAGNOSTIC)

    def test_empty_or_absent_input_changes_nothing(self):
        for redirection in (
            REDIRECTION_STDIN_DEVNULL,
            REDIRECTION_STDIN_CLOSED,
        ):
            with self.subTest(redirection=redirection):
                returncode, stdout, stderr = run_program_through_shell(
                    redirection
                )
                self.assertEqual(returncode, 0)
                self.assertEqual(stdout, EXPECTED.encode("ascii"))
                self.assertEqual(stderr, b"")
