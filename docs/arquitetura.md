# ARQUITETURA

> Status: **R3 (alarme no celular pessoal) entregue em 2026-11-14**, sobre a R2 (app Android único), a R1
> (API e banco) e a R0 (monorepo e gate). O deploy na VM (R4) está **planejado**, marcado como `[R4]`, e só
> começa com o OK do dono em [plano-produto.md](plano-produto.md). Decisões com motivo em
> [decisoes.md](decisoes.md); o contrato HTTP em [api.md](api.md); as tabelas em
> [banco-de-dados.md](banco-de-dados.md).

---

## A. Como o sistema funciona (a infraestrutura)

O problema: o cliente chama no WhatsApp do **celular da empresa**; o consultor, longe dele, precisa
ser avisado no **celular pessoal**.

### Por que existe um servidor no meio

Dois celulares em rede móvel não conseguem abrir conexão um com o outro: a operadora esconde cada um
atrás de NAT e firewall, e nenhum tem endereço público. Todo app que faz isso (WhatsApp, Telegram,
Pushbullet) tem um servidor no meio. Aqui o servidor é **a VM que você já tem**, e ele só repassa um
aviso curto. **Ele não toca no WhatsApp**: quem lê é o app do celular da empresa, pelas notificações que
o próprio WhatsApp já mostra, sem risco para o número da empresa.

```
 CELULAR DA EMPRESA                      VM (apps/api)                       CELULAR PESSOAL
┌─────────────────────┐   HTTPS    ┌──────────────────────────┐   tempo    ┌────────────────────┐
│ WhatsApp            │            │ 1. confere o aparelho     │   real     │ app (modo Pessoal) │
│   └ notificação     │            │ 2. ignora repetida        │  (SSE) ou  │                    │
│ app (modo Empresa)  │ ─ evento ─►│ 3. plantão ativo?         │  push FCM  │  alerta com som    │
│   lê e repassa      │            │ 4. monta o aviso          │ ─ aviso ─► │  botão "Vi"        │
│                     │            │    (sem o texto, padrão)  │            │                    │
│                     │◄─ ligar /  │ 5. guarda no Postgres     │◄─ "Vi" ────│  liga/desliga      │
│                     │  desligar ─│                           │◄ sai/voltei│                    │
└─────────────────────┘            └──────────────────────────┘            └────────────────────┘
                                          ▲
                              Caddy (https) da borda da VM, como Abanou e Bússola
```

Quem decide o quê:

| Peça | Faz | Não faz |
|---|---|---|
| App no celular da empresa | Lê a notificação do WhatsApp e manda a conversa e as mensagens. Guarda numa fila se estiver sem internet. | Não decide o que é novo, não monta o aviso, não guarda estado de plantão. |
| Servidor (VM) | Autentica o aparelho, remove repetição, decide se avisa, monta o aviso respeitando a privacidade, entrega, registra, guarda "plantão ativo". | Não lê WhatsApp. |
| App no celular pessoal | Recebe o aviso, toca o alarme, confirma "Vi", liga e desliga o plantão. | Não fala com o celular da empresa diretamente. |
| Alerta do Windows | Continua independente: lê o WhatsApp Desktop do PC e avisa na tela. | Não depende do servidor. |

### Como o celular pessoal recebe (decisão D8)

- **v1: conexão aberta (SSE).** O app pessoal mantém uma conexão com a VM por um serviço em primeiro
  plano. Não precisa de conta Google nem de Firebase, e funciona hoje. Limite: alguns fabricantes
  matam o serviço em segundo plano.
- **v2: push do Google (FCM).** O push acorda o celular mesmo parado, é o mais confiável para plantão.
  Exige um projeto Firebase (conta Google). Entra como segundo adaptador da mesma porta `Notificador`
  quando você quiser, sem mudar o resto.

### Como você configura (o que muda no uso)

Antes eram muitas etapas: servidor ntfy, usuário, token, tópico, app ntfy no pessoal e três campos no
app. A R2 trocou isso por **um app só** e um **código de pareamento**:

1. Você abre a página do servidor (ou roda um comando) e ele mostra um código de 6 dígitos.
2. No celular da empresa: instala o app, escolhe "Celular da empresa", digita o código e libera o
   acesso às notificações.
3. No celular pessoal: instala o app, escolhe "Meu celular", digita outro código. Pronto.

Sem URL, sem token, sem tópico. Detalhes e fases em [plano-produto.md](plano-produto.md).

### O que existe hoje e o que está planejado

| Peça | Hoje | Depois |
|---|---|---|
| `packages/domain` | pronto: aviso, comando, assinatura, aparelho, pareamento, evento | — |
| `apps/api` + Postgres | **pronto (R1)**: pareamento, evento, deduplicação, plantão, "Vi", SSE | `[R4]` no ar na VM |
| `apps/android` | **pronto (R2 e R3)**: app único, pareamento, alarme com tela cheia e "Vi"; testado só no emulador | conferência em celular real |
| `deploy/ntfy` | provisório, **o app não usa mais** | `[R4]` sai; entra o deploy da API na borda da VM |
| `apps/windows` | funciona (revisado, nunca executado no Linux) | sem mudança planejada |

---

## B. Visão geral do monorepo

Monorepo Bun com um `.git` na raiz e workspaces `apps/api`, `packages/*`, `tools/*`.
`apps/android` (Gradle) e `apps/windows` (PowerShell) vivem em `apps/` mas **não são workspaces do
Bun**: o gate de TypeScript não os enxerga e cada um tem a própria forma de testar.

| Workspace | Nome | Papel | Estado |
|---|---|---|---|
| `packages/domain` | `@plantao/domain` | Regras puras. Zero npm, zero I/O. | existe |
| `packages/application` | `@plantao/application` | Casos de uso e portas (declaradas pelo consumidor). | existe |
| `packages/contracts` | `@plantao/contracts` | Schemas TypeBox de request/response, fonte única do formato de rede. | existe |
| `packages/infra` | `@plantao/infra` | Adaptadores: Postgres, relógio, segredos, entrega em memória (SSE); FCM `[R5]`. | existe |
| `apps/api` | `@plantao/api` | Composição + borda HTTP (Elysia). | existe |
| `tools/quality` | `@plantao/quality` | `validate` e `validate:quick`, gates próprios, fixtures. | existe |
| `tools/db` | `@plantao/db-tools` | Subir o Postgres local, aplicar migrations. | existe |
| `apps/android` | — | App Kotlin (modos Empresa e Pessoal). | existe |
| `apps/windows` | — | Alerta local no PC (PowerShell + C#). | existe |

Fluxo de dependência (seta = "pode importar"), igual ao do Bússola:

```
                  apps/api (Elysia, composição)
                  │            │             │
                  ▼            ▼             ▼
            packages/infra  packages/contracts  packages/application
                  │                                 │
                  ├────────► packages/application ◄─┘
                  ▼                │
            packages/domain ◄──────┘
```

`apps/android` e `apps/windows` falam com a API **só por HTTP**; não importam nada do monorepo.
O contrato que eles seguem é `packages/contracts` (publicado em `docs/api.md` quando a API existir).

---

## C. Bounded contexts

Os mesmos nomes de pasta em `domain/src/<contexto>` e `application/src/<contexto>`. Cada contexto
expõe só pelo seu `index.ts`.

| Contexto | Conceitos | Estado |
|---|---|---|
| `compartilhado` | `Result`, `Marcado`, `Instante` | existe |
| `plantao` | `Mensagem` e assinatura (deduplicação), `Aviso` e a regra de privacidade, `Comando` | existe |
| `aparelhos` | `Aparelho` (empresa ou pessoal), `Pareamento` com código de 6 dígitos e validade de 10 min | existe |
| `plantao` (estado, avisos) | plantão ligado por aparelho pessoal (D14), `Evento` recebido, aviso e confirmação "Vi" | existe |

Dependências permitidas entre contextos (linha importa coluna):

| importa → | compartilhado | plantao | aparelhos |
|---|---|---|---|
| plantao | sim | — | não |
| aparelhos | sim | não | — |

---

## D. Matriz de importação entre camadas

Imposta por `.dependency-cruiser.cjs`.

| Camada ↓ importa → | domain | application | contracts | infra | apps/api |
|---|---|---|---|---|---|
| `packages/domain` | — | não | não | não | não |
| `packages/application` | sim | — | não | não | não |
| `packages/contracts` | não | não | — | não | não |
| `packages/infra` | sim | sim | não | — | não |
| `apps/api` | sim | sim | sim | só em `src/composicao` | — |

Regras que o gate cobra (resumo; a lista completa está no `.dependency-cruiser.cjs`):
`domain` e `application` sem npm nem runtime; Elysia só em `apps/api/src/http`; driver de banco só em
`packages/infra/src/db`; `packages/*` nunca importa `apps/*`; sem ciclo; sem módulo órfão; teste
`*.unit.test.ts` sem I/O. As regras de front (`apps/web`, `apps/mobile`, `design-tokens`) vieram do
Bússola e ficam inativas: não há app TypeScript de interface neste projeto.

---

## E. Catálogo de portas

Só nascem quando pagam uma conta (segundo implementador, teste sem I/O ou fronteira declarada aqui).

| Porta | Contexto | Adaptador inicial | Alternativa prevista |
|---|---|---|---|
| `RepositorioDeAparelhos`, `RepositorioDePareamentos` | aparelhos | Postgres | — |
| `Segredos` (código de 6 dígitos, token, hash) | aparelhos | `crypto` seguro em `infra/seguranca` | — |
| `RegistroDeMensagens` (devolve só as novas; guarda hash) | plantao | Postgres, chave `(aparelho, assinatura)` | — |
| `RepositorioDeAvisos`, `RepositorioDoPlantao` | plantao | Postgres | — |
| `Notificador` (entrega o aviso ao aparelho pessoal) | plantao | em memória, alimenta o SSE | **FCM** (D8) |
| `Relogio`, `GeradorDeId` | compartilhado | relógio do sistema, UUIDv7 | relógio parado e ids sequenciais nos testes |

---

## F. Árvore de pastas

```
Alerta-de-plantao/
├── AGENTS.md  CLAUDE.md  README.md  .env.example
├── package.json  bunfig.toml  tsconfig.base.json  tsconfig.json
├── biome.json  .dependency-cruiser.cjs  .ls-lint.yml  .jscpd.json  knip.json
├── .gitleaks.toml  lefthook.yml  .dockerignore  .bun-version
├── .claude/
│   ├── rules/          domain, application, contracts, infra, api, quality, android, windows
│   ├── skills/         gate/  new-usecase/  migration/
│   └── hooks.proposto.json   NÃO instalado
├── docs/
│   ├── arquitetura.md  decisoes.md  plano-produto.md  api.md  banco-de-dados.md
│   └── historico-fases-1-e-2.md   contexto das fases 1 e 2 (Windows e primeira versão Android)
├── packages/
│   ├── domain/src/       compartilhado/  aparelhos/  plantao/
│   ├── application/src/  compartilhado/  aparelhos/  plantao/   (casos-de-uso/, portas.ts, fakes.ts)
│   ├── contracts/src/    comum/  saude/  aparelhos/  plantao/
│   └── infra/src/        db/ (conexao, migracoes, migrations/, repositorios/)  seguranca/  sistema/  entrega/
├── tools/
│   ├── quality/        gates + fixtures
│   └── db/             db:up, db:down, db:migrate, infra:verificar
├── apps/
│   ├── api/src/        main.ts  http/ (app, rotas/, admin, aparelho, limite, error-map)  composicao/
│   ├── android/        app Kotlin (Gradle, fora do Bun)
│   └── windows/        alerta do PC (PowerShell)
└── deploy/
    └── ntfy/           provisório, sai em R4
```

---

## G. Versões fixas

Sem `^`, `~` nem `latest`. O gate `versao-fixa` cobra nos `package.json`.

| Item | Versão | Motivo |
|---|---|---|
| Bun | 1.4.0 | mesmo do Abanou e do Bússola |
| TypeScript | 6.0.3 | dependency-cruiser e knip leem pela API JS do compilador (Bússola D2) |
| Biome | 2.5.15 | formatador e lint único |
| dependency-cruiser | 18.5.0 | fronteiras de camada |
| knip | 6.41.0 | código morto |
| jscpd | 5.4.1 | duplicação |
| ls-lint | 2.3.1 | nome de arquivo |
| lefthook | 2.2.1 | hooks de git |
| Android Gradle Plugin | 8.12.0 | já usado pelo Abanou e pelo Bússola nesta máquina |
| Kotlin | 2.1.20 | compatível com o AGP 8.12 |
| Gradle (wrapper) | 9.3.1 | o mesmo dos outros projetos |
| WorkManager | 2.10.3 | fila de entrega com tentativa |
| Material Components | 1.12.0 | UI do app |

Portas locais, para rodar junto do Abanou (3333, 5433) e do Bússola (3340, 5434): **API 3350**,
**Postgres 5435**, container `plantao-db`.

---

## H. Estratégia de testes

- `*.unit.test.ts`: zero I/O, fakes em memória. `*.e2e.test.ts`: infra real. Só esses dois sufixos.
- Todo caso de uso tem teste unitário irmão; toda rota aparece em algum e2e; `domain` com 100% de linha.
- `apps/android`: testes JVM (`testDebugUnitTest`) para o que for lógica, e teste manual com o
  emulador usando `cmd notification post` (o build `debug` aceita `com.android.shell`).
- `apps/windows`: só dá para testar no Windows (`-AutoTeste` e "Simular várias conversas" na bandeja).
