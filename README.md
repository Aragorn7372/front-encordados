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

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
