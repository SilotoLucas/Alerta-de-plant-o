import { type Static, Type } from '@sinclair/typebox'

export const RespostaSaude = Type.Object({
  status: Type.Literal('ok'),
})

export type RespostaSaude = Static<typeof RespostaSaude>
