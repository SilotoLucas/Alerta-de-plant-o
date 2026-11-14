---
paths:
  - packages/domain/**
---

# packages/domain

Lógica pura. Nenhum import de npm, de `node:*` nem de `bun`; nenhum outro pacote `@plantao/*`.
Proibidos por lint: `Date`, `fetch`, `process`, `crypto`, `setTimeout`, `setInterval`,
`localStorage`, `Bun`; `Math.random` reprova no gate `pureza`. Tempo entra como `Instante` (epoch
ms) passado pelo chamador.

Falha é dado: devolva `err('codigo-do-erro')` com `Result`. `throw` reprova no gate `pureza`.

Um contexto só importa outro pelo `index.ts` e só na direção da matriz em `docs/arquitetura.md` §B.
`compartilhado` é importável por todos.

O que o servidor decide mora aqui, puro e testado: montar o aviso respeitando a privacidade,
interpretar comando, assinatura de mensagem para deduplicar. O app Android e o alerta do Windows
não importam TypeScript; eles só repassam o que leem e mostram o que o servidor mandar.

Todo arquivo com código executável tem `*.unit.test.ts` irmão: o gate exige 100% de linha e reprova
arquivo que nenhum teste carrega.
