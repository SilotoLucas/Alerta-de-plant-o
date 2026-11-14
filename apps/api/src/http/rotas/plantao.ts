import { PedidoDeComando } from '@plantao/contracts'
import { Elysia } from 'elysia'
import type { CasosDeUso } from '../../composicao/casos-de-uso'
import { autenticacaoDeAparelho } from '../aparelho'
import { apresentarPlantao } from '../apresentacao'
import { responder } from '../resposta'

export const rotasDoPlantao = (casos: CasosDeUso) =>
  new Elysia({ prefix: '/plantao' })
    .use(autenticacaoDeAparelho(casos))
    .get(
      '/',
      async ({ aparelho, status }) =>
        responder(status, await casos.alterarPlantao(aparelho, 'status'), apresentarPlantao),
      { autenticado: true },
    )
    .post(
      '/',
      async ({ aparelho, body, status }) =>
        responder(status, await casos.alterarPlantao(aparelho, body.comando), apresentarPlantao),
      { autenticado: true, body: PedidoDeComando },
    )
