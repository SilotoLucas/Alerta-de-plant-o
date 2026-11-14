# Alerta de Plantão

Quando um cliente chama no WhatsApp do celular da empresa, o consultor de plantão é avisado: na tela
do computador e no celular pessoal, mesmo longe do celular da empresa.

```
celular da empresa ──► servidor (VM) ──► celular pessoal
(app lê a notificação)   (repassa o aviso)   (toca o alarme, botão "Vi")
```

O servidor só repassa um aviso curto; ele não acessa o WhatsApp. Como cada peça funciona:
[docs/arquitetura.md](docs/arquitetura.md).

## O que tem aqui

| Pasta | O que é | Estado |
|---|---|---|
| [`apps/windows`](apps/windows/README.md) | Alerta no computador: cartão no topo, brilho nas bordas e som, para quem usa o WhatsApp Desktop | funciona |
| [`apps/android`](apps/android/README.md) | App único: modo Empresa (lê o WhatsApp) e modo Pessoal (recebe o aviso, botão "Vi"), pareado por código | pronto, testado só no emulador |
| [`apps/api`](docs/api.md) | Servidor próprio na VM (pareamento, deduplicação, plantão ligado/desligado, "Vi", entrega por SSE, limpeza de dados antigos) | pronto; instalação na VM em [docs/deploy.md](docs/deploy.md) |
| [`packages/*`](packages) | `domain` (regras puras), `application` (casos de uso), `contracts`, `infra` (Postgres) | pronto |
| [`tools/quality`](tools/quality) | Gate de qualidade (`bun run validate`) | pronto |
| [`deploy`](docs/deploy.md) | Docker (API + Postgres), proxy da borda, deploy automático, geração do APK assinado | pronto, falta instalar na VM |
| [`docs`](docs) | Arquitetura, decisões, plano e histórico | atualizado |

## Começar

```bash
bun install               # instala as ferramentas e os hooks do git
bun run db:up             # Postgres local (container plantao-db, porta 5435)
bun run validate          # gate completo (cerca de 10 s)
cp .env.example .env      # ajuste PLANTAO_ADMIN_TOKEN
bun run dev:api           # API em http://localhost:3350
```

- **Instalar o alerta no Windows:** copie `apps/windows` para o PC e dê dois cliques em `Instalar.cmd`.
- **Compilar o app Android:** [apps/android/README.md](apps/android/README.md).
- **Próximos passos do projeto:** [docs/plano-produto.md](docs/plano-produto.md).

## Para quem desenvolve

Mesma metodologia do Abanou e do Bússola: camadas com regra de importação imposta por ferramenta,
gate rápido e completo, testes `unit` e `e2e`, documentação no próprio repositório. Comece pelo
[AGENTS.md](AGENTS.md).
