# Prompt para o Claude Code da VM: instalar o Alerta de Plantão

> Como usar: na VM, diga ao Claude Code: "Clone https://github.com/SilotoLucas/Alerta-de-plant-o.git em
> /opt/plantao (se ainda não existir) e siga as instruções de /opt/plantao/docs/prompt-vm.md". O resto
> deste arquivo é o que ele deve seguir. Contexto técnico completo em [deploy.md](deploy.md).

---

Você é o Claude Code na VM Contabo (Ubuntu 24.04, IP 194.5.152.64, acesso root). Sua tarefa é instalar o
projeto "Alerta de Plantão" nesta VM e me dizer se funcionou. Responda sempre em português (pt-BR).

## Contexto
- O repositório é público: https://github.com/SilotoLucas/Alerta-de-plant-o.git (branch main), clonado em
  `/opt/plantao`.
- Ele traz tudo pronto em `deploy/`: Dockerfile, compose, site do Caddy, scripts e timer do systemd.
  O guia completo é `docs/deploy.md`. Leia-o inteiro antes de começar.
- O desenho é o mesmo do Bússola. O Caddy do Abanou (container `abanou-caddy-1`) é o proxy único da VM
  (80/443). A API do Alerta entra pela rede Docker externa `borda`, sem publicar nenhuma porta. Um timer do
  systemd (`plantao-deploy.timer`) puxa a `main` a cada 2 minutos.
- O endereço público será `https://plantao.194.5.152.64.sslip.io` (sslip.io, certificado Let's Encrypt
  emitido pelo Caddy).

## Regras
1. NÃO mexa no Abanou nem no Bússola: nada de parar, reiniciar ou recriar os containers deles, nem editar
   os arquivos deles. A única mexida permitida é o Caddy da borda recarregar a configuração (o
   `instalar-na-borda.sh` já faz isso com `caddy reload`, sem derrubar nada) e o arquivo novo
   `/opt/borda/sites/plantao.caddy`.
2. NÃO imprima o conteúdo de `/opt/plantao/deploy/.env` (tem a senha do banco e a senha de administrador).
   Se precisar conferir, mostre só os NOMES das variáveis e se estão preenchidas, nunca os valores.
3. NÃO rode `docker system prune`, `docker volume prune` nem `down -v` (apagaria o banco).
4. Se algum passo falhar, pare, mostre a saída do erro (sem segredos) e diga a causa provável. Não invente
   contorno que mude o desenho (portas publicadas, outro proxy, abrir firewall).
5. Antes de cada passo que altera algo, diga em uma linha o que vai fazer.
6. Não altere código do repositório. Se achar que algum arquivo de `deploy/` precisa mudar, descreva a
   mudança em vez de editar, que o dono corrige do lado dele e dá push.

## Passos

### 1. Conferir o ambiente (somente leitura)
```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'abanou|bussola'
docker network inspect borda --format '{{.Name}} ok'
ls /opt/borda/sites/
docker --version && docker compose version && git --version && openssl version
df -h / | tail -1 && free -h | head -2
```
Esperado: o container `abanou-caddy-1` de pé, a rede `borda` existindo, Docker + compose + git + openssl
presentes e pelo menos 3 GB livres de disco e 2 GB de RAM livres (o build da imagem é o pico).
Se `abanou-caddy-1` ou a rede `borda` não existirem, PARE e me avise.

### 2. Conferir o clone
```bash
cd /opt/plantao && git pull --ff-only && git log --oneline | head -3 && ls deploy
```
O `git log` deve ter o commit `docs: guia de deploy na VM e decisões D18 a D21 (R4)` entre os primeiros, e
`deploy/` deve existir. Se `/opt/plantao` não existir, clone com
`git clone https://github.com/SilotoLucas/Alerta-de-plant-o.git /opt/plantao`. Se `deploy/` não existir,
PARE e me avise.

Depois rode a instalação (ela cria `deploy/.env` com segredos aleatórios, sobe db + migração + API, publica o
site no Caddy da borda, instala e liga o timer):
```bash
/opt/plantao/deploy/instalar.sh
```
O build da imagem leva alguns minutos. Mostre as últimas ~30 linhas da saída quando terminar.

### 3. Verificar (mostre a saída de cada comando)
```bash
cd /opt/plantao/deploy
docker compose ps
docker compose logs --tail=20 migracao api
cat /opt/borda/sites/plantao.caddy
systemctl list-timers plantao-deploy.timer --no-pager
curl -sS -m 30 https://plantao.194.5.152.64.sslip.io/health
```
Esperado:
- `db` e `api` com status `healthy`; `migracao` terminou (Exited 0) e o log mostra
  `migrações aplicadas: 0001_aparelhos.sql, 0002_mensagens_e_avisos.sql`.
- O log da API mostra `api ouvindo na porta 3350` e `limpeza: 0 hashes, 0 avisos, 0 códigos apagados`.
- `plantao.caddy` tem o domínio `plantao.194.5.152.64.sslip.io` com `reverse_proxy plantao-api:3350` e
  `flush_interval -1`.
- O timer aparece com próxima execução agendada.
- O `curl` devolve `{"status":"ok"}`. O primeiro acesso pode levar até ~30 s porque o Caddy pede o
  certificado na hora. Se der erro de TLS, espere 1 minuto e tente de novo; se persistir, mostre
  `docker logs --tail=40 abanou-caddy-1` (procure por "plantao") e diga a causa provável (DNS do sslip.io,
  porta 80 bloqueada pelo ufw, limite do Let's Encrypt).

### 4. Provar a rota de administrador e o pareamento (sem expor segredos)
```bash
cd /opt/plantao/deploy
./codigo.sh pessoal
./codigo.sh empresa
```
Cada um deve imprimir `Código NNNNNN (papel), vale 10 minutos`. Esses dois códigos o dono NÃO vai usar: pode
mostrá-los. Em seguida confira que a rota de administrador recusa quem não tem a senha:
```bash
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://plantao.194.5.152.64.sslip.io/admin/pareamentos \
  -H 'content-type: application/json' -d '{"papel":"pessoal"}'
```
Esperado: um código 4xx (não 200/201).

### 5. Provar o deploy automático
Rode `./atualizar.sh` (sem `--forcar`) em `/opt/plantao/deploy`: como o commit já foi implantado, não deve
fazer nada e não deve dar erro. Depois mostre `cat /var/lib/plantao-deploy/ultimo` (deve bater com
`git -C /opt/plantao rev-parse HEAD`).

### 6. Teste de SSE pelo proxy (opcional, recomendado)
Gere um código novo para cada papel, pareie dois aparelhos de teste por `curl`, ligue o plantão do pessoal,
abra `GET /avisos/fluxo` com `curl -N` em segundo plano por 15 s, mande um `POST /eventos` do aparelho
empresa e confirme que o evento `aviso` aparece no fluxo na hora. Os formatos estão em `docs/api.md`. No fim,
remova os dois aparelhos de teste com `DELETE /admin/aparelhos/:id` (use a senha de administrador lida de
dentro do container: `docker compose exec -T api printenv PLANTAO_ADMIN_TOKEN`, sem imprimir na tela do chat;
passe-a direto para o curl por variável de shell).

## O que devolver
Um relatório curto, uma linha por item, com OK/FALHOU e, se falhou, a causa e o que você sugere:
1. Ambiente (Abanou/borda/Docker) conferido
2. Clone e instalação
3. Containers saudáveis e migrações aplicadas
4. HTTPS e `/health` pelo domínio
5. Códigos de pareamento gerados e rota admin protegida
6. Timer de deploy ativo
7. SSE pelo proxy (se você fez o passo 6)
8. Qualquer coisa estranha que você viu (avisos nos logs, pouco disco, firewall)
