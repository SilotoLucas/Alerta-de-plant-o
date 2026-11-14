import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { type ApiDeTeste, subirApiDeTeste } from '../../composicao/ambiente-de-teste'

describe('GET /health contra o servidor HTTP real', () => {
  let api: ApiDeTeste

  beforeAll(async () => {
    api = await subirApiDeTeste()
  })

  afterAll(async () => {
    await api.encerrar()
  })

  test('responde 200 com status ok pela rede', async () => {
    const resposta = await api.chamar('/health')
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ status: 'ok' })
  })

  test('rota que não existe é 404 com o envelope de erro', async () => {
    const resposta = await api.chamar('/nao-existe')
    expect(resposta.status).toBe(404)
    expect(await resposta.json()).toEqual({
      erro: { codigo: 'rota-inexistente', mensagem: 'Rota inexistente.' },
    })
  })

  test('corpo que não é JSON válido é 400 com o envelope de erro, sem vazar detalhe interno', async () => {
    const resposta = await api.chamar('/pareamentos/concluir', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{quebrado',
    })
    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({
      erro: { codigo: 'pedido-invalido', mensagem: 'Dados enviados em formato inválido.' },
    })
  })
})
