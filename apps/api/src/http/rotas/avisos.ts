import type { AvisoRegistrado } from '@plantao/application'
import { ParametroDeAviso } from '@plantao/contracts'
import { Elysia } from 'elysia'
import type { CasosDeUso } from '../../composicao/casos-de-uso'
import { autenticacaoDeAparelho } from '../aparelho'
import { apresentarAviso } from '../apresentacao'
import { falha } from '../resposta'

const INTERVALO_DO_BATIMENTO_MS = 20_000

const CABECALHOS_DO_FLUXO = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  'x-accel-buffering': 'no',
}

const quadro = (aviso: AvisoRegistrado): string =>
  `id: ${aviso.id}\nevent: aviso\ndata: ${JSON.stringify(apresentarAviso(aviso))}\n\n`

export const rotasDeAvisos = (casos: CasosDeUso) =>
  new Elysia()
    .use(autenticacaoDeAparelho(casos))
    .get(
      '/avisos/fluxo',
      async ({ aparelho, headers, request, server, status }) => {
        server?.timeout(request, 0)
        const codificador = new TextEncoder()
        const enviados = new Set<string>()
        const fila: AvisoRegistrado[] = []
        let controle: ReadableStreamDefaultController<Uint8Array> | null = null
        let encerrado = false
        const escrever = (texto: string) => {
          if (controle !== null && !encerrado) controle.enqueue(codificador.encode(texto))
        }
        const enviar = (aviso: AvisoRegistrado) => {
          if (controle === null) {
            fila.push(aviso)
            return
          }
          if (enviados.has(aviso.id)) return
          enviados.add(aviso.id)
          escrever(quadro(aviso))
        }
        const assinatura = await casos.assinarAvisos(
          aparelho,
          headers['last-event-id'] ?? null,
          enviar,
        )
        if (!assinatura.ok) return falha(status, assinatura.erro)
        let batimento: ReturnType<typeof setInterval> | null = null
        const fluxo = new ReadableStream<Uint8Array>({
          start: (novoControle) => {
            controle = novoControle
            escrever(': conectado\n\n')
            for (const aviso of [...assinatura.valor.pendentes, ...fila]) enviar(aviso)
            batimento = setInterval(() => escrever(': \n\n'), INTERVALO_DO_BATIMENTO_MS)
          },
          cancel: () => {
            encerrado = true
            if (batimento !== null) clearInterval(batimento)
            assinatura.valor.cancelar()
          },
        })
        return new Response(fluxo, { headers: CABECALHOS_DO_FLUXO })
      },
      { autenticado: true },
    )
    .post(
      '/avisos/:id/visto',
      async ({ aparelho, params, status }) => {
        const visto = await casos.confirmarVisto(aparelho, params.id)
        if (!visto.ok) return falha(status, visto.erro)
        return status(204)
      },
      { autenticado: true, params: ParametroDeAviso },
    )
