import { type Instante, instante } from '@plantao/domain'
import { prepararBancoDeTeste } from '@plantao/infra'
import { criarApp } from '../http/app'
import type { ConfiguracaoDosLimites } from '../http/limite'
import { montarCasosDeUso } from './casos-de-uso'
import { lerConfiguracao } from './configuracao'

const BANCO_DE_TESTE = 'postgres://plantao:plantao@localhost:5435/plantao_teste'

const TOKEN_DE_ADMIN_DE_TESTE = 'token-de-admin-de-teste'

const MEIO_DIA = instante(Date.UTC(2026, 10, 16, 15, 0))

const SEM_LIMITE: ConfiguracaoDosLimites = {
  geralPorMinuto: 100_000,
  pareamentoPorMinuto: 100_000,
  confiarNoProxy: false,
}

export type OpcoesDaApiDeTeste = {
  readonly limites?: ConfiguracaoDosLimites
  readonly enviarTexto?: boolean
}

export const subirApiDeTeste = async (opcoes: OpcoesDaApiDeTeste = {}) => {
  const configuracao = lerConfiguracao({
    PLANTAO_ADMIN_TOKEN: TOKEN_DE_ADMIN_DE_TESTE,
    PLANTAO_ENVIAR_TEXTO: String(opcoes.enviarTexto ?? false),
  })
  if (!configuracao.ok) throw new Error(configuracao.erro.join('; '))
  const banco = await prepararBancoDeTeste(process.env['DATABASE_URL_TESTE'] ?? BANCO_DE_TESTE)
  const relogio = { atual: MEIO_DIA }
  const relogioDeTeste = { agora: (): Instante => relogio.atual }
  const config = configuracao.valor
  const casosDeUso = montarCasosDeUso(banco.sql, relogioDeTeste, config)
  const app = criarApp(
    casosDeUso,
    config.tokenDeAdmin,
    opcoes.limites ?? SEM_LIMITE,
    relogioDeTeste.agora,
  ).listen(0)
  const baseUrl = `http://localhost:${app.server?.port}`
  const chamar = (
    caminho: string,
    inicio: RequestInit & { token?: string; admin?: boolean } = {},
  ) => {
    const { token, admin, headers, ...resto } = inicio
    return fetch(`${baseUrl}${caminho}`, {
      ...resto,
      headers: {
        ...(resto.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
        ...(admin === true ? { 'x-admin-token': TOKEN_DE_ADMIN_DE_TESTE } : {}),
        ...headers,
      },
    })
  }
  const parear = async (papel: 'empresa' | 'pessoal', nome: string) => {
    const codigo = (await (
      await chamar('/admin/pareamentos', {
        method: 'POST',
        admin: true,
        body: JSON.stringify({ papel }),
      })
    ).json()) as { codigo: string }
    const pareado = (await (
      await chamar('/pareamentos/concluir', {
        method: 'POST',
        body: JSON.stringify({ codigo: codigo.codigo, nome }),
      })
    ).json()) as { token: string; aparelho: { id: string } }
    return { token: pareado.token, id: pareado.aparelho.id }
  }
  return {
    baseUrl,
    casosDeUso,
    sql: banco.sql,
    chamar,
    parear,
    em: (momento: Instante) => {
      relogio.atual = momento
    },
    agora: () => relogio.atual,
    limpar: banco.limpar,
    encerrar: async () => {
      await app.stop(true)
      await banco.encerrar()
    },
  }
}

export type ApiDeTeste = Awaited<ReturnType<typeof subirApiDeTeste>>
