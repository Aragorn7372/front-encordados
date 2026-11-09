// Servidor de los e2e: sirve el build del front (dist/) como lo haría nginx y reenvía /api y /hub
// (también el WebSocket de SignalR) al backend de E2E_API. Así se prueba el código actual sin
// reconstruir la imagen de Docker.
//
//   E2E_API   backend al que reenviar (por defecto https://localhost, el nginx del docker-compose)
//   E2E_PORT  puerto en el que escucha (por defecto 4310)
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(fileURLToPath(import.meta.url), '../../dist/front-encordados/browser');
const API = new URL(process.env.E2E_API ?? 'https://localhost');
const PUERTO = Number(process.env.E2E_PORT ?? 4310);
const SEGURO = API.protocol === 'https:';
const PUERTO_API = Number(API.port || (SEGURO ? 443 : 80));

if (!fs.existsSync(path.join(RAIZ, 'index.html'))) {
  console.error(`No hay build en ${RAIZ}: ejecuta antes "npm run build".`);
  process.exit(1);
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

const esBackend = (url) => url.startsWith('/api') || url.startsWith('/hub');

const servidor = http.createServer((req, res) => {
  if (esBackend(req.url)) {
    // El certificado local (mkcert) no es de confianza para Node: es un entorno de pruebas
    const peticion = (SEGURO ? https : http).request(
      {
        host: API.hostname,
        port: PUERTO_API,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: API.host },
        rejectUnauthorized: false,
      },
      (respuesta) => {
        res.writeHead(respuesta.statusCode ?? 502, respuesta.headers);
        respuesta.pipe(res);
      },
    );
    peticion.on('error', () => {
      res.writeHead(502);
      res.end();
    });
    req.pipe(peticion);
    return;
  }

  const ruta = decodeURIComponent(req.url.split('?')[0]);
  let fichero = path.join(RAIZ, ruta);
  if (!fichero.startsWith(RAIZ) || !fs.existsSync(fichero) || fs.statSync(fichero).isDirectory()) {
    fichero = path.join(RAIZ, 'index.html'); // la SPA resuelve la ruta
  }
  res.writeHead(200, {
    'Content-Type': TIPOS[path.extname(fichero)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(fichero).pipe(res);
});

// WebSocket de SignalR: se reenvía la petición de upgrade tal cual y se unen los dos sockets
servidor.on('upgrade', (req, socket, cabeza) => {
  if (!esBackend(req.url)) return socket.destroy();
  const conectar = SEGURO
    ? (alConectar) =>
        tls.connect(
          {
            host: API.hostname,
            port: PUERTO_API,
            servername: API.hostname,
            rejectUnauthorized: false,
          },
          alConectar,
        )
    : (alConectar) => net.connect(PUERTO_API, API.hostname, alConectar);
  const destino = conectar(() => {
    const cabeceras = { ...req.headers, host: API.host };
    destino.write(
      `${req.method} ${req.url} HTTP/1.1\r\n` +
        Object.entries(cabeceras)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n') +
        '\r\n\r\n',
    );
    destino.write(cabeza);
    destino.pipe(socket).pipe(destino);
  });
  destino.on('error', () => socket.destroy());
  socket.on('error', () => destino.destroy());
});

servidor.listen(PUERTO, () =>
  console.log(`e2e: http://localhost:${PUERTO} → build de dist/, API en ${API.origin}`),
);
