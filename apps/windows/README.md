# Alerta de Plantão: alerta no computador (Windows)

Mostra um alerta no topo da tela, com um aviso sonoro suave, sempre que chega mensagem no
WhatsApp Desktop do computador. Serve para não perder chamado de cliente enquanto você está
focado em outra coisa.

## Requisitos

- Windows 10 ou 11
- **WhatsApp Desktop** (o da Microsoft Store) aberto e conectado. Pode ficar minimizado.
- Notificações do WhatsApp **ligadas** (no WhatsApp: Configurações > Notificações, e no Windows:
  Configurações > Sistema > Notificações > WhatsApp)

Não precisa instalar mais nada nem ser administrador.

## Instalar

1. Copie a pasta inteira para o computador.
2. Dê dois cliques em **Instalar.cmd**.
3. Vai aparecer um **sino verde** na bandeja, perto do relógio. Se ele estiver escondido, clique na
   setinha `^` e arraste o sino para a barra.

O programa já fica configurado para abrir junto com o Windows.

## Usar

| Ação | Como |
|---|---|
| Ligar / desligar os alertas | Clique no sino (verde = ligado, cinza = desligado) |
| Fechar um alerta | **Enter**, **Esc**, botão **OK**, ou clique no cartão |
| Ver como fica | Botão direito no sino > **Testar alerta** |
| Ver como fica com vários grupos | Botão direito no sino > **Simular várias conversas** |
| Não abrir com o Windows | Botão direito > desmarque **Iniciar com o Windows** |
| Ajustar volume, repetição etc. | Botão direito > **Configurações...** (depois Sair e abrir de novo) |
| Ver o histórico | Botão direito > **Abrir registro** |

Enquanto há alerta sem confirmar, as bordas da tela brilham em verde, o sino fica **laranja** e o
som se repete a cada 30 segundos.

Se chegarem mensagens de vários grupos ou contatos, o cartão vira uma lista: uma linha por conversa,
com a quantidade de mensagens de cada uma e a mais recente no topo.

## Configurações (`config.json`)

| Chave | Padrão | O que faz |
|---|---|---|
| `Volume` | `0.25` | Volume do aviso (0.0 a 1.0) |
| `RepetirSomSeg` | `30` | Repete o som a cada N segundos até confirmar (`0` = toca uma vez) |
| `SomArquivo` | vazio | Caminho de um `.wav` próprio, se quiser outro som |
| `LarguraCartao` | `460` | Largura do cartão de alerta |
| `PegarFoco` | `true` | Traz o cartão para frente para Enter/Esc funcionarem. Use `false` se atrapalhar quando estiver digitando |
| `Brilho` | `true` | Brilho verde nas bordas da tela enquanto houver alerta |
| `IntervaloMs` | `1500` | De quanto em quanto tempo verifica as notificações |

## Quando o alerta NÃO dispara

O programa reage às notificações que o WhatsApp manda para o Windows. Se o WhatsApp não mandar
notificação, não há alerta. Isso acontece quando:

- a janela do WhatsApp está aberta e em primeiro plano (você já está olhando);
- a mensagem foi lida antes em outro aparelho (celular);
- a conversa ou o grupo está silenciado;
- as notificações do WhatsApp estão desligadas no WhatsApp ou no Windows.

## Desinstalar

Dois cliques em **Desinstalar.cmd**.

O app do celular da empresa e o servidor estão em [`../android`](../android/README.md) e [`../../docs/arquitetura.md`](../../docs/arquitetura.md).
