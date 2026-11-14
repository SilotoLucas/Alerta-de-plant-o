import { err, type Instante, instante, ok, type Result } from '../compartilhado'
import type { ErroDePlantao } from './erros'
import type { Mensagem } from './mensagem'

export const MAXIMO_DE_MENSAGENS_POR_EVENTO = 50
const MAXIMO_DE_CARACTERES_DA_CONVERSA = 120
const MAXIMO_DE_CARACTERES_DA_MENSAGEM = 4_000
const MAXIMO_DE_CARACTERES_DO_REMETENTE = 120

export type EventoRecebido = {
  readonly conversa: string
  readonly mensagens: readonly {
    readonly remetente: string | null
    readonly texto: string
    readonly hora: number
  }[]
}

export type Evento = { readonly conversa: string; readonly mensagens: readonly Mensagem[] }

const mensagemValida = (mensagem: EventoRecebido['mensagens'][number]): Mensagem | null => {
  const remetente = mensagem.remetente === null ? null : mensagem.remetente.trim()
  const hora: Instante = instante(mensagem.hora)
  const valida =
    Number.isSafeInteger(mensagem.hora) &&
    mensagem.hora > 0 &&
    mensagem.texto.length <= MAXIMO_DE_CARACTERES_DA_MENSAGEM &&
    (remetente === null || remetente.length <= MAXIMO_DE_CARACTERES_DO_REMETENTE)
  return valida
    ? { remetente: remetente === '' ? null : remetente, texto: mensagem.texto, hora }
    : null
}

export const validarEvento = (entrada: EventoRecebido): Result<Evento, ErroDePlantao> => {
  const conversa = entrada.conversa.trim()
  if (conversa === '' || conversa.length > MAXIMO_DE_CARACTERES_DA_CONVERSA)
    return err('evento-invalido')
  if (entrada.mensagens.length === 0 || entrada.mensagens.length > MAXIMO_DE_MENSAGENS_POR_EVENTO)
    return err('evento-invalido')
  const mensagens: Mensagem[] = []
  for (const bruta of entrada.mensagens) {
    const mensagem = mensagemValida(bruta)
    if (mensagem === null) return err('evento-invalido')
    mensagens.push(mensagem)
  }
  return ok({ conversa, mensagens })
}
