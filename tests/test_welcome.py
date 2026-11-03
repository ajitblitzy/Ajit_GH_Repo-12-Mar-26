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


def run_program(*args, stdout_closed=False):
    """Run the program in a fresh interpreter and return its result.

    The result is a ``(returncode, stdout_bytes, stderr_bytes)`` tuple.  With
    ``stdout_closed`` true the read end of a pipe is closed before the child
    starts, so the child has no reader left and its writes fail with
    ``BrokenPipeError``; that is the deterministic way to reach the program's
    ``OSError`` route, which an in-process call cannot produce.
    """
    command = [sys.executable, str(PROGRAM), *args]
    if stdout_closed:
        read_fd, write_fd = os.pipe()
        os.close(read_fd)
        try:
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

    ``redirection`` is a POSIX shell redirection: ``>&-`` closes descriptor 1,
    ``<&-`` closes descriptor 0, and ``< /dev/null`` binds standard input to
    the null device.  The shell applies it to the interpreter the ``exec``
    builtin replaces itself with, so the descriptor state is in place before
    the interpreter starts -- the only way to reach the ``sys.stdout is None``
    route, which a closed pipe does not take.
    """
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
        returncode, stdout, stderr = run_program_through_shell(">&-")
        self.assertEqual(returncode, 1)
        self.assertEqual(stdout, b"")
        self.assertEqual(stderr, DIAGNOSTIC)

    def test_empty_or_absent_input_changes_nothing(self):
        for redirection in ("< /dev/null", "<&-"):
            with self.subTest(redirection=redirection):
                returncode, stdout, stderr = run_program_through_shell(
                    redirection
                )
                self.assertEqual(returncode, 0)
                self.assertEqual(stdout, EXPECTED.encode("ascii"))
                self.assertEqual(stderr, b"")
