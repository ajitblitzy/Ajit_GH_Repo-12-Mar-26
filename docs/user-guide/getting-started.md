# Getting Started

This guide shows you how to run and view the `hao-backprop-test` server — written for anyone, with no programming experience required. Just follow the steps below in order, and you will have it running in well under a minute.

## Prerequisites

The only thing you need is a working **Node.js** installation. Any modern LTS (Long-Term Support) version will do.

There is **no package installation step** — you do **not** need to install any packages before running it. This project has zero third-party dependencies and uses only the Node.js built-in `http` module, so Node.js on its own is enough to run it (`Source: server.js:L1`).

If you are not sure whether Node.js is already installed, open a terminal and check its version:

```bash
node --version
```

If this prints a version number (for example, `v20.11.1`), you are ready to go. If it instead reports that the command was not found, install Node.js first and then reopen your terminal.

## Run the server

Open a terminal, move into the project folder (the folder that contains `server.js`), and start the server with:

```bash
node server.js
```

This single command starts the HTTP server and leaves it running in your terminal (`Source: server.js:L12-L14`).

## Access it

Once the server is running, open the following address in your web browser:

`http://127.0.0.1:3000/`

If you prefer the terminal, you can make the same request with `curl` instead:

```bash
curl http://127.0.0.1:3000/
```

In that address, `127.0.0.1` is the **host** — your own local machine, also known as the loopback address — and `3000` is the **port** the server listens on (`Source: server.js:L3-L4`). These are the exact values the running server is bound to (`Source: server.js:L12-L14`).

## Expected output

There are two things you should see — one in your terminal, and one in your browser.

First, the moment the server starts, your terminal prints this exact line:

```
Server running at http://127.0.0.1:3000/
```

This startup message confirms the server is up and listening (`Source: server.js:L12-L14`).

Second, when you open the address above (or run the `curl` command), the response you get back is the plain text:

```
Hello, World!
```

That is the complete response (`Source: server.js:L9`). It is sent as plain text (`Content-Type: text/plain`), so your browser simply shows the words `Hello, World!` with no formatting.

## Stop the server

When you are finished, return to the terminal window that is running the server and press **Ctrl+C**. The server shuts down immediately and your terminal returns to the command prompt, ready for your next command.

## Where to next

- If something doesn't work, see [Troubleshooting](troubleshooting.md).
- To change the host or port, see [Configuration](../technical/configuration.md).
