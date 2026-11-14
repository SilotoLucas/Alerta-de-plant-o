import { type Instante, instante, type Marcado } from '@plantao/domain'
import type { GeradorDeId, Relogio } from './portas'

export const relogioParado = (inicial: Instante): Relogio & { avancar: (ms: number) => void } => {
  let atual = inicial
  return {
    agora: () => atual,
    avancar: (ms) => {
      atual = instante(atual + ms)
    },
  }
}

export const idsSequenciais = (): GeradorDeId => {
  let contador = 0
  return {
    novo: <M extends string>() => {
      contador += 1
      return `0192f1e2-0000-7000-8000-${String(contador).padStart(12, '0')}` as Marcado<string, M>
    },
  }
}
