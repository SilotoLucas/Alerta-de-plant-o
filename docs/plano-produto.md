# Plano de produto

Alerta de Plantão: o cliente chama no WhatsApp do celular da empresa e o consultor, longe dele, é
avisado no celular pessoal. Outros consultores da equipe vão usar, então precisa ser fácil de
instalar. Como funciona por dentro: [arquitetura.md](arquitetura.md) §A.

## Quem usa

- **Consultor de plantão:** quer ser avisado sem ficar olhando o celular da empresa, e poder ligar e
  desligar o serviço quando sai e quando volta.
- **Dono (você):** instala e mantém a VM; passa o código de pareamento para cada consultor.

## O fluxo ideal (meta de simplicidade)

1. O dono pede um código de pareamento ao servidor.
2. No celular da empresa: instalar o app, escolher **Celular da empresa**, digitar o código, liberar o
   acesso às notificações. Fim.
3. No celular pessoal: instalar o mesmo app, escolher **Meu celular**, digitar o código. Fim.
4. Chegou mensagem no WhatsApp da empresa: o celular pessoal toca e mostra o nome do grupo ou contato.
   Toca em **Vi** para confirmar.
5. Saindo do plantão: **sai**; voltando: **voltei** (botão no app ou comando). O estado fica no
   servidor, então os dois celulares mostram o mesmo.

Três toques e um código por celular, sem URL, token, tópico nem segundo app.

## O que cada fase entrega

| Fase | Entrega | Pronto quando | Estado |
|---|---|---|---|
| **R0** | Estrutura no padrão do Bússola/Abanou: monorepo, gate verde, docs, `packages/domain`, apps reorganizados | `bun run validate` verde; apps antigos seguem funcionando | **entregue** |
| **R1** | `apps/api` (Elysia) + Postgres + `application`/`infra`/`contracts`: pareamento, receber evento, deduplicar, plantão ligado/desligado, "Vi", entrega por SSE | testes unit e e2e verdes; rotas todas em e2e; testado com `curl` | **entregue** ([api.md](api.md)) |
| **R2** | `apps/android` simplificado: um app, dois modos, pareamento por código, fala com a API, sem estado local | testado no emulador com notificação simulada, ida e volta completa | **entregue** (app em [`apps/android`](../apps/android/README.md)) |
| **R3** | Acabamento do alerta no celular pessoal: som alto, fura o modo silencioso, botão "Vi", tela cheia opcional | conferido em celular real | planejada |
| **R4** | Deploy da API na borda da VM (Caddy, timer de deploy, `.env`), `deploy/ntfy` removido, APK assinado, guia para os consultores | funcionando na VM com https, com WhatsApp real | planejada |
| **R5 (opcional)** | FCM como segundo adaptador de entrega | alerta chega com o celular pessoal parado por horas | opcional |

Cada fase fecha com `bun run validate` verde, um relatório de uma linha por dimensão e o plano da
próxima; só avanço com o seu OK ao fim de cada uma.

## O que eu preciso de você

- **Resolvido:** D7 a D10 aprovadas; o celular pessoal é Android.
- **R3:** conferir o alarme num celular pessoal real (som, modo silencioso, tela bloqueada).
- **R4:** rodar na VM os comandos que eu passar (acesso SSH é seu); informar o domínio ou subdomínio.
- **Teste real:** um celular com o WhatsApp da empresa para conferir grupos e várias mensagens
  seguidas. É o que falta validar desde a Fase 2.

## Fora do escopo

Responder mensagem pelo app, ler o conteúdo além do que a notificação mostra, usar WhatsApp Web não
oficial (risco de banimento do número da empresa), iOS no celular da empresa (o iOS não deixa
um app ler notificação de outro). **iPhone como celular pessoal:** o app é Android (o seu é), então o
modo Pessoal não roda em iPhone. Se um consultor tiver iPhone, a saída é uma entrega por push (R5) para
um app de iOS, como segundo adaptador do `Notificador`; decidimos quando alguém precisar.
