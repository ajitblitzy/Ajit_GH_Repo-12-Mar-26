// Servidor HTTP mínimo "Hello, World!" del proyecto hao-backprop-test.
// Usa solo el módulo integrado `http` de Node.js, sin dependencias externas.
// Se ejecuta con `node server.js` y escucha en http://127.0.0.1:3000/.
// Las peticiones GET y POST normales reciben el código de estado 200, la cabecera Content-Type: text/plain y el cuerpo "Hello, World!".
// Una petición HEAD normal recibe el mismo código de estado y Content-Type, sin cuerpo; no se describen otros métodos. Detalles en README.md.

// Carga el módulo integrado `http` de Node.js (require de CommonJS); es la única dependencia.
const http = require('http');

// Dirección de escucha: 127.0.0.1 (loopback), así que solo esta máquina puede conectarse.
const hostname = '127.0.0.1';
// Puerto TCP fijo. Si ya está ocupado, el proceso termina con el error EADDRINUSE.
const port = 3000;

// Crea el servidor. Node.js llama a esta función con cada petición normal; algunos casos especiales los resuelve antes sin llamarla.
// La función nunca lee `req` (la petición), así que no mira método, ruta, cabeceras ni cuerpo. `res` es la respuesta.
const server = http.createServer((req, res) => {
  // Código de estado HTTP 200 (OK).
  res.statusCode = 200;
  // Cabecera Content-Type: texto plano.
  res.setHeader('Content-Type', 'text/plain');
  // Envía el cuerpo "Hello, World!" seguido de un salto de línea y termina la respuesta; en HEAD, Node.js omite el cuerpo.
  res.end('Hello, World!\n');
});

// Empieza a escuchar en hostname:port; la función se ejecuta una vez, cuando el servidor ya escucha.
// No hay manejador de 'error': si no se puede usar el puerto, el proceso termina.
server.listen(port, hostname, () => {
  // Escribe en stdout la línea de arranque "Server running at http://127.0.0.1:3000/".
  console.log(`Server running at http://${hostname}:${port}/`);
});
