---
paths:
  - tools/quality/**
  - .dependency-cruiser.cjs
  - biome.json
  - .ls-lint.yml
  - .jscpd.json
  - knip.json
  - .gitleaks.toml
---

# Gates

- Cada fase é um `Fase` em `tools/quality/src/fases/<nome>.ts` e entra em `fases/index.ts` no grupo
  certo. `tipos` é barreira.
- Toda violação usa `Violacao` com `fato` e `correcao` imperativa. Ferramenta que falha sem
  violação reconhecível vira `FerramentaQuebrada` (exit 2), nunca lista vazia.
- **Toda regra nova nasce com fixture** em `tools/quality/fixtures/<fase>/` (com caso que viola e
  caso permitido) e um `fases/<fase>.e2e.test.ts` que afirma a lista exata de achados. Sem isso,
  "nenhuma violação" é indistinguível de "o glob está errado".
- Regra nova no `.dependency-cruiser.cjs`: `comment` com o motivo e o destino correto (vira o
  `fix:`), mais um arquivo em `fixtures/fronteira/` e uma linha esperada no teste.
- Fixture que importa pacote npm usa módulo falso em `fixtures/<fase>/modulos-falsos/`.
- O tempo conta: `validate:quick` < 10s, `validate` < 90s.
