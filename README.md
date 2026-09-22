# hao-backprop-test
test project for backprop integration.

The Python deliverable in this repository is `Welcome.py`, which prints two lines of plain, unformatted text to standard output.

The pre-existing `server.js` is unrelated to this Python deliverable and is untouched by it.

## Usage

Run the program from the repository root:

```
python Welcome.py
```

It takes no arguments and reads no input of any kind. There is nothing to install: no installation step, no virtual environment and no dependency resolution, because the program uses only what the interpreter already provides. Where `python` resolves to Python 2 or is absent, `python3 Welcome.py` is the equivalent.

## Expected output

```
Welcome to Blitzy
AI-Powered Code Generation & Technical Specifications
```

Those two lines and nothing more, followed by exactly one trailing newline: 72 characters in total, which is 72 bytes wherever stdout is not newline-translated. Nothing else is written to standard output, nothing at all is written to standard error, and the exit status is 0. The text is a literal constant in the source, transcribed at design time from an image supplied with the request; no file is read at runtime.

That contract describes a normal invocation, which is the only case the program controls: where the environment prevents delivery (a consumer closing the pipe early, or an unwritable redirect target such as `> /dev/full`), the interpreter reports the failure on standard error and exits non-zero rather than swallowing it. One case is silent, and is documented here rather than guarded against: `python Welcome.py >&-` starts the program with file descriptor 1 already closed, so it delivers nothing yet still exits 0 with an empty standard error, because CPython binds `sys.stdout` to `None` when stdout is not open at startup and the built-in `print()` then does nothing; that is true of every CPython program that prints, `python -c "print('X')" >&-` included, rather than of this one in particular.

On a GNU/Unix shell the bytes can be corroborated directly:

```
python Welcome.py | wc -c        # 72
python Welcome.py | sha256sum    # 8012dda8ef6285781c3ca772d98fb265df8ce38e2d5284aa01b99a4d97d37b33
```

Treat both as corroboration only: `sha256sum` is not present by default on macOS, neither utility is available in standard Windows shells, and Windows text-mode stdout translates `\n` to `\r\n`, which changes both the count and the digest. The portable check is the test suite below.

## Requirements

CPython 3.11 or newer, on Linux, macOS or Windows. There are no third-party packages and no dependency manifest. The version floor is documentation-only: no code checks the interpreter version, and there is no packaging metadata that declares it. Verification targeted the current stable line, CPython 3.14, and the design was also exercised on CPython 3.12.3.

## Tests

Run the suite from the repository root:

```
python -m unittest discover -s tests
```

`python -m` puts the repository root on `sys.path`, which is what lets the test module `import Welcome`. Run the suite in the interpreter's default mode: isolated and safe-path mode (`python -I`, `python -P` or `PYTHONSAFEPATH=1`) suppresses that path entry, so the suite then fails with `ModuleNotFoundError: No module named 'Welcome'`, even though the program itself is unaffected and `python -I -S Welcome.py` still prints the same 72 characters. The suite uses only the standard library (`unittest`), so there is nothing to install in order to run it.
