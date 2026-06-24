# Troubleshooting

This page lists the most common problems you might run into when running `hao-backprop-test`, and how to fix them — explained in plain language. New here? Start with [Getting Started](getting-started.md).

## Port already in use (EADDRINUSE)

**Symptom.** When you run `node server.js`, the server does not start and the terminal shows an error that mentions `EADDRINUSE` and port `3000`, similar to this:

```
Error: listen EADDRINUSE: address already in use 127.0.0.1:3000
```

**What it means.** Another program on your machine is already using **port** `3000`, so the server cannot claim it.

**How to fix it.** You have two options — pick whichever is easier for you:

1. **Free the port.** Find and stop the other program that is currently using port `3000`, then start the server again.
2. **Use a different port.** Open `server.js`, find the `port` constant on line 4, and change it to a free number (for example, from `3000` to `3001`), then save the file. The **host** stays `127.0.0.1`; only the **port** changes (`Source: server.js:L3-L4`). If you switch to `3001`, you will then open `http://127.0.0.1:3001/` in your browser instead.

Either way, start the server again with:

```bash
node server.js
```

For the exact steps to change the host or port, see [Configuration](../technical/configuration.md).

## Node.js is not installed / `command not found`

**Symptom.** Running `node server.js` reports something like `node: command not found` (on macOS or Linux) or `'node' is not recognized as an internal or external command` (on Windows).

**What it means.** Node.js is either not installed, or it is installed but not on your system PATH, so your terminal cannot find the `node` program.

**How to fix it.** Install Node.js (any modern LTS release), then close and reopen your terminal so it picks up the new PATH. Confirm the installation worked:

```bash
node --version
```

If that prints a version number (for example, `v20.11.1`), start the server again:

```bash
node server.js
```

This project needs nothing more than Node.js itself: it uses only the built-in `http` module and has no other packages to install (`Source: server.js:L1`).

## The browser shows nothing / wrong address

**Symptom.** Your browser shows a blank page, a "can't connect" or "site can't be reached" message, or some other page instead of `Hello, World!`.

**How to fix it.** Work through this short checklist:

1. **Is the server still running?** Look at the terminal where you started the server. It should still be open and showing the startup line `Server running at http://127.0.0.1:3000/` (`Source: server.js:L12`). If that terminal was closed or the server was stopped, start it again with `node server.js`.
2. **Are you using the exact address?** Open exactly `http://127.0.0.1:3000/`. The **host** must be `127.0.0.1` and the **port** must be `3000` (`Source: server.js:L3-L4`). Common mistakes are typing `https://` instead of `http://`, using a different port, or mistyping the address.

**Note.** This server listens on the loopback host `127.0.0.1` only, so it is reachable **only from the same machine** that is running it — not from another device on your network (`Source: server.js:L3`).

## How to stop a running server

To stop the server, click the terminal window that is running it and press **Ctrl+C**. The server shuts down right away and the terminal returns to the command prompt, ready for your next command.
