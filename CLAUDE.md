@AGENTS.md

## Só para o Claude Code

- Regras por camada em `.claude/rules/` entram no contexto pelo `paths:` quando você abre um arquivo
  daquela pasta (`domain`, `application`, `contracts`, `infra`, `api`, `quality`, `android`, `windows`).
  Procedimentos recorrentes estão em `.claude/skills/` (`/gate`, `/new-usecase`, `/migration`).
- Subagentes: no máximo 3 ao mesmo tempo, nunca dois no mesmo diretório. Dono único, sem paralelo:
  `tools/quality/`, `.dependency-cruiser.cjs`, `biome.json`, `docs/decisoes.md`.
- Hooks do Claude Code estão **propostos** em `.claude/hooks.proposto.json`. Não copie para
  `.claude/settings.json`: instalar é decisão do dono.
- Matar processo só por PID, obtido em uma chamada separada (nunca `pkill -f`). Não toque no emulador
  `Pixel_8` nem nos containers de outros projetos (`supabase_*_vanflow`, `bussola-db`, `abanou-*`);
  use AVD e container temporários e apague no fim.
- Ao terminar uma fase: rode `bun run validate`, reporte uma linha por dimensão (nunca a saída
  bruta), mostre o que foi feito e o plano da próxima, e espere a aprovação do dono.
- Responda ao dono em português (pt-BR).
