import type { GeradorDeId, Relogio } from '@plantao/application'
import { instante, type Marcado } from '@plantao/domain'

export const relogioDoSistema = (): Relogio => ({ agora: () => instante(Date.now()) })

export const idsAleatorios = (): GeradorDeId => ({
  novo: <M extends string>() => Bun.randomUUIDv7() as Marcado<string, M>,
})
