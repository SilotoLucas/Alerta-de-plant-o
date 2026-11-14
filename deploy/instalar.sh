#!/usr/bin/env bash
# Primeira instalação na VM (como root, com o repositório em /opt/plantao). Seguro de repetir.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ/deploy"
[ "$RAIZ" = "/opt/plantao" ] || { echo "clone o repositório em /opt/plantao (as unidades do systemd apontam para lá)"; exit 1; }
docker network inspect borda > /dev/null 2>&1 || { echo "rede 'borda' não existe: suba o Abanou antes"; exit 1; }

if [ ! -f .env ]; then
  DOMINIO="${1:-plantao.194.5.152.64.sslip.io}"
  sed -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" \
      -e "s|^PLANTAO_ADMIN_TOKEN=.*|PLANTAO_ADMIN_TOKEN=$(openssl rand -hex 24)|" \
      -e "s|^DOMINIO=.*|DOMINIO=${DOMINIO}|" .env.example > .env
  chmod 600 .env
  echo ".env criado em $RAIZ/deploy/.env (domínio: ${DOMINIO})"
fi

./atualizar.sh --forcar
cp plantao-deploy.service plantao-deploy.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now plantao-deploy.timer
echo "pronto: https://$(grep -E '^DOMINIO=' .env | cut -d= -f2-)/health"
echo "gere um código com: $RAIZ/deploy/codigo.sh pessoal"
