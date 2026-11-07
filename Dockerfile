# ============================================
# 1) Compilar: Node 24 (Angular 22 pide ^22.22.3 o ^24.15)
# ============================================
FROM node:24-alpine AS build
WORKDIR /app

# Primero solo las dependencias: si no cambian, Docker reutiliza esta capa
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ============================================
# Informe de tests y cobertura (como backend_coverage). Solo se construye si se pide:
#   docker build --target coverageweb -t encordados-front-coverage .
# Si algún test falla, la imagen no se construye: mejor eso que un informe engañoso.
# ============================================
FROM build AS coverage
RUN npm run test:coverage

FROM nginx:1.28-alpine AS coverageweb
RUN rm -rf /usr/share/nginx/html/*
# .vitest: la lista de tests (con su pestaña de cobertura) que genera el reporter html
COPY --from=coverage /app/.vitest/ /usr/share/nginx/html/
EXPOSE 80

# ============================================
# 2) Servir: nginx con lo compilado (la etapa por defecto: va la última)
# ============================================
# Sin build args: todo se configura con variables de entorno al arrancar, así la misma imagen
# vale en docker-compose, en un `docker run` y en cualquier plataforma de contenedores
# (Render, Railway, Fly.io, Cloud Run…):
#   API_URL  URL de la API (y del hub). Vacía = mismo dominio, detrás de un proxy. Se escribe
#            en config.json (docker/40-config-json.sh).
#   PORT     Puerto en el que escucha. Muchas plataformas lo eligen ellas y lo pasan así.
FROM nginx:1.28-alpine
# NGINX_ENVSUBST_FILTER: en la plantilla solo se sustituye PORT (las de nginx, como $uri, no)
ENV API_URL="" \
    PORT=80 \
    NGINX_ENVSUBST_FILTER="^PORT$"
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/front-encordados/browser/ /usr/share/nginx/html/
# La imagen de nginx convierte /etc/nginx/templates/*.template en /etc/nginx/conf.d/ al arrancar
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/cabeceras.conf /etc/nginx/snippets/cabeceras.conf
# La imagen de nginx ejecuta al arrancar lo que haya en /docker-entrypoint.d/.
# Se quitan los \r por si el fichero llega con finales de línea de Windows
COPY docker/40-config-json.sh /docker-entrypoint.d/40-config-json.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-config-json.sh \
 && chmod +x /docker-entrypoint.d/40-config-json.sh

# El de por defecto; si la plataforma pasa otro en PORT, se escucha en ese
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" || exit 1
