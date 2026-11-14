import type { Marcado } from './marca'

export type Instante = Marcado<number, 'Instante'>

export const instante = (milissegundosDesdeEpoca: number): Instante =>
  milissegundosDesdeEpoca as Instante

export const MILISSEGUNDOS_POR_MINUTO = 60_000
export const MINUTOS_POR_DIA = 1440
export const MILISSEGUNDOS_POR_DIA = MINUTOS_POR_DIA * MILISSEGUNDOS_POR_MINUTO

export const somarMinutos = (base: Instante, minutos: number): Instante =>
  instante(base + minutos * MILISSEGUNDOS_POR_MINUTO)

export const minutosEntre = (de: Instante, ate: Instante): number =>
  (ate - de) / MILISSEGUNDOS_POR_MINUTO
