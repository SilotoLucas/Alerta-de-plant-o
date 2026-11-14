---
paths:
  - apps/api/**
---

# apps/api

- `elysia` só em `src/http/**`. `packages/infra` só em `src/composicao/**` (pure DI, sem container).
- `src/main.ts` lê `lerConfiguracao(process.env)` e **recusa subir** com configuração inválida
  (inclusive sem `PLANTAO_ADMIN_TOKEN`).
- Handler sem regra: valida com o schema de `@plantao/contracts`, chama o caso de uso e mapeia o
  `Result` com `responder`/`falha` de `src/http/resposta.ts`.
- Rota que pode devolver erro de domínio **não declara `response:`** (o Elysia passa a restringir os
  códigos de `status()`); rota que só responde 200 declara.
- `src/http/error-map.ts` é `Record<CodigoDeErro, …>` com teste de exaustividade; código novo sem
  entrada não compila.
- Autenticação: macro `autenticado` (Bearer do aparelho, 401) e macro `administrador` (header
  `x-admin-token`, comparação em tempo constante, 401). O que o aparelho não pode ver é **404**.
- `GET /avisos/fluxo` é SSE: `server.timeout(request, 0)`, batimento a cada 20 s, cancelamento do
  stream desfaz a assinatura. Mexeu nele, rode `avisos.e2e.test.ts`.
- Limite de taxa por IP em `src/http/limite.ts`; o pareamento tem limite próprio (5/min) porque o
  código tem só 6 dígitos. Atrás do Caddy, `CONFIAR_NO_PROXY=true`.
- Toda rota aparece literalmente em algum `*.e2e.test.ts` (gate `rota-com-e2e`), contra o servidor
  real e o banco `plantao_teste` (`composicao/ambiente-de-teste.ts`: `subirApiDeTeste`, `parear`,
  `chamar`). Erro inesperado: 500 com corpo opaco, log sem dado pessoal.
