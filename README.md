# welcome

`welcome.py` is a single-file Python program with one purpose: write the fixed line `Welcome to Blitzy` to standard output and exit successfully.

## Requirements

Python 3.11 or later.

That is a requirement of the project rather than a check the program makes: `welcome.py` contains no version check, no `sys.version_info` comparison and no warning about the interpreter, so the only thing the version has to satisfy is being able to run the file.

## Run

From the repository root:

```bash
python welcome.py
```

The expected output is exactly:

```text
Welcome to Blitzy
```

That line is the whole of the standard output: 17 characters followed by a single line feed, 18 bytes in all, with no banner, no version text and no blank line. The program exits with status 0 and writes nothing to standard error.

## Test

From the repository root:

```bash
python -m unittest discover
```

Run it from the repository root so that discovery reaches the `tests` package. The suite uses the standard library `unittest` runner, so nothing has to be installed: the command runs ten tests covering the exact output bytes, the exit status, the ignored arguments, the silent import and the failed-write path, reports `OK`, and exits with status 0.

## Arguments

The program takes no arguments and ignores any that are given, so `python welcome.py ignored-argument` behaves exactly like `python welcome.py`, writing the same line and exiting with status 0.

## Behaviour on a failed write

When standard output cannot be written, the program writes exactly one diagnostic line to standard error:

```text
welcome.py: error: cannot write to standard output
```

Standard output stays empty, no traceback is printed, and the program exits with status 1.
