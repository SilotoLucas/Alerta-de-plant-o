# Servidor de avisos (ntfy): provisório

> **Provisório.** É o que o app Android usa hoje. Na fase R2 o app passa a falar com a API própria
> (`apps/api`) e esta pasta sai na R4. Veja [`docs/arquitetura.md`](../../docs/arquitetura.md).

Recebe os avisos do app do celular da empresa e entrega ao celular pessoal. É o
[ntfy](https://ntfy.sh) rodando no seu próprio servidor: nada passa por terceiros.

## 1. Subir

```bash
cd deploy/ntfy
cp .env.example .env        # ajuste NTFY_BASE_URL para o endereço https público
docker compose up -d
```

O container escuta só em `127.0.0.1:8089`. Publique com **https** por um proxy reverso.
Exemplo com Caddy:

```
ntfy.seudominio.com.br {
    reverse_proxy 127.0.0.1:8089
}
```

Para o ntfy funcionar bem, o proxy não pode ter limite curto de tempo de resposta (o app mantém uma
conexão aberta). No nginx, use `proxy_read_timeout 3h;`, `proxy_buffering off;` e os cabeçalhos de
upgrade de WebSocket.

## 2. Criar usuário e token

Tudo é negado por padrão (`deny-all`). Crie **um usuário por consultor** e dê acesso só aos tópicos
dele (troque `joao` pelo nome do consultor):

```bash
docker exec -it alerta-ntfy ntfy user add joao                      # pede a senha
docker exec alerta-ntfy ntfy access joao 'plantao-joao' rw          # avisos
docker exec alerta-ntfy ntfy access joao 'plantao-joao-cmd' rw      # comandos (sai / voltei / status)
docker exec alerta-ntfy ntfy token add joao                         # imprime o token tk_...
```

Guarde o token: ele vai no app do celular da empresa. O celular pessoal entra no app ntfy com o
usuário e a senha.

## 3. Celular pessoal

1. Instale o app **ntfy** (Android ou iOS) e, em Configurações, adicione seu servidor como
   servidor padrão, com usuário e senha.
2. Inscreva-se nos tópicos `plantao-joao` e `plantao-joao-cmd`.
3. No tópico `plantao-joao`, abra as configurações da inscrição e ligue **Ignorar não perturbe**
   (assim o aviso urgente toca mesmo no silencioso).

## 4. Comandos remotos

Do celular pessoal, publique no tópico `<tópico>-cmd`:

| Texto | Efeito |
|---|---|
| `sai` | liga os alertas no celular da empresa |
| `voltei` | desliga os alertas |
| `status` | o app responde no tópico de avisos se está ativo e com acesso às notificações |

O app confirma cada comando com um aviso de prioridade normal.

## Backup e manutenção

- Dados (usuários e cache): volume Docker `ntfy-dados`.
- Atualizar: troque a versão da imagem no `docker-compose.yml` e rode `docker compose up -d`.
- Ver o que está acontecendo: `docker logs -f alerta-ntfy`.
