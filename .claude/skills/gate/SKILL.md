---
name: gate
description: Roda o gate de qualidade do monorepo (validate:quick ou validate completo), interpreta o resultado por exit code e conserta violações na ordem certa. Use antes de propor commit, ao terminar uma fase, ou quando pedirem para "rodar o gate", "validar" ou "ver se está verde".
---

# /gate

1. Durante iteração: `bun run validate:quick`. Antes de propor commit ou fechar fase:
   `bun run validate`.
2. Leia o exit code antes de qualquer outra coisa:
   - `0`: verde. Reporte uma linha (`validate(full): verde em Xs`).
   - `2`: **ferramenta quebrada**. Leia a linha `QUEBRADO` e conserte o ambiente ou a config do
     gate (binário ausente, config inválida, lcov ausente). Não toque em código de produto.
   - `1`: violação de código. Siga para o passo 3.
3. Se `tipos` reprovou, só ele importa: o resto nem rodou. Conserte o tipo e rode de novo.
4. Conserte por dimensão, na ordem do resumo. Cada linha traz o `fix:`; siga-o. Para isolar:
   `bun tools/quality/src/validate.ts --mode full --only <fase>`.
5. Formatação: `bun run format`.
6. Nunca: remover asserção, `.skip`, comentário para calar o gate, `--no-verify`, afrouxar regra em
   `.dependency-cruiser.cjs` ou `biome.json` sem uma entrada nova em `docs/decisoes.md` aprovada pelo
   dono.
7. Relatório ao dono: uma linha por dimensão reprovada com o número de violações, nunca a saída
   bruta.
