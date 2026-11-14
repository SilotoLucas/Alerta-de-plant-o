import { ehUuid, type Marcado } from '../compartilhado'
import type { Mensagem } from './mensagem'

export type AvisoId = Marcado<string, 'AvisoId'>

export const lerAvisoId = (texto: string): AvisoId | null =>
  ehUuid(texto) ? (texto as AvisoId) : null

export type Aviso = { readonly titulo: string; readonly texto: string }

export const MAXIMO_DE_LINHAS_DO_AVISO = 3
export const MAXIMO_DE_CARACTERES_POR_LINHA = 200

const linhaDaMensagem = (conversa: string, mensagem: Mensagem): string => {
  const texto = mensagem.texto.slice(0, MAXIMO_DE_CARACTERES_POR_LINHA)
  const quem = mensagem.remetente
  return quem !== null && quem.trim() !== '' && quem !== conversa ? `${quem}: ${texto}` : texto
}

export const montarAviso = (
  conversa: string,
  novas: readonly Mensagem[],
  incluirTexto: boolean,
): Aviso => {
  if (!incluirTexto) {
    return {
      titulo: conversa,
      texto: novas.length === 1 ? 'Nova mensagem' : `${novas.length} novas mensagens`,
    }
  }
  const linhas = novas
    .slice(0, MAXIMO_DE_LINHAS_DO_AVISO)
    .map((mensagem) => linhaDaMensagem(conversa, mensagem))
  if (novas.length > MAXIMO_DE_LINHAS_DO_AVISO) {
    linhas.push(`+ ${novas.length - MAXIMO_DE_LINHAS_DO_AVISO} mensagens`)
  }
  return { titulo: conversa, texto: linhas.join('\n') }
}
