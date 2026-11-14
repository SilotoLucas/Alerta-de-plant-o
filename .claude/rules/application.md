---
paths:
  - packages/application/**
---

# packages/application

Casos de uso e portas. Só importa `@plantao/domain`. Mesmas proibições de global do domínio: relógio
entra pela porta `Relogio`, id pela `GeradorDeId`; nada de `fetch`, `Date`, `process`, `crypto`.

## Portas

- Moram em `src/<contexto>/portas.ts`, escritas pelo contexto que **consome**.
- Só `interface`/`type` e `import type`. Valor no arquivo reprova em `porta-so-tipo`.
- Membro é propriedade de função `readonly inserir: (x: X) => Promise<void>`, nunca método.
- Uma porta por agregado ou leitura, só com o que algum caso de uso chama. Nada de `Repository<T>`.
- Nasce só se pagar uma conta: segundo implementador real, teste sem I/O que depende dela, ou
  fronteira declarada em `docs/arquitetura.md` §E. `Notificador` é a fronteira SSE → FCM (D8).

## Casos de uso

- `src/<contexto>/casos-de-uso/<acao>/<acao>.use-case.ts` + `<acao>.unit.test.ts` irmão (o gate
  `caso-de-uso-com-teste` cobra), com os fakes de `src/<contexto>/fakes.ts`.
- Assinatura `(deps) => (aparelho, entrada) => Promise<Result<Saida, Erro>>`. O `Aparelho` autenticado
  entra como primeiro argumento; quem confere o papel (`empresa` ou `pessoal`) é o caso de uso, com
  `papel-incorreto` (a borda traduz para 404).
- Não conhece `contracts`: o formato de rede é traduzido na borda HTTP.
- Texto de mensagem de cliente nunca vai para uma porta de persistência: o registro de mensagens
  vistas recebe a mensagem e guarda só o hash (a infra faz o hash).
