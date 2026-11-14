# Alerta de Plantão — app Android (Fase 2)

Instalado no **celular da empresa**. Lê as notificações do WhatsApp (normal e Business) e manda um
aviso urgente, pelo seu servidor [ntfy](../../deploy/ntfy/README.md) (provisório: na R2 ele passa a falar com a API própria, veja [`docs/arquitetura.md`](../../docs/arquitetura.md)), para o **celular pessoal**.

```
WhatsApp (celular da empresa) ──notificação──> este app ──HTTPS──> ntfy (seu servidor) ──push──> celular pessoal
                                                  ▲                                                   │
                                                  └────── comandos "sai" / "voltei" / "status" ───────┘
```

## Como funciona

| Peça | Arquivo | O que faz |
|---|---|---|
| Leitura | `WhatsAppListener.kt` | `NotificationListenerService` filtrando `com.whatsapp` e `com.whatsapp.w4b`. Ignora o resumo de grupo e notificações fixas. |
| Mensagens novas | `Mensagem.kt` (`Deduplicador`) | Decide o que é novo por **hora + remetente + texto**, por conversa (o WhatsApp reaproveita a mesma notificação). O estado é gravado, então reiniciar o serviço não reenvia nada. |
| Envio | `EnviarWorker.kt`, `Ntfy.kt` | Fila do WorkManager com internet obrigatória. Se falhar, tenta de novo a cada 30 s (crescendo) até 30 vezes. Erro 4xx (token/permissão) não é repetido. |
| Comandos remotos | `ComandoService.kt`, `Aviso.kt` (`Comandos`) | Serviço em primeiro plano ouvindo `<tópico>-cmd`. `sai` liga, `voltei` desliga, `status` responde. |
| Liga/desliga | `MainActivity.kt`, `AlertaTile.kt` | Interruptor no app e botão nas configurações rápidas. Desligado, o app continua lendo (para não reavisar tudo ao ligar), mas não envia. |
| Religar | `BootReceiver.kt` | Reinicia a escuta de comandos depois de reiniciar o celular ou atualizar o app. |

**Privacidade:** por padrão o aviso mostra só o nome do grupo/contato e a quantidade de mensagens
novas. O texto (que é de cliente) só vai se você ligar "Enviar o texto das mensagens".

## Compilar

Precisa de JDK 17, Android SDK 36 e Gradle (o wrapper baixa o 9.3.1).

```bash
cd apps/android
export JAVA_HOME=/caminho/do/jdk17 ANDROID_HOME=$HOME/Android/Sdk
./gradlew testDebugUnitTest assembleDebug     # testes + APK de teste
./gradlew assembleRelease                     # APK final (sem assinatura)
```

APK de teste: `app/build/outputs/apk/debug/app-debug.apk`. Para instalar o APK final em outros
celulares é preciso assiná-lo (`apksigner` com uma chave sua; **nunca** commite o `.jks`).

A versão de teste (`debug`) aceita `http://` (para um ntfy local) e também trata notificações do
`com.android.shell` como se fossem do WhatsApp, para testar sem o WhatsApp:

```bash
adb shell "cmd notification post -S messaging --conversation 'Grupo Cliente' --message 'Maria:O sistema caiu' t1 x"
```

## Instalar no celular da empresa

1. Instale o APK e abra o app.
2. Preencha **endereço** (`https://ntfy.seudominio.com.br`), **tópico** (`plantao-joao`) e **token**
   (veja `../../deploy/ntfy/README.md`). Toque em **Enviar teste**: o aviso deve chegar ao celular pessoal.
3. Toque em **Liberar acesso às notificações** e ative o Alerta de Plantão.
4. Toque em **Liberar restrição de bateria** (sem isso alguns fabricantes pausam o app).
5. Opcional: arraste o botão **Alerta de Plantão** para as configurações rápidas.

Em alguns aparelhos (Xiaomi, Samsung, Huawei…) é preciso também permitir **início automático** e
travar o app na lista de recentes. Veja https://dontkillmyapp.com para o seu modelo.

## Limites conhecidos

- Se o WhatsApp não gera notificação (janela aberta, mensagem lida em outro aparelho, conversa
  silenciada), não há o que avisar. Os grupos do plantão **não** podem ficar silenciados.
- O token fica em texto no armazenamento privado do app (sem criptografia extra).
- **Ainda não foi testado com o WhatsApp de verdade**, só com notificações simuladas
  (`cmd notification post`) e testes automáticos. Confirme no celular da empresa, principalmente
  com grupos e com várias mensagens seguidas. O app lê o histórico do `MessagingStyle`; se o
  WhatsApp mandar só o texto da última mensagem, mensagens que chegarem juntas contam como uma.
