import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { type ApiDeTeste, subirApiDeTeste } from '../../composicao/ambiente-de-teste'

describe('plantão ligado e desligado contra servidor e banco reais', () => {
  let api: ApiDeTeste

  beforeAll(async () => {
    api = await subirApiDeTeste()
  })

  beforeEach(async () => {
    await api.limpar()
  })

  afterAll(async () => {
    await api.encerrar()
  })

  const comando = (token: string, texto: string) =>
    api.chamar('/plantao', { method: 'POST', token, body: JSON.stringify({ comando: texto }) })

  test('GET /plantao começa desligado; "sai" liga, "voltei" desliga, e o estado persiste no banco', async () => {
    const lucas = await api.parear('pessoal', 'Lucas')
    expect(await (await api.chamar('/plantao', { token: lucas.token })).json()).toEqual({
      ativo: false,
      alteradoEm: null,
    })
    const ligado = await comando(lucas.token, 'sai')
    expect(ligado.status).toBe(200)
    expect(await ligado.json()).toEqual({
      ativo: true,
      alteradoEm: new Date(api.agora()).toISOString(),
    })
    expect([
      ...(await api.sql`select plantao_ativo from aparelhos where id = ${lucas.id}`),
    ]).toEqual([{ plantao_ativo: true }])
    expect(await (await api.chamar('/plantao', { token: lucas.token })).json()).toMatchObject({
      ativo: true,
    })
    expect(await (await comando(lucas.token, 'Voltei')).json()).toMatchObject({ ativo: false })
  })

  test('cada pessoa tem o seu plantão: ligar o de uma não liga o de outra', async () => {
    const lucas = await api.parear('pessoal', 'Lucas')
    const marina = await api.parear('pessoal', 'Marina')
    await comando(lucas.token, 'sai')
    expect(await (await api.chamar('/plantao', { token: marina.token })).json()).toMatchObject({
      ativo: false,
    })
  })

  test('comando desconhecido é 422 e comando sem corpo válido é 400', async () => {
    const lucas = await api.parear('pessoal', 'Lucas')
    const desconhecido = await comando(lucas.token, 'bom dia')
    expect(desconhecido.status).toBe(422)
    expect(await desconhecido.json()).toMatchObject({ erro: { codigo: 'comando-invalido' } })
    const semCorpo = await api.chamar('/plantao', {
      method: 'POST',
      token: lucas.token,
      body: JSON.stringify({}),
    })
    expect(semCorpo.status).toBe(400)
  })

  test('sem token é 401; o celular da empresa não tem plantão e recebe 404', async () => {
    expect((await api.chamar('/plantao')).status).toBe(401)
    expect((await comando('inventado', 'sai')).status).toBe(401)
    const empresa = await api.parear('empresa', 'Celular da empresa')
    const resposta = await api.chamar('/plantao', { token: empresa.token })
    expect(resposta.status).toBe(404)
    expect(await resposta.json()).toMatchObject({ erro: { codigo: 'papel-incorreto' } })
    expect((await comando(empresa.token, 'sai')).status).toBe(404)
  })
})
