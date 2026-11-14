import { PedidoDeConclusao, PedidoDePareamento } from '@plantao/contracts'
import { Elysia } from 'elysia'
import type { CasosDeUso } from '../../composicao/casos-de-uso'
import { administracao } from '../admin'
import { apresentarAparelho, iso } from '../apresentacao'
import { falha } from '../resposta'

export const rotasDePareamento = (casos: CasosDeUso, tokenDeAdmin: string) =>
  new Elysia()
    .use(administracao(tokenDeAdmin))
    .post(
      '/admin/pareamentos',
      async ({ body, status }) => {
        const pareamento = await casos.iniciarPareamento(body.papel)
        if (!pareamento.ok) return falha(status, pareamento.erro)
        return status(201, {
          codigo: pareamento.valor.codigo,
          papel: pareamento.valor.papel,
          expiraEm: iso(pareamento.valor.expiraEm),
        })
      },
      { administrador: true, body: PedidoDePareamento },
    )
    .post(
      '/pareamentos/concluir',
      async ({ body, status }) => {
        const pareado = await casos.concluirPareamento(body)
        if (!pareado.ok) return falha(status, pareado.erro)
        return status(201, {
          aparelho: apresentarAparelho(pareado.valor.aparelho),
          token: pareado.valor.token,
        })
      },
      { body: PedidoDeConclusao },
    )
