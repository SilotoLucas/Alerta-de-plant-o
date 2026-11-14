import type { Instante } from '../compartilhado'

export type Mensagem = {
  readonly remetente: string | null
  readonly texto: string
  readonly hora: Instante
}

export const assinaturaDaMensagem = (mensagem: Mensagem): string =>
  `${mensagem.hora}|${mensagem.remetente ?? ''}|${mensagem.texto}`

export const assinaturaNaConversa = (conversa: string, mensagem: Mensagem): string =>
  `${conversa}\n${assinaturaDaMensagem(mensagem)}`
