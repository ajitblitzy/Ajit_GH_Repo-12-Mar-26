const http = require('node:http');

const WELCOME_MESSAGE = 'Welcome to Blity';

const RESPONSE_BODIES = {
  200: WELCOME_MESSAGE,
  404: 'Not Found',
  405: 'Method Not Allowed',
  500: 'Internal Server Error'
};

function readPort() {
  const raw = process.env.PORT;

  if (raw === undefined) {
    return 3000;
  }

  const port = Number(raw);

  if (!/^[0-9]+$/.test(raw) || port < 1 || port > 65535) {
    console.error(`Invalid PORT value: "${raw}" (expected an integer between 1 and 65535)`);
    // Set an exit code instead of calling process.exit(), which can cut off queued output.
    process.exitCode = 1;
    return null;
  }
  return port;
}

function send(res, status) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(RESPONSE_BODIES[status]);
}

function handleRequest(req, res) {
  try {
    // The path is decided first, so an unknown path is 404 for every method.
    const path = req.url.split('?')[0];

    if (path !== '/') {
      send(res, 404);
      return;
    }

    if (req.method !== 'GET') {
      send(res, 405);
      return;
    }

    send(res, 200);
  } catch (err) {
    console.error(err);
    // Only an unsent response can be answered; a second write to it would throw.
    if (res.headersSent) {
      res.destroy();
      return;
    }

    send(res, 500);
  }
}

function main() {
  const port = readPort();

  if (port === null) {
    return;
  }

  const server = http.createServer(handleRequest);

  server.on('error', (err) => {
    if (!server.listening) {
      console.error(`Failed to start server on port ${port}: ${err.message}`);
      process.exitCode = 1;
    }
  });

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);

    const stop = () => {
      server.close();

      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
    };

    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  });
}

main();
