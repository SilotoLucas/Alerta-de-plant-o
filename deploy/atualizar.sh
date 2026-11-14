#!/usr/bin/env bash
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ESTADO="${PLANTAO_ESTADO:-/var/lib/plantao-deploy}"
RAMO="${PLANTAO_RAMO:-main}"

principal() {
  mkdir -p "$ESTADO"
  exec 9>"$ESTADO/trava"
  flock -n 9 || { echo "deploy já em andamento"; return 0; }
  cd "$RAIZ"
  git fetch --quiet origin "$RAMO"
  local alvo ultimo
  alvo="$(git rev-parse "origin/$RAMO")"
  ultimo="$(cat "$ESTADO/ultimo" 2>/dev/null || true)"
  if [ "$alvo" = "$ultimo" ] && [ "${1:-}" != "--forcar" ]; then return 0; fi
  echo "deploy de ${alvo:0:7} (antes: ${ultimo:0:7})"
  git checkout --quiet --force "$RAMO"
  git reset --quiet --hard "$alvo"
  cd deploy
  docker compose up -d --build --remove-orphans
  if grep -qE '^COMPOSE_FILE=.*compose\.borda\.yml' .env; then ./instalar-na-borda.sh; fi
  docker image prune -f > /dev/null
  echo "$alvo" > "$ESTADO/ultimo"
  echo "deploy de ${alvo:0:7} concluído"
}

principal "$@"
exit
