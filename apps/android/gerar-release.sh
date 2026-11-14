#!/usr/bin/env bash
# Gera o APK final, assinado, apontando para o servidor: ./gerar-release.sh https://plantao.exemplo.com
# A chave fica FORA do repositório (por padrão em ~/.config/alerta-plantao). Perdeu a chave, perdeu a
# possibilidade de atualizar o app nos celulares já instalados: faça backup dela.
set -euo pipefail

SERVIDOR="${1:?uso: ./gerar-release.sh https://endereco-do-servidor}"
cd "$(dirname "${BASH_SOURCE[0]}")"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export JAVA_HOME="${JAVA_HOME:-$HOME/.gradle/jdks/eclipse_adoptium-17-amd64-linux.2}"
export PATH="$JAVA_HOME/bin:$PATH"
CHAVES="${PLANTAO_CHAVES:-$HOME/.config/alerta-plantao}"
FERRAMENTAS="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)"
mkdir -p "$CHAVES"
chmod 700 "$CHAVES"

if [ ! -f "$CHAVES/chave.jks" ]; then
  openssl rand -hex 24 > "$CHAVES/senha"
  chmod 600 "$CHAVES/senha"
  "$JAVA_HOME/bin/keytool" -genkeypair -keystore "$CHAVES/chave.jks" -alias alerta-plantao \
    -keyalg RSA -keysize 4096 -validity 36500 -storepass:file "$CHAVES/senha" \
    -keypass:file "$CHAVES/senha" -dname "CN=Alerta de Plantao" > /dev/null
  chmod 600 "$CHAVES/chave.jks"
  echo "chave criada em $CHAVES (faça backup de chave.jks e senha)"
fi

./gradlew assembleRelease -q -Pservidor="${SERVIDOR%/}"
BRUTO=app/build/outputs/apk/release/app-release-unsigned.apk
SAIDA=app/build/outputs/apk/release/alerta-plantao.apk
"$FERRAMENTAS/zipalign" -f -p 4 "$BRUTO" "$SAIDA.alinhado"
PLANTAO_SENHA="$(cat "$CHAVES/senha")" "$FERRAMENTAS/apksigner" sign --ks "$CHAVES/chave.jks" \
  --ks-key-alias alerta-plantao --ks-pass env:PLANTAO_SENHA --key-pass env:PLANTAO_SENHA \
  --out "$SAIDA" "$SAIDA.alinhado"
rm -f "$SAIDA.alinhado" "$SAIDA.idsig"
"$FERRAMENTAS/apksigner" verify --verbose "$SAIDA" | head -3
echo "APK pronto: $SAIDA (servidor: ${SERVIDOR%/})"
