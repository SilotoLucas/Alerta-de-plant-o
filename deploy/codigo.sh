#!/usr/bin/env bash
# Gera um código de pareamento de 6 dígitos (vale 10 minutos, uso único): ./codigo.sh empresa|pessoal
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
PAPEL="${1:-}"
[ "$PAPEL" = "empresa" ] || [ "$PAPEL" = "pessoal" ] || { echo "uso: ./codigo.sh empresa|pessoal"; exit 1; }
docker compose exec -T -e PAPEL="$PAPEL" api bun -e '
const r = await fetch("http://localhost:3350/admin/pareamentos", {
  method: "POST",
  headers: { "x-admin-token": process.env.PLANTAO_ADMIN_TOKEN ?? "", "content-type": "application/json" },
  body: JSON.stringify({ papel: process.env.PAPEL }),
});
const j = await r.json();
console.log(r.ok ? `Código ${j.codigo} (${j.papel}), vale 10 minutos` : `Erro ${r.status}: ${JSON.stringify(j)}`);
process.exit(r.ok ? 0 : 1);'
