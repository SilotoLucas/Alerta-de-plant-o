#!/usr/bin/env bash
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMINIO="${1:-$(grep -E '^DOMINIO=' "$RAIZ/.env" | cut -d= -f2-)}"
DESTINO="${BORDA_SITES:-/opt/borda/sites}"
CADDY="${BORDA_CADDY:-abanou-caddy-1}"

[ -n "$DOMINIO" ] || { echo "defina DOMINIO em deploy/.env"; exit 1; }
mkdir -p "$DESTINO"
sed "s/DOMINIO_DO_PLANTAO/${DOMINIO}/g" "$RAIZ/plantao.caddy.modelo" > "$DESTINO/plantao.caddy.novo"
if ! cmp -s "$DESTINO/plantao.caddy.novo" "$DESTINO/plantao.caddy" 2>/dev/null; then
  mv "$DESTINO/plantao.caddy.novo" "$DESTINO/plantao.caddy"
  docker exec "$CADDY" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile \
    || { rm -f "$DESTINO/plantao.caddy"; echo "falha ao recarregar o Caddy da borda"; exit 1; }
  echo "site ${DOMINIO} publicado na borda"
else
  rm "$DESTINO/plantao.caddy.novo"
fi
