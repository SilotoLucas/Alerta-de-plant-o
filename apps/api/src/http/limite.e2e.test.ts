import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { type ApiDeTeste, subirApiDeTeste } from '../composicao/ambiente-de-teste'

describe('limite de requisições por IP contra servidor real', () => {
  let api: ApiDeTeste

  beforeAll(async () => {
    api = await subirApiDeTeste({
      limites: { geralPorMinuto: 6, pareamentoPorMinuto: 2, confiarNoProxy: true },
    })
  })

  afterAll(async () => {
    await api.encerrar()
  })

  const tentar = (ip: string) =>
    api.chamar('/pareamentos/concluir', {
      method: 'POST',
      headers: { 'x-forwarded-for': `1.1.1.1, ${ip}` },
      body: JSON.stringify({ codigo: '000000', nome: 'Lucas' }),
    })

  test('adivinhar código de pareamento para na terceira tentativa do mesmo IP, com Retry-After; outro IP segue', async () => {
    expect((await tentar('9.9.9.1')).status).toBe(422)
    expect((await tentar('9.9.9.1')).status).toBe(422)
    const recusada = await tentar('9.9.9.1')
    expect(recusada.status).toBe(429)
    expect(Number(recusada.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(await recusada.json()).toMatchObject({ erro: { codigo: 'muitas-requisicoes' } })
    expect((await tentar('9.9.9.2')).status).toBe(422)
  })

  test('o limite geral vale para qualquer rota', async () => {
    const respostas: number[] = []
    for (let i = 0; i < 7; i += 1)
      respostas.push(
        (await api.chamar('/health', { headers: { 'x-forwarded-for': '8.8.8.8' } })).status,
      )
    expect(respostas).toEqual([200, 200, 200, 200, 200, 200, 429])
  })
})
