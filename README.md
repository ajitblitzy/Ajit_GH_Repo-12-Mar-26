# hao-backprop-test
test project for backprop integration.

## Descripción

Servidor HTTP mínimo en JavaScript para Node.js que usa solo el módulo integrado `http`, sin dependencias externas. Responde a las peticiones GET y POST normales (véase «Limitaciones») en cualquier ruta con el código de estado `200`, la cabecera `Content-Type: text/plain` y el cuerpo `Hello, World!`, y escucha solo en `127.0.0.1`, puerto `3000`. Es un proyecto de prueba, no un servidor de producción.

Fuente: `server.js`.

## Requisitos

- Node.js 22 o superior (verificado con Node.js v22.23.3).
- No hace falta `npm install` y no existe `package.json`: el único módulo que se usa es el integrado `http`.
- El puerto TCP `3000` libre en `127.0.0.1`.
- `curl` o un navegador web en la misma máquina.

Fuente: `server.js` — `require('http')`, `hostname`, `port`.

## Ejecución

Desde la raíz del repositorio, ejecute:

```bash
node server.js
```

Salida esperada:

```text
Server running at http://127.0.0.1:3000/
```

El proceso queda en primer plano hasta que usted lo detenga con Ctrl+C.

Fuente: `server.js` — `server.listen`, `console.log`.

## Uso

Con el servidor en marcha, abra otra terminal y ejecute:

```bash
curl http://127.0.0.1:3000/
```

Salida:

```text
Hello, World!
```

La respuesta lleva el código de estado `200` y la cabecera `Content-Type: text/plain`; para verlos, use `curl -i http://127.0.0.1:3000/`. Esa salida incluye además las cabeceras `Content-Length`, `Date`, `Connection` y `Keep-Alive`, que añade Node.js. Node.js genera la cabecera `Date` automáticamente: su valor puede cambiar de una petición a otra, pero las peticiones hechas en el mismo segundo pueden llevar el mismo valor.

Si abre `http://127.0.0.1:3000/` en un navegador, verá `Hello, World!`.

La función que atiende las peticiones no mira el método ni la ruta. Por ejemplo, esta petición POST a otra ruta también imprime `Hello, World!`:

```bash
curl -X POST http://127.0.0.1:3000/cualquier/ruta
```

Una petición HEAD normal, como la siguiente, recibe el código de estado `200` y la cabecera `Content-Type: text/plain`, pero sin cuerpo, porque Node.js no envía cuerpo en las respuestas a HEAD:

```bash
curl -I http://127.0.0.1:3000/
```

Fuente: `server.js` — `http.createServer`, `res.statusCode`, `res.setHeader`, `res.end`.

## Estructura del código

- [server.js](server.js): toda la aplicación.
- `README.md`: este documento.

| Código | Qué hace |
|---|---|
| `const http = require('http');` | Carga el módulo integrado `http` de Node.js (`require` de CommonJS); es la única dependencia. |
| `const hostname = '127.0.0.1';` | Dirección de escucha: `127.0.0.1` (loopback), así que solo esta máquina puede conectarse. |
| `const port = 3000;` | Puerto TCP fijo. Si ya está ocupado, el proceso termina con el error `EADDRINUSE`. |
| `const server = http.createServer((req, res) => {` | Crea el servidor. Node.js llama a esta función con cada petición normal; algunos casos especiales los resuelve antes sin llamarla. La función nunca lee `req` (la petición), así que no mira método, ruta, cabeceras ni cuerpo. `res` es la respuesta. |
| `res.statusCode = 200;` | Código de estado HTTP 200 (OK). |
| `res.setHeader('Content-Type', 'text/plain');` | Cabecera `Content-Type`: texto plano. |
| `res.end('Hello, World!\n');` | Envía el cuerpo `Hello, World!` seguido de un salto de línea y termina la respuesta; en HEAD, Node.js omite el cuerpo. |
| `server.listen(port, hostname, () => {` | Empieza a escuchar en `hostname:port`; la función se ejecuta una vez, cuando el servidor ya escucha. No hay manejador de `'error'`: si no se puede usar el puerto, el proceso termina. |
| ``console.log(`Server running at http://${hostname}:${port}/`);`` | Escribe en stdout la línea de arranque `Server running at http://127.0.0.1:3000/`. |

`server.js` contiene estas mismas explicaciones como comentarios, encima de cada instrucción.

Fuente: `server.js`.

## Limitaciones

- Solo se puede acceder desde la misma máquina: escucha en `127.0.0.1` (IPv4), así que no responde a otros equipos ni a `http://[::1]:3000/`. Use `127.0.0.1` en la URL.
- La dirección y el puerto están fijos en el código (`hostname`, `port`). Para cambiarlos, edite esas constantes en `server.js`. No hay variables de entorno, argumentos ni archivos de configuración.
- No hay enrutamiento: la función que atiende las peticiones no lee el método, la ruta, las cabeceras ni el cuerpo. Las peticiones GET y POST normales en cualquier ruta reciben la misma respuesta; HEAD la recibe sin cuerpo.
- Node.js resuelve por su cuenta algunos casos especiales, sin llamar a esa función. Por ejemplo, a una petición HTTP/1.1 con una cabecera `Expect` distinta de `100-continue` le responde `417 Expectation Failed`.
- No hay manejo de errores: si el puerto `3000` ya está en uso, el proceso escribe en stderr `Error: listen EADDRINUSE: address already in use 127.0.0.1:3000` y termina con el código de salida 1. Detenga lo que ocupa el puerto (por ejemplo, otro `node server.js`) y vuelva a ejecutarlo.
- No tiene apagado ordenado, HTTPS, autenticación ni pruebas automatizadas. No es apto para producción.

Fuente: `server.js` — `hostname`, `port`, `http.createServer`, `server.listen` (sin manejador de `'error'`).
