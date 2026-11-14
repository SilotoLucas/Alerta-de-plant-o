import { type Static, Type } from '@sinclair/typebox'

export const PedidoDeEvento = Type.Object({
  conversa: Type.String({ maxLength: 500 }),
  mensagens: Type.Array(
    Type.Object({
      remetente: Type.Union([Type.String({ maxLength: 500 }), Type.Null()]),
      texto: Type.String({ maxLength: 20_000 }),
      hora: Type.Number(),
    }),
    { maxItems: 200 },
  ),
  silencioso: Type.Optional(Type.Boolean()),
})
export type PedidoDeEvento = Static<typeof PedidoDeEvento>

export const RespostaDeEvento = Type.Object({
  novas: Type.Integer(),
  avisados: Type.Integer(),
})
export type RespostaDeEvento = Static<typeof RespostaDeEvento>

export const PedidoDeComando = Type.Object({ comando: Type.String({ maxLength: 40 }) })
export type PedidoDeComando = Static<typeof PedidoDeComando>

export const RespostaDoPlantao = Type.Object({
  ativo: Type.Boolean(),
  alteradoEm: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
})
export type RespostaDoPlantao = Static<typeof RespostaDoPlantao>

export const RespostaDeAviso = Type.Object({
  id: Type.String(),
  titulo: Type.String(),
  texto: Type.String(),
  criadoEm: Type.String({ format: 'date-time' }),
})
export type RespostaDeAviso = Static<typeof RespostaDeAviso>

export const ParametroDeAviso = Type.Object({ id: Type.String({ maxLength: 64 }) })
export type ParametroDeAviso = Static<typeof ParametroDeAviso>
