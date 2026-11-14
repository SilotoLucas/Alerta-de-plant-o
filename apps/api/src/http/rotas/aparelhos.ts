import { ParametroDeAparelho, RespostaDeAparelho, RespostaDeAparelhos } from '@plantao/contracts'
import { Elysia } from 'elysia'
import type { CasosDeUso } from '../../composicao/casos-de-uso'
import { administracao } from '../admin'
import { autenticacaoDeAparelho } from '../aparelho'
import { apresentarAparelho } from '../apresentacao'
import { falha } from '../resposta'

export const rotasDeAparelhos = (casos: CasosDeUso, tokenDeAdmin: string) =>
  new Elysia()
    .use(autenticacaoDeAparelho(casos))
    .use(administracao(tokenDeAdmin))
    .get('/aparelhos/eu', ({ aparelho }) => apresentarAparelho(aparelho), {
      autenticado: true,
      response: RespostaDeAparelho,
    })
    .get(
      '/admin/aparelhos',
      async () => ({ itens: (await casos.listarAparelhos()).map(apresentarAparelho) }),
      { administrador: true, response: RespostaDeAparelhos },
    )
    .delete(
      '/admin/aparelhos/:id',
      async ({ params, status }) => {
        const revogado = await casos.revogarAparelho(params.id)
        if (!revogado.ok) return falha(status, revogado.erro)
        return status(204)
      },
      { administrador: true, params: ParametroDeAparelho },
    )
