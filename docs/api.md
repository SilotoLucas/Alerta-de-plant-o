# API (contrato para os apps)

Fonte do formato: `packages/contracts`. Os apps Android e Windows não importam o monorepo, então este
arquivo é o que eles seguem. Tudo é JSON em UTF-8; instante sai em ISO 8601; a **hora da mensagem** que o
app manda é inteiro em milissegundos desde a época (o `postTime` da notificação).

Erro tem sempre o mesmo corpo: `{"erro":{"codigo":"…","mensagem":"…"}}`.

## Autenticação

| Quem | Como | Falha |
|---|---|---|
| Aparelho pareado | `Authorization: Bearer <token>` (o token vem do pareamento) | 401 `aparelho-invalido` |
| Administrador (você) | header `x-admin-token: <PLANTAO_ADMIN_TOKEN>` | 401 `admin-invalido` |

Papel errado para a rota (ex.: celular pessoal mandando evento) é **404** `papel-incorreto`; aviso de
outro aparelho é **404** `aviso-nao-encontrado`. Nunca 403.

## Rotas

| Método e caminho | Quem | Corpo → resposta |
|---|---|---|
| `GET /health` | ninguém | → `{"status":"ok"}` |
| `POST /admin/pareamentos` | admin | `{"papel":"empresa"\|"pessoal"}` → 201 `{"codigo":"123456","papel","expiraEm"}` |
| `POST /pareamentos/concluir` | ninguém (limite de 5 por minuto por IP) | `{"codigo","nome"}` → 201 `{"aparelho":{id,papel,nome,criadoEm},"token"}`. O token só aparece aqui, **guarde**. Erros: 422 `codigo-invalido` (inexistente, usado ou vencido), 422 `nome-invalido`, 429 |
| `GET /aparelhos/eu` | aparelho | → `{id,papel,nome,criadoEm}`; serve para o app saber se o token ainda vale |
| `GET /admin/aparelhos` | admin | → `{"itens":[…]}` |
| `DELETE /admin/aparelhos/:id` | admin | → 204; 404 se não existe. O token do aparelho para de valer na hora |
| `POST /eventos` | **empresa** | `{"conversa","mensagens":[{"remetente":string\|null,"texto","hora"}]}` → `{"novas":1,"avisados":1}`. Reenviar a mesma mensagem dá `novas:0`. 422 `evento-invalido` |
| `GET /avisos/fluxo` | **pessoal** | SSE (abaixo) |
| `POST /avisos/:id/visto` | **pessoal** | → 204 (idempotente); 404 se o aviso não é seu |
| `GET /plantao` | **pessoal** | → `{"ativo":bool,"alteradoEm":iso\|null}` |
| `POST /plantao` | **pessoal** | `{"comando":"sai"\|"voltei"\|"status"}` (também aceita `ligar`, `desligar`, `on`, `off`, `?`…, ver `interpretarComando`) → mesmo corpo do GET. 422 `comando-invalido` |

### Fluxo de avisos (SSE)

`GET /avisos/fluxo` com `Authorization`. Resposta `text/event-stream`, que não termina:

```
: conectado

id: 01a1da8d-b289-7193-a6bc-f563ed73fb73
event: aviso
data: {"id":"01a1da8d-b289-7193-a6bc-f563ed73fb73","titulo":"Grupo Suporte","texto":"Nova mensagem","criadoEm":"2026-11-14T14:54:41.798Z"}
```

- Linha que começa com `:` é comentário e batimento (a cada 20 s); ignore.
- Ao conectar, o servidor reenvia primeiro os avisos **ainda não vistos** das últimas 24 h (no máximo 50).
  Com o header `Last-Event-ID: <último id recebido>`, reenvia só os posteriores. O cliente deve
  ignorar id que já mostrou.
- Reconecte sempre que a conexão cair (espere 1 s, depois 2, 4… até 30 s). O app só está "de plantão"
  enquanto a conexão está aberta; por isso o app pessoal precisa de um serviço em primeiro plano (R2).
- `texto` é `"Nova mensagem"` ou `"N novas mensagens"`; só vem o texto do cliente se o dono ligou
  `PLANTAO_ENVIAR_TEXTO` (D11).

## Regras que o servidor aplica (o app não repete)

- **Deduplicação:** a assinatura é `conversa + hora + remetente + texto`, por aparelho da empresa. O app
  manda tudo que a notificação mostra; o servidor decide o que é novo.
- **Quem é avisado:** todos os aparelhos pessoais com plantão ligado no momento do evento. Mensagem que
  chega com ninguém de plantão é registrada e **não** avisa depois.
- **Plantão é por aparelho pessoal**, não global (D14).
