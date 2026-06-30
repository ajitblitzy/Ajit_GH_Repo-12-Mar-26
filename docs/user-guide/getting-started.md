# Getting Started

Welcome! This guide shows you, step by step, how to run and view the `hao-backprop-test` server — written for any user, with no programming experience required.

Follow the sections in order — **Prerequisites → Run the server → Access it → Expected output → Stop the server** — and in under a minute you will see a friendly `Hello, World!` message in your browser.

## Prerequisites

The only thing you need is a working **Node.js** installation. Any modern LTS (Long-Term Support) release will do.

There is **no package installation step** — you do **not** need to run `npm install`. This project has zero third-party dependencies and uses only the Node.js built-in `http` module (Source: server.js:L1), so once Node.js is installed you are ready to go.

If you would like to confirm that Node.js is installed, open a terminal and check its version:

```bash
node --version
```

If a version number is printed, you are all set.

## Run the server

Open a terminal in the project folder (the folder that contains `server.js`) and start the server with this command:

```bash
node server.js
```

That single command starts the HTTP server and leaves it running in your terminal (Source: server.js:L12-L14).

## Access it

Once the server is running, open the following address in your web browser:

```
http://127.0.0.1:3000/
```

Prefer the terminal? You can make the same request with `curl`:

```bash
curl http://127.0.0.1:3000/
```

In that address, `127.0.0.1` is the **host** — the loopback address that simply means "this same computer" — and `3000` is the **port** the server is listening on (Source: server.js:L3-L4). Together they point to the running server on your own machine (Source: server.js:L12-L14).

## Expected output

There are two things you should see.

**1. In the terminal**, right after you start the server, it prints this startup line:

```
Server running at http://127.0.0.1:3000/
```

This confirms the server has started and is ready (Source: server.js:L12-L14).

**2. In the browser (or `curl` response)**, you will see this text:

```
Hello, World!
```

The server always returns this same plain-text response (Source: server.js:L9). It is sent as plain text (`Content-Type: text/plain`), so it appears exactly as shown above.

## Stop the server

When you are finished, click the terminal window that is running the server and press **Ctrl+C**. The server shuts down immediately and your terminal returns to its normal prompt.

## Where to next

- Something not working? See [Troubleshooting](troubleshooting.md) for fixes to the most common problems.
- Want to change the host or port? See [Configuration](../technical/configuration.md).
