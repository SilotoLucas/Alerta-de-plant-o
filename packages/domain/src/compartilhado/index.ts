export {
  type Instante,
  instante,
  MILISSEGUNDOS_POR_DIA,
  MILISSEGUNDOS_POR_MINUTO,
  MINUTOS_POR_DIA,
  minutosEntre,
  somarMinutos,
} from './instante'
export {
  type DecisaoDeTaxa,
  type JanelaDeTaxa,
  janelaVencida,
  registrarRequisicao,
} from './limite-de-taxa'
export type { Marcado } from './marca'
export { type Err, err, type Ok, ok, type Result } from './result'
export { ehUuid } from './uuid'
