# Troubleshooting

This page lists the most common problems you might run into when running `hao-backprop-test` and how to fix them, explained in plain language, one step at a time. New here? Start with [Getting Started](getting-started.md).

## Port already in use (EADDRINUSE)

**Symptom.** You run the server with `node server.js`, but instead of starting it stops with an error that mentions `EADDRINUSE` and the number `3000`. The message usually looks something like this:

```
Error: listen EADDRINUSE: address already in use 127.0.0.1:3000
```

**What it means.** Another program on your machine is already using **port** `3000`, so the server cannot claim it. Only one program can use a given port at a time.

**How to fix it.** You have two options:

1. **Free the port.** Find and stop the other program that is already using port `3000`, then start the server again:

   ```bash
   node server.js
   ```

2. **Use a different port.** Open `server.js`, change the `port` constant on line 4 to a free number (for example, `3001`), save the file, and start the server again:

   ```bash
   node server.js
   ```

The **host** and **port** are set by two constants near the top of `server.js` — `hostname` is `127.0.0.1` and `port` is `3000` (`Source: server.js:L3-L4`). Editing those two constants is the only way to change the host or port; there is no environment variable, no command-line flag, and no configuration file to set.

> If you change the port, remember to open the new address in your browser too — for example, `http://127.0.0.1:3001/` if you switched to port `3001`.

For the exact steps to change the host or port, see [Configuration](../technical/configuration.md).

## Node.js is not installed / `command not found`

**Symptom.** When you run `node server.js`, the terminal reports that it cannot find `node`. The exact wording depends on your operating system:

```
node: command not found
```

On Windows you may instead see:

```
'node' is not recognized as an internal or external command,
operable program or batch file.
```

**What it means.** Node.js is either not installed, or it is installed but not on your system **PATH** (the list of locations your terminal searches for programs).

**How to fix it.**

1. Install Node.js — any modern LTS (Long-Term Support) release is fine.
2. Close and reopen your terminal so it picks up the new installation.
3. Confirm that Node.js is available by checking its version:

   ```bash
   node --version
   ```

   If a version number is printed, you are ready to go. Now run the server again:

   ```bash
   node server.js
   ```

This project needs nothing more than Node.js itself: it relies only on the Node.js built-in `http` module and has no other packages to install (`Source: server.js:L1`).

## The browser shows nothing / wrong address

**Symptom.** You opened your browser but see a blank page, a "can't connect" or "site can't be reached" message, or an unexpected page.

**How to fix it.** Work through this short checklist:

1. **Is the server still running?** Look at the terminal where you started the server. It should still be open and still showing the startup line:

   ```
   Server running at http://127.0.0.1:3000/
   ```

   If that window was closed or you pressed Ctrl+C, the server has stopped — start it again with `node server.js` (`Source: server.js:L12`).

2. **Are you using the exact address?** Open this address, character for character:

   ```
   http://127.0.0.1:3000/
   ```

   The **host** must be `127.0.0.1` and the **port** must be `3000` (`Source: server.js:L3-L4`). The most common mistakes are:

   - typing `https://` instead of `http://` (this server uses plain `http://`);
   - using a port number other than `3000`;
   - mistyping the address (for example, a `localhost` typo).

**Note.** The server listens only on the loopback host `127.0.0.1` (`Source: server.js:L3-L4`), so it is reachable only from the same machine that is running it — not from another computer or phone on your network.

## How to stop a running server

To stop the server, click the terminal window that is running it and press **Ctrl+C**. The server shuts down right away and your terminal returns to the normal prompt, ready for your next command.
