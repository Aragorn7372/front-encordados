# FrontEncordados

## Desplegar (imagen Docker)

La imagen no necesita *build args*: se configura con variables de entorno al arrancar, igual en
`docker compose`, en un `docker run` o en una plataforma de contenedores (Render, Railway,
Fly.io, Google Cloud Run…).

| Variable | Por defecto | Para qué |
| --- | --- | --- |
| `API_URL` | *(vacía)* | URL de la API y del hub de tiempo real, sin barra final. Vacía = el mismo dominio que el front (detrás de un proxy que mande `/api` y `/hub` al backend). Si es otro dominio, el backend tiene que permitirlo en CORS (`Cors__AllowedOrigins__N`). |
| `PORT` | `80` | Puerto en el que escucha nginx. Muchas plataformas lo eligen y lo pasan así. |

```bash
docker build -t encordados-front .
docker run -p 8080:8080 -e PORT=8080 -e API_URL=https://api.ejemplo.com encordados-front
```

Comprobación de salud: `GET /health` → `ok`. La configuración que ha leído: `GET /config.json`.

Las plataformas de sitios estáticos (Netlify, Vercel…) **no usan el Dockerfile**: compilan y
sirven los ficheros. Ahí `config.json` y las cabeceras se configuran aparte.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Tests end-to-end (Playwright)

Están en `e2e/` y prueban la app de verdad contra un backend real, con **2 workers en
paralelo**: escritorio y móvil (Pixel 7), acceso y permisos por rol, el tablero (botones,
detalle, formulario, tiempo real y trabajo sin conexión sin duplicados) y accesibilidad con
axe (WCAG 2 A/AA) en todas las pantallas y en los dos temas.

```bash
npm run build          # los e2e sirven el build actual
npm run e2e            # contra el backend de E2E_API (por defecto https://localhost, el docker-compose)
npm run e2e:informe    # el informe HTML de la última ejecución
```

| Variable | Por defecto | Para qué |
| --- | --- | --- |
| `E2E_API` | `https://localhost` | Backend al que `e2e/servidor.mjs` reenvía `/api` y `/hub` (también el WebSocket). |
| `E2E_BASE_URL` | *(vacía)* | Si se pone, se prueba esa URL tal cual y no se levanta el servidor (por ejemplo, todo el docker-compose en el CI). |
| `CI` | *(vacía)* | En el CI: un reintento por test y prohibido dejar un `test.only`. |

Cada ejecución crea su propio torneo (con `carlos_encordador` de encordador y `supervisor_luis`
de supervisor), hace ahí todos los pedidos y jugadores, con nombres únicos para que los dos
workers no se pisen, y borra el torneo al terminar, aunque algo falle. El resto (jugadores,
cuentas de prueba, pedidos) no se borra: los e2e corren contra bases de datos temporales.
Necesita los usuarios del seed del backend (`e2e/soporte/usuarios.ts`).

Primera vez en una máquina nueva: `npx playwright install chromium`.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Licencia

Este proyecto se distribuye bajo la [PolyForm Noncommercial License 1.0.0](LICENSE): se puede ver, estudiar y modificar para fines **no comerciales**. Cualquier uso comercial requiere el permiso de la autora o el autor.
