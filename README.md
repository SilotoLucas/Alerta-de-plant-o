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
| [`apps/android`](apps/android/README.md) | App do celular da empresa (lê o WhatsApp e avisa o celular pessoal) | funciona, fala com um ntfy provisório |
| `apps/api` | Servidor próprio na VM (pareamento, deduplicação, plantão ligado/desligado, entrega) | planejado (R1) |
| [`packages/domain`](packages/domain) | Regras puras do plantão, testadas | pronto |
| [`tools/quality`](tools/quality) | Gate de qualidade (`bun run validate`) | pronto |
| [`deploy/ntfy`](deploy/ntfy/README.md) | Servidor ntfy usado hoje pelo app Android | provisório |
| [`docs`](docs) | Arquitetura, decisões, plano e histórico | atualizado |

## Começar

```bash
bun install               # instala as ferramentas e os hooks do git
bun run validate          # gate completo (menos de 10 s hoje)
```

- **Instalar o alerta no Windows:** copie `apps/windows` para o PC e dê dois cliques em `Instalar.cmd`.
- **Compilar o app Android:** [apps/android/README.md](apps/android/README.md).
- **Próximos passos do projeto:** [docs/plano-produto.md](docs/plano-produto.md).

## Para quem desenvolve

Mesma metodologia do Abanou e do Bússola: camadas com regra de importação imposta por ferramenta,
gate rápido e completo, testes `unit` e `e2e`, documentação no próprio repositório. Comece pelo
[AGENTS.md](AGENTS.md).
