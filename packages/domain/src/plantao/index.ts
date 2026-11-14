export {
  type Aviso,
  type AvisoId,
  lerAvisoId,
  MAXIMO_DE_CARACTERES_POR_LINHA,
  MAXIMO_DE_LINHAS_DO_AVISO,
  montarAviso,
} from './aviso'
export { type Comando, interpretarComando } from './comando'
export type { ErroDePlantao } from './erros'
export {
  type Evento,
  type EventoRecebido,
  MAXIMO_DE_MENSAGENS_POR_EVENTO,
  validarEvento,
} from './evento'
export { assinaturaDaMensagem, assinaturaNaConversa, type Mensagem } from './mensagem'
