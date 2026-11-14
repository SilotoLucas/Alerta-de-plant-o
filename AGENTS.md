# Alerta de Plantão

Avisa o consultor de plantão quando chega mensagem no WhatsApp do celular da empresa: no PC (alerta
local no Windows) e no celular pessoal (app Android + servidor na VM). Monorepo Bun com
`packages/domain` (regras puras) e `tools/quality` (gate); `apps/android` (Kotlin) e `apps/windows`
(PowerShell) vivem em `apps/` mas fora dos workspaces do Bun.

Leia antes de mexer na topologia: [docs/arquitetura.md](docs/arquitetura.md) (como funciona a
infraestrutura, pastas, matriz de importação, portas), [docs/decisoes.md](docs/decisoes.md) (D1–D13,
não reabra sem motivo novo), [docs/plano-produto.md](docs/plano-produto.md) (fluxo, fases R0–R5) e
[docs/historico-fases-1-e-2.md](docs/historico-fases-1-e-2.md) (lições das duas primeiras fases).

Estado: **R0 pronta** (estrutura, gate verde, `packages/domain` com aviso, comando e assinatura de
mensagem). O app Android e o alerta do Windows já funcionam como antes; o Android ainda fala com um
ntfy provisório. **Próxima: R1** (`apps/api` + Postgres), que **só começa depois do OK do dono** nas
decisões D7–D10 e de saber se o celular pessoal é Android ou iPhone. Decisões marcadas como
*Proposta* em `docs/decisoes.md` não estão aprovadas.

## Comandos

| Comando | Para quê |
|---|---|
| `bun install` | instala e sincroniza os hooks do git (lefthook) |
| `bun run validate:quick` | gate rápido (<10s): rode a cada iteração |
| `bun run validate` | gate completo (<90s): verde antes de propor commit |
| `bun tools/quality/src/validate.ts --mode full --only fronteira,estilo` | só as fases citadas |
| `bun run test` | todos os testes |
| `bun run format` | formata com Biome |
| `cd apps/android && ./gradlew testDebugUnitTest assembleDebug` | testes e APK do app (veja `.claude/rules/android.md` para o `JAVA_HOME`) |

Só `bun`. Nunca `npm`, `yarn`, `pnpm` nem `npx`. O gate de TypeScript **não cobre** `apps/android` nem
`apps/windows`: mexeu neles, rode o teste próprio (Android) ou avise o dono que não deu para testar
(Windows).

## Saída do gate

Uma violação por linha: `caminho:linha:coluna: error ferramenta(regra): fato fix: ação`.
Exit `0` limpo, `1` código errado (conserte o código), `2` ferramenta quebrada (conserte a
ferramenta ou o ambiente, **não** o código). Se `tipos` falha, nada depois roda: resolva o tipo
primeiro. Resultado agregado em `.reports/validate.json`.

Relatório ao dono: uma linha por dimensão reprovada com o número de violações. Nunca cole a saída
bruta inteira.

## Camadas

```
domain  ←  application  ←  infra  ←  apps/api (composição + http)        [application, infra e api nascem na R1]
```

- `packages/domain`: zero npm, zero runtime. Sem `Date`, `fetch`, `process`, `crypto`, timers,
  `Bun`. Tempo entra como `Instante`. `Result`, nunca `throw`.
- `packages/application`: casos de uso e portas. Só importa `domain`. Portas declaradas pelo
  consumidor, só `type`/`interface` com propriedade de função `readonly`.
- `packages/contracts`: TypeBox e nada mais.
- `packages/infra`: único lugar com driver de banco e demais bibliotecas "sujas".
- `apps/api`: Elysia só em `src/http`; `packages/infra` só em `src/composicao`.
- `apps/android` e `apps/windows` falam com a API só por HTTP e **não importam nada** do monorepo.
  Quem decide o que avisar é o servidor; o app lê e repassa.
- Bounded contexts (`compartilhado`, `plantao`, `aparelhos`) se importam só pelo `index.ts`,
  conforme a matriz em `docs/arquitetura.md` §C.

Tudo isso é imposto por `.dependency-cruiser.cjs`, `biome.json` e `tools/quality`. Se a regra
atrapalha, a conversa é com o dono e vira entrada em `docs/decisoes.md`, não exceção silenciosa.

## Ordem de criação de uma feature (a partir da R1)

Do mais barato para o mais caro de testar. Até o passo 5 nada depende de banco nem de framework.

1. `packages/contracts/src/<contexto>/`: o contrato.
2. `packages/domain/src/<contexto>/`: regra, invariantes, erros + `*.unit.test.ts` irmão.
3. `packages/application/src/<contexto>/portas.ts`: a porta, escrita pelo consumidor.
4. `packages/application/src/<contexto>/casos-de-uso/<acao>/<acao>.use-case.ts`.
5. `<acao>.unit.test.ts` irmão: fakes em memória; caminho feliz e cada erro.
6. `packages/infra/src/db/migrations/NNNN_nome.sql`.
7. `packages/infra/src/db/repositorios/<contexto>.repository.ts`.
8. `apps/api/src/http/rotas/<contexto>.ts` + `*.e2e.test.ts` contra servidor e banco reais.
9. `apps/api/src/composicao/`: uma linha ligando adaptador e caso de uso.
10. `apps/android`: a tela ou o cliente HTTP que usa a rota.

## Regra de abstração

Uma porta só nasce quando paga uma de três contas: existe ou existirá um segundo implementador
real, um teste unitário sem I/O depende dela, ou a fronteira já está declarada em
`docs/arquitetura.md` §E. Fora disso, chame a função concreta. Nada de `Repository<T>` genérico.

## Conteúdo e segurança

- **O texto das mensagens é de cliente.** Por padrão o aviso leva só o nome da conversa e a
  quantidade (`montarAviso`, D11). Texto em log, em `docs/` ou em fixture: nunca, só dado inventado.
- Token de aparelho e segredo só em variável de ambiente ou no armazenamento privado do app; nunca em
  log, em `BuildConfig`, em URL nem no repositório.
- Recurso que o aparelho não pode ver: **404**, nunca 403.
- Erro de banco nunca chega cru ao cliente: 500 opaco, log redigido.

## Testes

- Só dois sufixos: `*.unit.test.ts` (zero I/O, fakes em memória) e `*.e2e.test.ts` (infra real).
- Todo caso de uso tem teste unitário irmão (o gate cobra). Toda rota aparece em algum e2e (o gate
  cobra). Domínio: 100% de linha (o gate cobra).
- Nome do teste descreve o cenário inteiro, com o porquê quando não é óbvio.
- Toda regra nova de gate nasce com fixture em `tools/quality/fixtures/<fase>/` e um
  `<fase>.e2e.test.ts` que prova que ela acha exatamente a violação plantada.

## Nunca

- Nunca `--no-verify`, nunca pular hook.
- Nunca remover asserção para o teste passar; nunca `.skip`, `.only`, `.todo` (o gate cobra).
- Nunca comentário em código sem entrada em `tools/quality/comentarios-permitidos.json`.
- Nunca `^`, `~`, `*` ou `latest` em versão (o gate cobra). Versão compartilhada vai no `catalog`.
- Nunca `git add -A` ou `git add .`: stage arquivo a arquivo.
- Nunca propor commit com `bun run validate` vermelho.
- Nunca `throw` em `domain` ou `application`.
- Nunca captura de tela no programa do Windows (o Defender o marca como trojan).
- Nunca afirmar que o alerta do Windows ou o app com WhatsApp real funcionam sem ter testado: diga
  que não deu para testar.
- Nunca instalar hook do Claude Code (`.claude/settings.json`): eles ficam em
  `.claude/hooks.proposto.json` até o dono decidir.
- Nunca push sem o dono pedir ("pode subir"). Esta máquina também não tem credencial do GitHub.

## Armadilhas que já custaram tempo aqui

As de Bun, Biome, jscpd e knip valem como no Bússola (`~/Documentos/Projetos/bussola/AGENTS.md`) e no
Abanou. As deste projeto:

1. **O WhatsApp reaproveita a mesma notificação (mesmo Id) quando chega outra mensagem na mesma
   conversa.** Decidir "novo" por Id perde mensagem (bug real na Fase 1). Use hora + remetente + texto
   (`assinaturaDaMensagem`).
2. **Sem notificação do WhatsApp não há o que avisar:** janela em foco, mensagem já lida em outro
   aparelho, conversa silenciada, notificações desligadas. Não é bug do app.
3. **O Defender marcou como `Trojan:BAT/ScreenShoter` um autoteste que tirava print da tela.** Ler
   notificações mais captura de tela parece spyware.
4. **`adb shell "..."` junta os argumentos.** Nome com espaço e `|` dentro de `grep -E "a|b"` precisam
   estar em UMA string entre aspas; sem isso o título sai cortado ("Grupo") ou o `grep` vira um pipe e
   trava esperando stdin.
5. **A imagem do ntfy não cria `/var/lib/ntfy`.** Sem volume nesse caminho, `auth-file` falha ao
   subir. O `docker-compose.yml` já monta o volume.
6. **Emulador:** AVD temporário (`-port 5556 -wipe-data`), nunca o `Pixel_8`; apague ao terminar. Para
   simular o WhatsApp use `cmd notification post -S messaging ...` com o build `debug`.
7. **Android 15 (targetSdk 35) desenha de borda a borda:** aplique as margens do sistema na tela ou o
   título fica embaixo da barra de status.
8. **`BOOT_COMPLETED` só inicia serviço em primeiro plano do tipo `specialUse`** (não `dataSync`) no
   Android 15; o `ComandoService` declara `specialUse` com a justificativa no manifest.
9. **O build `debug` aceita `http://` e `com.android.shell`.** Só para teste; o `release` não.
10. **`pkill -f` e `pgrep -f` com um padrão que aparece na própria linha de comando casam com o shell
    que roda o comando e o matam** (exit 144). Mate processo pelo PID, obtido em uma chamada separada.
11. **`AlertaPlantao.ps1` é UTF-8 com BOM.** Confira com `file` depois de editar. `Banner.cs` é C# 5
    (sem `$""`, sem `?.`).
12. **`bun install` roda `lefthook install`:** `pre-push` roda o gate completo e `commit-msg` exige
    `tipo: descrição`.
13. **A identidade do git está configurada só neste repositório** (Lucas Siloto). Não há `gh` nem token:
    o push é feito pelo dono.
