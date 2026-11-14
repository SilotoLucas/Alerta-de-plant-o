import {
  type Instante,
  type JanelaDeTaxa,
  janelaVencida,
  registrarRequisicao,
} from '@plantao/domain'
import { Elysia } from 'elysia'

export type ConfiguracaoDosLimites = {
  readonly geralPorMinuto: number
  readonly pareamentoPorMinuto: number
  readonly confiarNoProxy: boolean
}

const ROTAS_DE_PAREAMENTO = new Set(['POST /pareamentos/concluir'])

const LIMPEZA_ACIMA_DE = 10_000

const MUITAS_REQUISICOES = {
  erro: {
    codigo: 'muitas-requisicoes',
    mensagem: 'Muitas requisições em pouco tempo. Espere um pouco e tente de novo.',
  },
}

const ipDoCliente = (
  request: Request,
  direto: string | undefined,
  confiarNoProxy: boolean,
): string => {
  const encaminhado = request.headers.get('x-forwarded-for')
  if (confiarNoProxy && encaminhado)
    return encaminhado.split(',').at(-1)?.trim() || direto || 'desconhecido'
  return direto ?? 'desconhecido'
}

export const limiteDeTaxa = (config: ConfiguracaoDosLimites, agora: () => Instante) => {
  const janelas = new Map<string, JanelaDeTaxa>()
  const limpar = (momento: Instante) => {
    if (janelas.size < LIMPEZA_ACIMA_DE) return
    for (const [chave, janela] of janelas) if (janelaVencida(janela, momento)) janelas.delete(chave)
  }
  const contar = (chave: string, maximo: number, momento: Instante) => {
    const decisao = registrarRequisicao(janelas.get(chave), momento, maximo)
    janelas.set(chave, decisao.janela)
    return decisao
  }
  return new Elysia({ name: 'limite-de-taxa' }).onRequest(({ request, server, set }) => {
    const momento = agora()
    limpar(momento)
    const ip = ipDoCliente(request, server?.requestIP(request)?.address, config.confiarNoProxy)
    const rota = `${request.method} ${new URL(request.url).pathname}`
    const decisoes = [contar(`geral:${ip}`, config.geralPorMinuto, momento)]
    if (ROTAS_DE_PAREAMENTO.has(rota))
      decisoes.push(contar(`pareamento:${ip}`, config.pareamentoPorMinuto, momento))
    const recusada = decisoes.find((decisao) => !decisao.permitido)
    if (!recusada) return
    set.status = 429
    set.headers['retry-after'] = String(recusada.esperaSegundos)
    return MUITAS_REQUISICOES
  })
}
