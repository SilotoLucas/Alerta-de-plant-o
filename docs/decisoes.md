# Decisões

Uma entrada numerada por decisão, com o motivo e o que foi descartado. Decisão nova ganha o próximo
número; decisão revista não é apagada, ganha entrada nova que cita a anterior ("substitui D7").
A topologia que estas decisões produzem está em [arquitetura.md](arquitetura.md); o produto, em
[plano-produto.md](plano-produto.md).

O método (camadas, gate, testes, `.claude/`) é o do Abanou (`~/Documentos/Projetos/pets`) e do
Bússola (`~/Documentos/Projetos/bussola`), que seguem `metodologia-projetos-claude-code.md`. As
decisões de stack repetem as de lá quando o motivo vale igual, para este repositório não depender de
outro para se explicar.

**Situação de cada decisão:** *Decidida* já está em vigor. *Proposta* aguarda o OK do dono. D7 a D10
foram aprovadas em 2026-11-14 (o dono disse "pode seguir com a R1") e valem desde a R1.

## 2026-11-14 (R4, deploy)

**D18. Deploy como o do Bússola: Caddy do Abanou na borda, timer que puxa a `main` a cada 2 minutos.** *Decidida.*
Motivo: a VM já tem proxy, rede `borda` e esse fluxo; repetir o desenho evita uma segunda solução para o
mesmo problema. Push na `main` é deploy em produção. O repositório é público, então a VM clona por https,
sem deploy key. Descartado: Caddy próprio (80/443 só aceitam um dono), deploy manual (esquece de atualizar).

**D19. Endereço `plantao.194.5.152.64.sslip.io` enquanto não houver domínio; um host só para a API, sem prefixo `/api`.** *Decidida.*
Motivo: o sslip.io dá certificado válido sem cadastro e o Android release exige https. Trocar para
domínio próprio é mudar `DOMINIO` no `deploy/.env` e **gerar o APK de novo** (o endereço vai dentro dele).
O site do proxy usa `flush_interval -1` e não comprime: compressão seguraria o SSE.

**D20. Retenção de 7 dias, feita pela própria API.** *Decidida.*
Motivo: sem isso o banco cresce para sempre com hashes e avisos de cliente. A API roda a limpeza ao subir e
a cada hora (`limparDadosAntigos`, `RETENCAO_EM_DIAS`), sem container nem timer a mais. Apaga hashes de
mensagens, avisos e códigos de pareamento vencidos com mais de 7 dias. Efeito: mensagem com mais de 7 dias
que o celular da empresa reenvie voltaria a avisar; a linha de base silenciosa (R2) cobre o caso comum.

**D21. APK assinado por script local, chave fora do repositório.** *Decidida.*
Motivo: `apps/android/gerar-release.sh` cria a chave em `~/.config/alerta-plantao` na primeira vez e assina
com `apksigner`. A chave nunca entra no git; perdê-la impede atualizar o app nos celulares já instalados
(backup é do dono). Sem Play Store: o APK é instalado direto, com "fontes desconhecidas".

## 2026-11-14 (R1, API e banco)

**D14. Plantão é por aparelho pessoal; uma instalação atende uma só equipe.** *Decidida.*
Motivo: vários consultores vão usar. O evento da empresa vai para **todos** os aparelhos pessoais com
plantão ligado naquele instante, e cada um liga e desliga o seu. Sem contas de usuário: quem pareia é
um aparelho, e o dono (senha de administrador) controla os códigos. Descartado: um interruptor global
(ligaria o plantão de todo mundo), contas com e-mail e senha (mais uma tela e mais dado pessoal para
quem só quer ser avisado).

**D15. Pareamento: o administrador gera um código de 6 dígitos de 10 minutos, de uso único.** *Decidida.*
Motivo: é o mais curto de digitar no celular. Com 10⁶ combinações o risco é adivinhar, então a rota que
troca o código por token tem limite de 5 tentativas por minuto por IP e o código morre ao ser usado.
O token (32 bytes aleatórios) só aparece uma vez e o banco guarda o SHA-256. Quem gera os códigos é
quem tem `PLANTAO_ADMIN_TOKEN`; a API não sobe sem ele. Descartado: QR code (precisaria de câmera no
app e de tela no servidor), código longo (ruim de digitar).

**D16. Deduplicação por hash, nunca pelo texto.** *Decidida.*
Motivo: D11 diz que o texto do cliente fica fora do servidor por padrão, e a assinatura
(`conversa + hora + remetente + texto`) contém o texto. O banco guarda só o SHA-256 dela. Ainda vale a
lição 1: a hora entra na assinatura, então "ok" duas vezes são duas mensagens.

**D17. Id de aviso é UUIDv7 e o reenvio usa `Last-Event-ID`.** *Decidida.*
Motivo: UUIDv7 ordena no tempo, então `id > último` basta e não precisa de coluna serial nem de
relógio do cliente. O servidor reenvia o que não foi visto nas últimas 24 h. Limite assumido: o
notificador em memória vale para **uma** instância da API (D8); escalar para duas exige FCM ou um
canal compartilhado.

## 2026-11-14 (R0, reestruturação)

### Estrutura

**D1. Bun como runtime, gerenciador e test runner; TypeScript estrito.** *Decidida.*
Motivo: um binário para instalar, rodar, testar e fazer workspaces, igual aos outros dois projetos.
Descartado: Node + pnpm + Vitest.

**D2. TypeScript 6.0.3, não 7.0.** *Decidida.*
Motivo: dependency-cruiser e knip leem o projeto pela API JS do compilador; a 7 (nativa) não tem
compatibilidade provada com eles. Gatilho para rever: as duas ferramentas declararem suporte.

**D3. Monorepo no molde do Bússola: `packages/*`, `tools/*`, `apps/*`; gate copiado e enxugado.** *Decidida.*
Mantidas as 16 fases do gate. Removidas `tokens-gerados` e `tamanho-de-tela`, que só existem para
interface TypeScript; este projeto não tem. As regras de front do `.dependency-cruiser.cjs` e do
`biome.json` ficam inativas em vez de apagadas, porque os testes de fixture do gate dependem delas e
um app web futuro as reaproveita. Descartado: reescrever o gate do zero (mais código para errar).

**D4. `apps/android` e `apps/windows` ficam em `apps/` mas fora dos workspaces do Bun.** *Decidida.*
Motivo: não são TypeScript. O Gradle e o PowerShell têm as suas formas de testar; o gate de TypeScript
as ignora (`.dependency-cruiser.cjs`, `.ls-lint.yml`, `.jscpd.json`). Descartado: manter `android/` e
`servidor/` na raiz (fugia do padrão dos outros projetos).

**D5. Escopo de pacote `@plantao/*`, API na porta 3350, Postgres na 5435, container `plantao-db`.** *Decidida.*
Motivo: rodar junto do Abanou (3333, 5433) e do Bússola (3340, 5434) sem conflito.

**D6. Versões exatas, sem `^`, `~` nem `latest`, também no Gradle.** *Decidida.*
Motivo: sem deriva silenciosa. Tabela com o motivo de cada uma em `arquitetura.md` §G.

### Produto e infraestrutura

**D7. Servidor próprio na VM entre os dois celulares.** *Decidida (R1).*
Motivo: dois celulares em rede móvel não se alcançam sem um servidor no meio (NAT da operadora). A VM
já existe e já tem proxy, deploy automático e Postgres. O servidor só repassa um aviso curto.
Descartado: comunicação direta entre os celulares (tecnicamente inviável sem relé); Telegram bot
(conteúdo de cliente passa por terceiro e o aviso não fura o modo silencioso); `ntfy.sh` público
(sem controle nem privacidade); Firebase como único canal (conta Google e dado fora, e o app ainda
precisaria de servidor para saber para quem mandar).

**D8. Entrega ao celular pessoal por conexão aberta (SSE) na v1; FCM como segundo adaptador depois.** *Decidida (R1).*
Motivo: SSE funciona hoje, sem conta Google; a porta `Notificador` deixa trocar para FCM sem mexer no
resto. Risco assumido: alguns fabricantes matam o serviço em segundo plano. Gatilho para rever: o
alerta falhar em uso real, ou o dono querer a confiabilidade do push. Descartado: FCM desde o início
(exige criar projeto Firebase antes de qualquer coisa funcionar).

**D9. Um único app Android com dois modos (Empresa e Pessoal), pareado por código de 6 dígitos.** *Decidida (R1).*
Motivo: era a reclamação de "muitas etapas". Sai URL, tópico, token e o segundo app (ntfy). Descartado:
dois apps separados (dobra a manutenção) e manter ntfy (mais uma peça para instalar e configurar).
Substitui a escolha do ntfy registrada em `historico-fases-1-e-2.md`.

**D10. O servidor decide; o app só repassa.** *Decidida (R1).*
Motivo: deduplicação (índice único por aparelho e assinatura), regra de privacidade e estado de plantão
num só lugar, testados em TypeScript puro. O app Android deixa de guardar estado e de montar texto, e
fica menor. Preserva a lição 1 (o WhatsApp reaproveita a mesma notificação): a assinatura é hora +
remetente + texto, não o Id.

**D11. Privacidade: o texto da mensagem não vai por padrão.** *Decidida (já vale no app atual).*
O aviso mostra o nome da conversa e a quantidade. O texto só vai se o dono ligar. Motivo: o conteúdo é
de cliente. Quando a API existir, a regra roda no servidor (`montarAviso`).

**D12. Android nativo em Kotlin, não Expo.** *Decidida.*
Motivo: o app precisa de `NotificationListenerService`, que o Expo não oferece sem módulo nativo
próprio. É exatamente o gatilho que a decisão D5 do Bússola ("Expo para não manter `android/` à mão")
deixa para rever. O app é pequeno (cerca de 800 linhas de Kotlin) e já foi testado de ponta a ponta no emulador.
Descartado: Expo com `react-native-android-notification-listener` (biblioteca de terceiros para a
parte crítica do produto).

**D13. O alerta do Windows continua em PowerShell e independente do servidor.** *Decidida.*
Motivo: roda sem instalar nada e sem administrador; reescrever perderia isso. Lição: o Defender
marcou como trojan um autoteste que tirava print da tela; nunca colocar captura de tela.
