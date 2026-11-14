import { Elysia } from 'elysia'
import type { CasosDeUso } from '../composicao/casos-de-uso'
import { corpoDeErro } from './error-map'

const tokenDoCabecalho = (autorizacao: string | undefined): string | null => {
  const [esquema, token] = (autorizacao ?? '').split(' ')
  return esquema === 'Bearer' && token ? token : null
}

export const autenticacaoDeAparelho = (casos: CasosDeUso) =>
  new Elysia({ name: 'autenticacao-de-aparelho' }).macro({
    autenticado: {
      resolve: async ({ headers, status }) => {
        const token = tokenDoCabecalho(headers['authorization'])
        if (token === null) return status(401, corpoDeErro('aparelho-invalido'))
        const aparelho = await casos.autenticarAparelho(token)
        if (!aparelho.ok) return status(401, corpoDeErro(aparelho.erro))
        return { aparelho: aparelho.valor }
      },
    },
  })
