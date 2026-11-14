---
paths:
  - apps/android/**
---

# apps/android

Kotlin, Gradle (wrapper 9.3.1, AGP 8.12.0, Kotlin 2.1.20, compileSdk 36, minSdk 26). Não é parte do
workspace do Bun: o gate de TypeScript (`bun run validate`) não o enxerga. Rode os testes dele com
`cd apps/android && ./gradlew testDebugUnitTest assembleDebug`.

- JDK 17: `JAVA_HOME=$HOME/.gradle/jdks/eclipse_adoptium-17-amd64-linux.2`, `ANDROID_HOME=$HOME/Android/Sdk`.
- O app só lê a notificação do WhatsApp e repassa (modo Empresa) ou recebe o aviso e mostra (modo
  Pessoal). Decisão de negócio (o que avisar, o que é novo, texto do aviso) é do servidor
  (`packages/domain`); lógica nova no app só se for impossível fora dele. Sem estado local além do
  pareamento e de caches de tela.
- Fala com a API só por HTTP/SSE (`Api.kt`); contrato em `docs/api.md`. Mudou o contrato, mude
  `Protocolo.kt` e o `LogicaTest.kt`. Um 401 apaga o pareamento (aparelho revogado).
- Nada de versão com `+`, `latest` ou intervalo em `build.gradle.kts`.
- O build `debug` aceita `http://` e trata `com.android.shell` como WhatsApp, para teste com
  `adb shell "cmd notification post ..."`. O `release` nunca.
- Alarme: som, vibração e bypass de "Não perturbe" vivem no canal (`Alarme`), que não muda depois de
  criado: configuração nova = id de canal novo. `Preparo` é a lógica pura (testada na JVM); o resto de
  `Alarme` só se prova no emulador ou no celular.
- Emulador: AVD temporário (nunca o `Pixel_8`, que outros projetos usam). Apague ao terminar.
- Token do aparelho nunca em log, em `BuildConfig` nem no repositório. `BuildConfig.SERVIDOR_PADRAO` é só
  o endereço (debug `http://10.0.2.2:3350`; release vem de `-Pservidor=`).
- `cmd notification post` regrava a hora das mensagens a cada chamada: repetir o comando parece mensagem
  nova ao servidor. Não é bug do app.
