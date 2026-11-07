#!/bin/sh
# Escribe config.json desde el entorno al arrancar el contenedor (lo lee src/main.ts).
# API_URL vacía = la API está en el mismo dominio (detrás del nginx de docker-compose).
set -eu

# Sin barra final: la app añade /api y /hub detrás (https://api.x//api fallaría)
API_URL=$(printf '%s' "${API_URL:-}" | sed 's:/*$::')
# Escapa \ y " para que el JSON siga siendo válido
escapada=$(printf '%s' "$API_URL" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf '{ "apiUrl": "%s" }\n' "$escapada" > /usr/share/nginx/html/config.json

echo "40-config-json.sh: apiUrl=\"$API_URL\""
