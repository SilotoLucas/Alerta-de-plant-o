import type { Instante } from '@plantao/domain'
import { Elysia } from 'elysia'
import type { CasosDeUso } from '../composicao/casos-de-uso'
import { ROTA_INEXISTENTE } from './error-map'
import { type ConfiguracaoDosLimites, limiteDeTaxa } from './limite'
import { rotasDeAparelhos } from './rotas/aparelhos'
import { rotasDeAvisos } from './rotas/avisos'
import { rotasDeEventos } from './rotas/eventos'
import { rotasDePareamento } from './rotas/pareamentos'
import { rotasDoPlantao } from './rotas/plantao'
import { rotasDeSaude } from './rotas/saude'

const ERRO_INTERNO = {
  erro: { codigo: 'erro-interno', mensagem: 'Algo deu errado. Tente de novo.' },
}
const PEDIDO_INVALIDO = {
  erro: { codigo: 'pedido-invalido', mensagem: 'Dados enviados em formato inválido.' },
}

export const criarApp = (
  casos: CasosDeUso,
  tokenDeAdmin: string,
  limites: ConfiguracaoDosLimites,
  agora: () => Instante,
) =>
  new Elysia()
    .use(limiteDeTaxa(limites, agora))
    .onError(({ code, error, status }) => {
      if (code === 'VALIDATION' || code === 'PARSE') return status(400, PEDIDO_INVALIDO)
      if (code === 'NOT_FOUND') return status(404, ROTA_INEXISTENTE)
      process.stderr.write(`erro interno: ${error instanceof Error ? error.name : code}\n`)
      return status(500, ERRO_INTERNO)
    })
    .use(rotasDeSaude)
    .use(rotasDePareamento(casos, tokenDeAdmin))
    .use(rotasDeAparelhos(casos, tokenDeAdmin))
    .use(rotasDeEventos(casos))
    .use(rotasDeAvisos(casos))
    .use(rotasDoPlantao(casos))
