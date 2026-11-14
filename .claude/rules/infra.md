---
paths:
  - packages/infra/**
  - tools/db/**
---

# packages/infra

Implementa as portas de `application` com tipos de `domain`. Único lugar com driver de banco
(`src/db/**`) e com hash/aleatório (`src/seguranca`, `src/sistema`). Não importa `contracts` nem apps.

- `src/db/conexao.ts` é o único ponto que abre conexão; repositórios ficam em `src/db/repositorios/`.
- SQL explícito com o driver `postgres`. Instante entra como `new Date(instante)` e sai com
  `.getTime()`. Id vem de UUIDv7 (`Bun.randomUUIDv7`), então ordenar por `id` ordena no tempo: o
  reenvio de avisos (`Last-Event-ID`) usa `id > ultimo`.
- Token de aparelho só existe em claro na resposta do pareamento; o banco guarda o SHA-256.
- Migration: `src/db/migrations/NNNN_nome.sql` (skill `/migration`). Tabela nova entra em
  `TABELAS_DE_MOVIMENTO` de `banco-de-teste.ts`.
- `banco-de-teste.ts` se recusa a apagar banco cujo nome não termina em `_teste`.
- `Notificador` em memória (`src/entrega`) vale para **uma** instância da API. Duas instâncias exigem
  FCM ou um canal compartilhado (D8); não escale horizontalmente antes disso.
- Erro do Postgres não sobe cru: a borda vira 500 opaco.
