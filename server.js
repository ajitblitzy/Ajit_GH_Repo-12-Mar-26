const express = require('express');

const hostname = '127.0.0.1';
const port = 3000;

const app = express();

app.get('/', (req, res) => res.writeHead(200, { 'Content-Type': 'text/plain' }).end('Hello, World!\n'));
app.get('/good-evening', (req, res) => res.writeHead(200, { 'Content-Type': 'text/plain' }).end('Good evening\n'));

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
