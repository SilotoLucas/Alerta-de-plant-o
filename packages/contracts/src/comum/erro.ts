import { type Static, Type } from '@sinclair/typebox'

export const RespostaDeErro = Type.Object({
  erro: Type.Object({ codigo: Type.String(), mensagem: Type.String() }),
})

export type RespostaDeErro = Static<typeof RespostaDeErro>
