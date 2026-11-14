---
paths:
  - packages/contracts/**
---

# packages/contracts

Schemas TypeBox de request e response, fonte única do formato de rede (o `docs/api.md` descreve o
mesmo contrato em texto, para o app Kotlin). Só depende de `@sinclair/typebox`; nunca `elysia`, nunca
outro pacote `@plantao/*`.

Para cada schema, exporte o valor e o tipo com o mesmo nome:
`export const X = Type.Object(...)` e `export type X = Static<typeof X>`.

Nenhum campo de identidade no request (`aparelhoId`): quem é o aparelho vem do token. Instante sai
como ISO 8601 (`format: 'date-time'`); a **hora da mensagem** que o app manda é inteiro em
milissegundos (é o `postTime` da notificação do Android).
