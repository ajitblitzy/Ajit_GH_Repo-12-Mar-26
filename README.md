# hao-backprop-test

Test project for backprop integration; its Python deliverable is `Welcome.py`, which prints two lines of plain, unformatted text to standard output.

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

Those two lines and nothing more, followed by exactly one trailing newline — 72 characters in total, which is 72 bytes wherever stdout is not newline-translated. Nothing else is written to standard output, nothing at all is written to standard error, and the exit status is 0. The text is a literal constant in the source, transcribed at design time from an image supplied with the request; no file is read at runtime.

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

`python -m` puts the repository root on `sys.path`, which is what lets the test module `import Welcome`. The suite uses only the standard library (`unittest`), so there is nothing to install in order to run it.
