# Alerta de Plantão — app Android (R2)

Um app só, com dois modos escolhidos pelo **código de pareamento** que o administrador gera. Fala com a
API própria ([`docs/api.md`](../../docs/api.md)); não guarda estado de negócio e não monta texto de
aviso (quem decide é o servidor, D10).

```
modo Empresa:  WhatsApp ──notificação──> app ──POST /eventos──> API ──SSE──> app (modo Pessoal) ──alarme──> consultor
                                                                                       └── "Vi" ──POST /avisos/:id/visto
```

## Como funciona

| Peça | Arquivo | O que faz |
|---|---|---|
| Leitura (Empresa) | `WhatsAppListener.kt` | `NotificationListenerService` filtrando `com.whatsapp` e `com.whatsapp.w4b`. Ignora resumo de grupo e notificações fixas. Na primeira conexão manda as notificações já na tela com `silencioso=true` (só para o servidor registrar, ninguém é avisado). |
| Envio (Empresa) | `EntregaWorker.kt`, `Api.kt` | Fila do WorkManager com internet obrigatória; repete a cada 30 s (linear) até 30 vezes. 401 apaga o pareamento (aparelho revogado) e o app volta à tela do código; outros 4xx não repetem. |
| Entrega (Pessoal) | `AvisoService.kt`, `Api.kt` | Serviço em primeiro plano com a conexão SSE (`/avisos/fluxo`), reconexão com espera crescente de 1 s a 30 s e `Last-Event-ID` para não perder aviso. Mostra a notificação com o botão **Vi**. |
| "Vi" | `VistoReceiver.kt`, `EntregaWorker.kt` | Cancela a notificação e avisa o servidor (`POST /avisos/:id/visto`), com repetição se estiver sem rede. |
| Alarme | `Alarme.kt`, `AlarmeActivity.kt`, `Preparo.kt` | Canal `alarme` (importância alta, som de alarme, vibração, pede para furar o "Não perturbe"); notificação de categoria ALARM com `FLAG_INSISTENT` (o som repete até alguém tocar em **Vi**) e desiste sozinha em 10 min; tela cheia por cima do bloqueio. `Preparo` decide quais permissões faltam. |
| Plantão | `MainActivity.kt`, `AlertaTile.kt`, `Acoes.kt` | Interruptor no app e botão nas configurações rápidas; o estado vive no servidor, por aparelho (D14). |
| Religar | `BootReceiver.kt` | Reinicia o `AvisoService` depois de reiniciar o celular ou atualizar o app. |
| Protocolo | `Protocolo.kt` | Corpo e leitura das respostas, limites (últimas 8 mensagens, 200 caracteres cada), `ParserSse`, `Espera`. É o que os testes JVM cobrem. |

Estado no celular: só endereço do servidor, token do aparelho, papel, nome e caches de tela (plantão
ligado, último aviso). O servidor é a fonte da verdade.

**Privacidade:** o aviso leva só o nome da conversa e a quantidade (D11). O texto das mensagens sai do
celular da empresa para o servidor (a deduplicação precisa dele), mas o servidor guarda só o hash e não o
repassa por padrão.

## O alarme e o que o celular pessoal precisa liberar

A tela do modo Pessoal lista só o que falta, cada item com seu botão:

| Item | Por quê | Onde se resolve |
|---|---|---|
| Notificações ligadas | sem elas nada toca | configurações do app |
| Acesso a "Não perturbe" | o canal só fura o modo silencioso com esse acesso | configurações do sistema |
| Tela cheia (Android 14+) | acender a tela bloqueada e abrir o alarme | configurações do app |
| Sem restrição de bateria | o fabricante não pausa a conexão | diálogo do sistema |

**Testar o alarme** dispara um alarme local, sem servidor, com o mesmo canal e a mesma tela cheia. O volume
do alarme é o do sistema (stream de alarme): o app não mexe nele; deixe-o alto.

## Compilar

Precisa de JDK 17, Android SDK 36 e Gradle (o wrapper baixa o 9.3.1).

```bash
cd apps/android
export JAVA_HOME=/caminho/do/jdk17 ANDROID_HOME=$HOME/Android/Sdk
./gradlew testDebugUnitTest assembleDebug     # testes + APK de teste
./gradlew assembleRelease -Pservidor=https://plantao.seudominio.com.br   # APK final (sem assinatura)
```

- APK de teste: `app/build/outputs/apk/debug/app-debug.apk`. Para instalar o final em outros celulares é
  preciso assiná-lo (`apksigner` com uma chave sua; **nunca** commite o `.jks`).
- O endereço do servidor vem de `BuildConfig.SERVIDOR_PADRAO`: no `debug` é `http://10.0.2.2:3350` (a API
  no computador, vista de dentro do emulador); no `release` vem de `-Pservidor=…` (vazio se omitido, e
  então a tela mostra o campo "Avançado: endereço do servidor").

## Testar no emulador

1. `bun run db:up`, copie `.env.example` para `.env` e rode `bun run dev:api` (porta 3350).
2. Crie um AVD temporário (`-port 5556 -wipe-data`, nunca o `Pixel_8`) e instale o APK `debug`.
3. Gere um código: `curl -X POST localhost:3350/admin/pareamentos -H "x-admin-token: $PLANTAO_ADMIN_TOKEN" -H 'content-type: application/json' -d '{"papel":"empresa"}'`
   (use `"pessoal"` para o outro modo) e digite no app.
4. Modo Empresa: libere o acesso às notificações e simule o WhatsApp (o `debug` trata o
   `com.android.shell` como WhatsApp):

```bash
adb shell "cmd notification post -S messaging --conversation 'Grupo Cliente' --message 'Maria:O sistema caiu' t1 x"
```

Um mesmo AVD só tem um pareamento por vez. Para ver os dois lados, use dois AVDs, ou pareie o emulador
como Pessoal e gere o evento da empresa com `curl` (`POST /eventos`).

## Instalar no celular da empresa e nos pessoais

1. Instale o APK e abra o app.
2. Digite o código de 6 dígitos (o nome do celular já vem preenchido).
3. Empresa: toque em **Liberar acesso às notificações** e ative o Alerta de Plantão; depois **Liberar
   restrição de bateria**. Pessoal: ligue o interruptor de plantão.
4. Opcional: arraste o botão **Alerta de Plantão** para as configurações rápidas.

Em alguns aparelhos (Xiaomi, Samsung, Huawei…) é preciso permitir **início automático** e travar o app
na lista de recentes. Veja https://dontkillmyapp.com para o seu modelo.

## Limites conhecidos

- Se o WhatsApp não gera notificação (janela aberta, mensagem lida em outro aparelho, conversa
  silenciada), não há o que avisar. Os grupos do plantão **não** podem ficar silenciados.
- O token fica em texto no armazenamento privado do app (sem criptografia extra).
- **Ainda não foi testado com o WhatsApp de verdade**, só com notificações simuladas e testes
  automáticos. Confirme no celular da empresa, principalmente com grupos e várias mensagens seguidas.
- **Armadilha do simulador:** `cmd notification post` grava hora nova nas mensagens a cada chamada,
  então repetir o mesmo comando parece mensagem nova para o servidor (a hora entra na assinatura). O
  WhatsApp real mantém a hora; a deduplicação está provada nos testes e2e da API.
- A entrega é por conexão aberta (SSE, D8): se o fabricante matar o serviço em segundo plano, o aviso só
  chega quando o app voltar. O FCM (R5) resolve isso.
- **O alarme só foi visto no emulador** (canal, `INSISTENT`, tela cheia, "Vi"). Som real, vibração, "Não
  perturbe" ligado e tela bloqueada com PIN dependem de um celular de verdade: confira antes de confiar.
