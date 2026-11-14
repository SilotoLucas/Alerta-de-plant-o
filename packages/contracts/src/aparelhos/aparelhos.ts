import { type Static, Type } from '@sinclair/typebox'

const Papel = Type.Union([Type.Literal('empresa'), Type.Literal('pessoal')])

export const PedidoDePareamento = Type.Object({ papel: Papel })
export type PedidoDePareamento = Static<typeof PedidoDePareamento>

export const RespostaDePareamento = Type.Object({
  codigo: Type.String(),
  papel: Papel,
  expiraEm: Type.String({ format: 'date-time' }),
})
export type RespostaDePareamento = Static<typeof RespostaDePareamento>

export const PedidoDeConclusao = Type.Object({
  codigo: Type.String({ maxLength: 20 }),
  nome: Type.String({ maxLength: 200 }),
})
export type PedidoDeConclusao = Static<typeof PedidoDeConclusao>

export const RespostaDeAparelho = Type.Object({
  id: Type.String(),
  papel: Papel,
  nome: Type.String(),
  criadoEm: Type.String({ format: 'date-time' }),
})
export type RespostaDeAparelho = Static<typeof RespostaDeAparelho>

export const RespostaDeAparelhoPareado = Type.Object({
  aparelho: RespostaDeAparelho,
  token: Type.String(),
})
export type RespostaDeAparelhoPareado = Static<typeof RespostaDeAparelhoPareado>

export const RespostaDeAparelhos = Type.Object({ itens: Type.Array(RespostaDeAparelho) })
export type RespostaDeAparelhos = Static<typeof RespostaDeAparelhos>

export const ParametroDeAparelho = Type.Object({ id: Type.String({ maxLength: 64 }) })
export type ParametroDeAparelho = Static<typeof ParametroDeAparelho>
