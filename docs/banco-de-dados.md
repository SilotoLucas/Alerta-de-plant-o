# Banco de dados

Postgres 18 no container `plantao-db` (porta 5435, bancos `plantao` e `plantao_teste`). `bun run db:up`
sobe e cria os dois bancos; `bun run db:migrate` aplica `packages/infra/src/db/migrations/*.sql` em
ordem, cada uma numa transação, registrando o nome em `migracoes`.

| Tabela | Para quê | Chave |
|---|---|---|
| `aparelhos` | celular pareado: papel (`empresa` ou `pessoal`), nome, **hash** do token, plantão ligado e quando mudou | `id` (UUIDv7); `token_hash` único |
| `pareamentos` | código de 6 dígitos ainda não usado, com o papel que o aparelho terá e a validade (10 min) | `codigo` |
| `mensagens_vistas` | deduplicação: hash SHA-256 de `conversa + hora + remetente + texto`, por aparelho da empresa | `(aparelho_id, assinatura)` |
| `avisos` | aviso gerado para um aparelho pessoal (título, texto, quando foi visto) | `id` (UUIDv7, ordena no tempo) |

Regras que o schema garante (além do domínio):

- Só aparelho `pessoal` pode ter plantão ligado (`check`).
- Código de pareamento tem exatamente 6 dígitos; o `on conflict` só reaproveita código **vencido**.
- Revogar um aparelho (`delete from aparelhos`) apaga em cascata suas mensagens vistas e seus avisos.
- O texto da mensagem do cliente **não é guardado**: só o hash em `mensagens_vistas`. O `avisos.texto`
  só tem o texto quando `PLANTAO_ENVIAR_TEXTO=true` (D11).

**Retenção:** `mensagens_vistas` e `avisos` crescem sem limpeza por enquanto. Falta uma rotina que apague
com mais de 7 dias; entra na R4, junto do deploy.
