---
paths:
  - apps/android/**
---

# apps/android

Kotlin, Gradle (wrapper 9.3.1, AGP 8.12.0, Kotlin 2.1.20, compileSdk 36, minSdk 26). Não é parte do
workspace do Bun: o gate de TypeScript (`bun run validate`) não o enxerga. Rode os testes dele com
`cd apps/android && ./gradlew testDebugUnitTest assembleDebug`.

- JDK 17: `JAVA_HOME=$HOME/.gradle/jdks/eclipse_adoptium-17-amd64-linux.2`, `ANDROID_HOME=$HOME/Android/Sdk`.
- O app só lê a notificação do WhatsApp e repassa. Decisão de negócio (o que avisar, o que é novo,
  texto do aviso) é do servidor (`packages/domain`); lógica nova no app só se for impossível fora dele.
- Nada de versão com `+`, `latest` ou intervalo em `build.gradle.kts`.
- O build `debug` aceita `http://` e trata `com.android.shell` como WhatsApp, para teste com
  `adb shell "cmd notification post ..."`. O `release` nunca.
- Emulador: AVD temporário (nunca o `Pixel_8`, que outros projetos usam). Apague ao terminar.
- Token do servidor nunca em log, em `BuildConfig` nem no repositório.
