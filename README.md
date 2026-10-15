# hao-backprop-test
test project for backprop integration.

## What this project is

This is a small repository holding two JavaScript programs.

`Welcome.js` prints one line, the greeting `Welcome to Blitzy`, and then stops. `server.js` starts a small web server that answers every request with `Hello, World!`.

Both programs are run by typing one command in a terminal, the window where you type commands. The `node` command runs a JavaScript file, and the name of the file to run follows it. Neither program needs installing, building or any other software before it runs.

## Files in this repository

| File | What it is for | How it is used |
|---|---|---|
| `Welcome.js` | Prints one line of greeting text and stops. | Run it with the command in **How to run Welcome.js** below. |
| `server.js` | Starts the small web server that replies `Hello, World!` to every request. | Run it with the command in **How to run server.js** below. |
| `README.md` | This guide. | Read it in the repository. |

The repository also contains a `blitzy/documentation/` folder holding generated documentation, which is not needed to run either program.

## Prerequisites

Node.js is the only prerequisite. Install a supported **LTS release**. An LTS release is a long-term-support version of Node.js, the release line recommended for everyday use.

This repository is verified on **v24.21.0** (reference line) and **v22.23.2** (supported floor). To check the version you have, run this in a terminal:

```bash
node --version        # prints the version you have; the supported floor is v22.23.2
```

Nothing else is required. There is no `package.json`, no `npm install`, no build step, and nothing to configure: no database, no container and no external network access is needed. Both programs use only modules that Node.js already provides, where a module is a piece of code the runtime supplies, so there is nothing to download or set up.

## How to run Welcome.js

Open a terminal and change to the repository root, the folder that holds `Welcome.js`. Running the command below from there is what makes the file findable, because `node` looks for the file in the folder you are in.

```bash
node Welcome.js
```

The program prints one line and then stops:

```
Welcome to Blitzy
```

It ends on its own and reports success, which is called an exit status of 0.

## How to run server.js

In the same terminal, in the repository root, run:

```bash
node server.js
```

The server prints one confirmation line and then keeps running until you stop it:

```
Server running at http://127.0.0.1:3000/
```

That is the address the server listens on. `127.0.0.1` is this computer, the loopback address, so the server answers requests made on this machine. `3000` is the port, the numbered channel a server listens on.

To check the server, open `http://127.0.0.1:3000/` in a browser: the page shows `Hello, World!`. To check it from a terminal instead, open a second terminal and run:

```bash
curl http://127.0.0.1:3000/
```

It prints the same text, `Hello, World!`. That example assumes a terminal where `curl` is the curl program, a small command-line tool for making web requests, as it is on Linux and macOS. On Windows, the name `curl` is not always the curl program: in Windows PowerShell it is an alias for a different command, so type `curl.exe http://127.0.0.1:3000/` there instead. The reply is plain text, not a formatted web page, and it arrives with status 200, which means the request succeeded.

To stop the server, go back to the terminal where it is running and press **Ctrl+C**, the keystroke that interrupts the program. The server stops and the prompt comes back.
