# Deploy: colocar o Alerta de Plantão na VM

O desenho é o do Bússola: o Caddy do Abanou é o proxy único da VM (80/443), a API do Alerta entra pela
rede Docker `borda`, e um timer do systemd puxa a `main` a cada 2 minutos. Decisões em
[decisoes.md](decisoes.md) (D18 a D21); a VM está descrita no guia do Bússola
(`orientacao-deploy-vm.md` naquele repositório).

```
celular da empresa ──https──> Caddy (Abanou) ──borda──> plantao-api ──> Postgres (rede do compose)
celular pessoal    <──SSE───  Caddy                      (sem portas publicadas)
```

## O que já foi provado e o que não

| | Estado |
|---|---|
| Imagem, Postgres 18, migração, API, healthcheck, `codigo.sh` | testado local (compose temporário) |
| Aviso atravessando o Caddy 2.10 com `flush_interval -1` (SSE na hora) | testado local |
| APK de produção abre, esconde o campo de servidor e chama o endereço https | testado no emulador |
| Retenção de 7 dias | e2e contra o Postgres real |
| Instalação na VM, certificado Let's Encrypt, timer do systemd | **não testado: falta rodar na VM** |
| Alarme em celular real, WhatsApp real | **não testado** |

## 1. Pré-requisitos

- O Abanou de pé na VM (ele cria a rede `borda` e o container `abanou-caddy-1`).
- Os commits da R4 na `main` do GitHub: o deploy puxa de lá. Diga "pode subir" e rode o `git push` com o seu
  token (esta máquina não tem credencial).
- Endereço: sem domínio próprio, `plantao.194.5.152.64.sslip.io` (o sslip.io responde com o IP da VM e o
  Caddy consegue certificado de verdade). Com domínio próprio: registro A para `194.5.152.64` e use-o abaixo.

## 2. Instalar (uma vez, na VM, como root)

> Quer que o Claude Code da VM faça isso por você? Diga a ele para clonar o repositório e seguir
> [prompt-vm.md](prompt-vm.md): ele instala, verifica e devolve um relatório.

```bash
git clone https://github.com/SilotoLucas/Alerta-de-plant-o.git /opt/plantao
/opt/plantao/deploy/instalar.sh                      # ou: instalar.sh seu.dominio.com.br
```

O script: cria `deploy/.env` com senha do banco e senha de administrador **aleatórias** (`chmod 600`), sobe
db + migração + API, publica o site no Caddy da borda, instala e liga o timer. No fim ele imprime a
URL de saúde. Confira de qualquer lugar:

```bash
curl https://plantao.194.5.152.64.sslip.io/health      # {"status":"ok"}
```

O primeiro acesso pode demorar alguns segundos: o Caddy pede o certificado na hora.

## 3. Parear os celulares

Na VM, um código por celular (vale 10 minutos, uso único):

```bash
/opt/plantao/deploy/codigo.sh empresa     # para o celular da empresa
/opt/plantao/deploy/codigo.sh pessoal     # um para cada consultor
```

No celular, instale o APK, digite o código e pronto (empresa: libere o acesso às notificações; pessoal: ligue
"De plantão" e libere "Não perturbe" e tela cheia). Para desligar um celular perdido, use a rota
`DELETE /admin/aparelhos/:id` ([api.md](api.md)) com a senha de administrador de `deploy/.env`.

## 4. O APK

No computador de desenvolvimento:

```bash
apps/android/gerar-release.sh https://plantao.194.5.152.64.sslip.io
# saída: apps/android/app/build/outputs/apk/release/alerta-plantao.apk
```

- A **chave de assinatura** é criada na primeira vez em `~/.config/alerta-plantao/` (`chave.jks` e `senha`).
  **Faça backup dos dois**: sem eles não dá para atualizar o app nos celulares já instalados. Nunca vão ao git.
- O endereço vai **dentro** do APK. Mudou o domínio, gere o APK de novo.
- Instalação direta (sem Play Store): o consultor baixa o arquivo e permite "instalar apps desconhecidos"
  para o navegador ou o gerenciador de arquivos.

## 5. Dia a dia

| Preciso de… | Comando (na VM, em `/opt/plantao/deploy`) |
|---|---|
| Ver se está de pé | `docker compose ps` e `curl .../health` |
| Logs da API | `docker compose logs -f api` (sem texto de cliente; a limpeza loga só contagens) |
| Forçar o deploy agora | `./atualizar.sh --forcar` |
| Ver o deploy automático | `systemctl list-timers plantao-deploy.timer` · `journalctl -u plantao-deploy` |
| Texto da mensagem no aviso (D11) | `PLANTAO_ENVIAR_TEXTO=true` em `deploy/.env`, depois `docker compose up -d` |
| Backup do banco | `docker compose exec -T db pg_dump -U plantao plantao > plantao.sql` (guarda só hashes, avisos de até 7 dias e os aparelhos pareados) |

Atualizar o app do servidor é só dar push na `main`: em até 2 minutos o timer reconstrói a imagem e
reinicia. Migrações rodam sozinhas antes da API.

## 6. Limites assumidos

- **Uma instância da API** (o notificador SSE é em memória, D17). Escalar exige FCM ou um canal compartilhado.
- **Reiniciar a API derruba as conexões abertas**; os apps reconectam sozinhos em 1 a 30 s e pedem o que não
  foi visto (`Last-Event-ID`). Um aviso que chegar nesse intervalo é entregue na reconexão.
- **Fabricante que mata o serviço em segundo plano** (Xiaomi, Samsung…): o aviso só chega quando o app
  voltar. Permita início automático e trave o app nos recentes; o FCM (R5) resolve de vez.
- A VM está na Europa e o banco guarda a hora em UTC; o `TZ` dos containers é `America/Sao_Paulo` só para os logs.
