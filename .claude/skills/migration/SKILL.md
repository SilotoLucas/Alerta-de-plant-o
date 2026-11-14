---
name: migration
description: Cria uma migration SQL nova em packages/infra/src/db/migrations com numeração sequencial, checks, índices e o banco de teste atualizado. Use quando pedirem tabela, coluna, índice ou mudança de schema.
---

# /migration <nome>

1. Próximo número: maior `NNNN` em `packages/infra/src/db/migrations/` + 1. Arquivo
   `NNNN_<nome_em_snake>.sql` (o `ls-lint` cobra o formato).
2. Nunca edite migration já aplicada em outro ambiente (a VM, depois da R4); crie outra.
3. Convenções (veja `docs/banco-de-dados.md`):
   - `id uuid primary key` (UUIDv7 gerado na aplicação), `timestamptz` para instante.
   - `check` para o que o domínio já garante: defesa em profundidade.
   - Tabela filha de aparelho: `aparelho_id uuid not null references aparelhos (id) on delete cascade`
     (revogar o aparelho apaga tudo dele).
   - Índice parcial para o filtro quente (`where visto_em is null`, `where plantao_ativo`).
   - Texto de mensagem de cliente **não** vira coluna: guarde hash.
4. Tabela nova entra em `TABELAS_DE_MOVIMENTO` de `packages/infra/src/db/banco-de-teste.ts`.
5. `bun run db:migrate` no banco local; ajuste ou escreva o e2e que exercita a tabela.
6. Atualize `docs/banco-de-dados.md` e rode `bun run validate`.
