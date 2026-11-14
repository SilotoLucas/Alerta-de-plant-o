# Contexto do projeto: Alerta de Plantão

Documento para retomar o projeto em outra máquina/sessão (próxima fase: app Android, na máquina
Linux com Android Studio). Última atualização: 2026-11-14.

## O problema

O usuário trabalha de plantão (dia e noite). Clientes chamam por **grupos de WhatsApp** (e às vezes
no privado) no número da **empresa**. Dois problemas:

1. **Local:** no notebook/PC, focado em outra coisa, a mensagem chega e passa despercebida.
2. **Remoto:** quando sai durante o plantão, não fica olhando o celular da empresa; precisa de um
   aviso no **celular pessoal** para ir olhar o celular da empresa e responder.

Requisito comum: poder **ativar e desativar** o serviço quando quiser.
Outros consultores da equipe também vão usar, então precisa ser apresentável e fácil de instalar.

## Decisões tomadas

- **Detecção sem tocar no WhatsApp:** lemos as *notificações do sistema* que o próprio WhatsApp gera.
  Nada de WhatsApp Web não oficial (Baileys/WAHA/Evolution): risco de banimento do número da empresa
  e quebra a cada atualização.
- **Alertar em qualquer mensagem** (grupo ou privado) por enquanto. Filtro por grupo/pessoa/palavra
  fica para depois, se der.
- Grupos **não** são silenciados.
- Celular da empresa: **Android**. O usuário tem um **servidor próprio** disponível.

## Fase 1 — Local (Windows): CONCLUÍDA (v1.2)

v1.2: brilho verde pulsando nas bordas de todos os monitores (janela em camadas, transparente a
cliques) e cartão que agrupa por conversa (lista de até 4 conversas, contador por conversa,
"+N outras conversas"). Menu da bandeja: "Simular várias conversas".

Arquivos na raiz do projeto:

| Arquivo | Papel |
|---|---|
| `AlertaPlantao.ps1` | Programa principal (PowerShell 5.1 + WinForms + WinRT). Bandeja, leitura das notificações, som, registro. UTF-8 com BOM. |
| `Banner.cs` | Cartão de alerta desenhado à mão (C# 5, compilado em tempo de execução via `Add-Type`). Também gera o ícone do sino. |
| `IniciarAlerta.vbs` | Inicia sem janela de console. |
| `Instalar.cmd` / `Instalar.ps1` | Instala em `%LOCALAPPDATA%\AlertaPlantao`, atalho no Menu Iniciar e na Inicialização. `-Desinstalar` remove. |
| `Desinstalar.cmd` | Atalho para desinstalar. |
| `README.md` | Manual para os consultores (página inicial do repositório). |
| `.gitignore` | Deixa de fora `config.json` (configuração local) e registros. |

Como funciona:
- `Windows.UI.Notifications.Management.UserNotificationListener` (WinRT), **por polling** a cada 1,5 s
  (o evento `NotificationChanged` exige app empacotado). `RequestAccessAsync` retornou `Allowed` em
  app não empacotado no Windows 11.
- Filtro pelo AppUserModelId que contém `WhatsAppDesktop`
  (`5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App`).
- Notificação do WhatsApp: 1º texto = nome do grupo/contato, demais = "Remetente: mensagem".
- Alerta: cartão no topo (desliza), som "plim-plom" gerado em WAV, repete a cada 30 s até confirmar.
  Fecha com Enter/Esc/OK/clique. Ícone: verde ativo, cinza desligado, laranja com alerta pendente.
- Config opcional em `config.json` ao lado do script (criado no 1º uso).
- Registro em `%TEMP%\AlertaPlantao.log`. Autoteste: `AlertaPlantao.ps1 -AutoTeste`.

Lições aprendidas (importantes também para o Android):
1. **O WhatsApp reaproveita a mesma notificação** (mesmo Id) quando chega outra mensagem na mesma
   conversa. Detectar "novo" por Id não basta: usar **Id + texto**. (Bug real que perdeu mensagens.)
2. **Se o WhatsApp não gera notificação, não há o que detectar**: janela em foco, mensagem já lida
   em outro aparelho, conversa silenciada. Diagnóstico útil: chave de registro
   `HKCU\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\<AUMID>` →
   `LastNotificationAddedTime` (FILETIME) mostra quando o WhatsApp notificou pela última vez.
3. Primeira versão (tela cheia vermelha + sirene) foi **intrusiva demais**; o usuário prefere aviso
   discreto no topo, som baixo e fechar fácil (Enter). Manter esse tom no celular.
4. Ao reativar, marcar tudo que já está na central como visto (não alertar o que chegou desligado).
5. **Windows Defender:** um autoteste que tirava print da tela (`CopyFromScreen` + `CaptureBlt`)
   fez o Defender marcar o script como `Trojan:BAT/ScreenShoter` (falso positivo: leitura de
   notificações + captura de tela parece spyware). Não colocar captura de tela no programa. Para
   distribuir em escala, considerar um executável assinado.
6. O usuário quer as respostas **em português (pt-BR)**.
7. Preferências do usuário confirmadas: estilo escuro do cartão, som "plim-plom", posição no topo,
   brilho verde nas bordas.

## Fase 2 — Remoto (Android → celular pessoal): A FAZER

Arquitetura proposta:

```
[Celular da EMPRESA (Android)]                [Servidor do usuário]          [Celular PESSOAL]
 WhatsApp gera notificação                     ntfy (self-hosted,             app ntfy (ou app
   -> app próprio com                          Docker)                         próprio) recebe
      NotificationListenerService  --HTTPS-->  tópico privado c/ token  -->   push prioridade alta
      (filtra com.whatsapp / com.whatsapp.w4b)
```

App Android (Kotlin, Android Studio), no celular da empresa:
- `NotificationListenerService` filtrando `com.whatsapp` e `com.whatsapp.w4b` (Business).
- Extrair `android.title` / `android.text` (e `android.messages` / `EXTRA_MESSAGES` em
  MessagingStyle para pegar cada mensagem). Aplicar a lição 1: deduplicar por chave + conteúdo,
  ignorar a notificação-resumo do grupo (`FLAG_GROUP_SUMMARY`).
- **Liga/desliga**: botão no app + Quick Settings Tile; idealmente também remoto (comando vindo do
  celular pessoal via outro tópico do ntfy, ex.: "saí" / "voltei").
- Envio: `POST https://<servidor>/<topico>` com cabeçalhos `Title`, `Priority: 5` (urgente),
  `Tags`, autenticação por token. Fila/retentativa se estiver sem internet (WorkManager).
- Privacidade: decidir se manda o texto da mensagem ou só "Nova mensagem de <grupo>"
  (o conteúdo é de cliente).
- Cuidados: excluir o app da otimização de bateria; serviço com reinício automático;
  pedir a permissão "Acesso a notificações".

Servidor:
- `ntfy` em Docker, com HTTPS (proxy reverso), `auth-default-access: deny-all`, usuário/token por
  consultor, tópico por consultor.
- Escalonamento opcional: se não confirmar em N minutos, reenviar / outro canal.

Celular pessoal:
- Começar com o app **ntfy** (Android/iOS), notificação de prioridade máxima (toca no silencioso).
- Depois, se quiser, app próprio com botão "Vi" que confirma de volta.

Alternativa sem código (para validar rápido antes do app): MacroDroid/Tasker no celular da empresa
capturando notificação do WhatsApp → HTTP POST para o ntfy.

## Ideias futuras (local)

- Filtro por grupo/pessoa/palavra-chave.
- Atalho de teclado global para ligar/desligar.
- Integrar com a Fase 2: o PC também poderia publicar no ntfy quando o usuário estiver ausente
  (ex.: PC ocioso há X min).
