import type { Instante, Marcado } from '@plantao/domain'

export interface Relogio {
  readonly agora: () => Instante
}

export interface GeradorDeId {
  readonly novo: <M extends string>() => Marcado<string, M>
}
