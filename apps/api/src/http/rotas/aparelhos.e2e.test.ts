import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { type ApiDeTeste, subirApiDeTeste } from '../../composicao/ambiente-de-teste'

describe('aparelhos contra servidor e banco reais', () => {
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

  test('GET /aparelhos/eu devolve o aparelho do token e nada que permita roubar o token', async () => {
    const lucas = await api.parear('pessoal', 'Lucas')
    const resposta = await api.chamar('/aparelhos/eu', { token: lucas.token })
    expect(resposta.status).toBe(200)
    const corpo = await resposta.json()
    expect(corpo).toMatchObject({ id: lucas.id, papel: 'pessoal', nome: 'Lucas' })
    expect(Object.keys(corpo as object).sort()).toEqual(['criadoEm', 'id', 'nome', 'papel'])
  })

  test('sem token, com token inventado ou com esquema errado é 401', async () => {
    const respostas = await Promise.all([
      api.chamar('/aparelhos/eu'),
      api.chamar('/aparelhos/eu', { token: 'inventado' }),
      api.chamar('/aparelhos/eu', { headers: { authorization: 'Basic abc' } }),
    ])
    expect(respostas.map((r) => r.status)).toEqual([401, 401, 401])
    expect(await respostas[1]?.json()).toMatchObject({ erro: { codigo: 'aparelho-invalido' } })
  })

  test('GET /admin/aparelhos lista os pareados e exige a senha de administrador', async () => {
    await api.parear('empresa', 'Celular da empresa')
    await api.parear('pessoal', 'Lucas')
    expect((await api.chamar('/admin/aparelhos')).status).toBe(401)
    const lista = await api.chamar('/admin/aparelhos', { admin: true })
    expect(lista.status).toBe(200)
    const { itens } = (await lista.json()) as { itens: { nome: string; papel: string }[] }
    expect(itens.map((i) => `${i.papel}:${i.nome}`).sort()).toEqual([
      'empresa:Celular da empresa',
      'pessoal:Lucas',
    ])
  })

  test('DELETE /admin/aparelhos/:id revoga: o token deixa de valer e tudo do aparelho some', async () => {
    const empresa = await api.parear('empresa', 'Celular da empresa')
    expect((await api.chamar(`/admin/aparelhos/${empresa.id}`, { method: 'DELETE' })).status).toBe(
      401,
    )
    const revogado = await api.chamar(`/admin/aparelhos/${empresa.id}`, {
      method: 'DELETE',
      admin: true,
    })
    expect(revogado.status).toBe(204)
    expect((await api.chamar('/aparelhos/eu', { token: empresa.token })).status).toBe(401)
    const repetido = await api.chamar(`/admin/aparelhos/${empresa.id}`, {
      method: 'DELETE',
      admin: true,
    })
    expect(repetido.status).toBe(404)
    expect(await repetido.json()).toMatchObject({ erro: { codigo: 'aparelho-nao-encontrado' } })
  })

  test('id que não é UUID também é 404, sem chegar ao banco', async () => {
    const resposta = await api.chamar("/admin/aparelhos/1'%20or%20'1'='1", {
      method: 'DELETE',
      admin: true,
    })
    expect(resposta.status).toBe(404)
  })
})
