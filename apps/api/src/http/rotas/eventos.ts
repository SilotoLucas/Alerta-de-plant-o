import { PedidoDeEvento } from '@plantao/contracts'
import { Elysia } from 'elysia'
import type { CasosDeUso } from '../../composicao/casos-de-uso'
import { autenticacaoDeAparelho } from '../aparelho'
import { responder } from '../resposta'

export const rotasDeEventos = (casos: CasosDeUso) =>
  new Elysia()
    .use(autenticacaoDeAparelho(casos))
    .post(
      '/eventos',
      async ({ aparelho, body, status }) =>
        responder(status, await casos.receberEvento(aparelho, body), (resumo) => resumo),
      { autenticado: true, body: PedidoDeEvento },
    )
