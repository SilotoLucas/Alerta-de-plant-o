import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { type ApiDeTeste, subirApiDeTeste } from '../../composicao/ambiente-de-teste'

describe('pareamento por código contra servidor e banco reais', () => {
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

  const pedirCodigo = (papel: string) =>
    api.chamar('/admin/pareamentos', {
      method: 'POST',
      admin: true,
      body: JSON.stringify({ papel }),
    })

  const concluir = (codigo: string, nome = 'Celular da empresa') =>
    api.chamar('/pareamentos/concluir', { method: 'POST', body: JSON.stringify({ codigo, nome }) })

  test('POST /admin/pareamentos sem a senha de administrador é 401 e não cria código', async () => {
    const semSenha = await api.chamar('/admin/pareamentos', {
      method: 'POST',
      body: JSON.stringify({ papel: 'empresa' }),
    })
    const senhaErrada = await api.chamar('/admin/pareamentos', {
      method: 'POST',
      headers: { 'x-admin-token': 'chute' },
      body: JSON.stringify({ papel: 'empresa' }),
    })
    expect([semSenha.status, senhaErrada.status]).toEqual([401, 401])
    expect(await semSenha.json()).toMatchObject({ erro: { codigo: 'admin-invalido' } })
    expect([...(await api.sql`select count(*)::int as n from pareamentos`)]).toEqual([{ n: 0 }])
  })

  test('o código de 6 dígitos vale 10 minutos e troca por um aparelho com token', async () => {
    const criado = await pedirCodigo('empresa')
    expect(criado.status).toBe(201)
    const corpo = (await criado.json()) as { codigo: string; papel: string; expiraEm: string }
    expect(corpo.codigo).toMatch(/^\d{6}$/)
    expect(corpo.papel).toBe('empresa')
    expect(Date.parse(corpo.expiraEm) - api.agora()).toBe(10 * 60_000)

    const pareado = await concluir(`${corpo.codigo.slice(0, 3)} ${corpo.codigo.slice(3)}`)
    expect(pareado.status).toBe(201)
    const aparelho = (await pareado.json()) as {
      token: string
      aparelho: { id: string; papel: string; nome: string }
    }
    expect(aparelho.aparelho).toMatchObject({ papel: 'empresa', nome: 'Celular da empresa' })
    expect(aparelho.token.length).toBeGreaterThanOrEqual(40)
    const [guardado] = await api.sql<{ token_hash: string }[]>`select token_hash from aparelhos`
    expect(guardado?.token_hash).not.toContain(aparelho.token)
  })

  test('o código só vale uma vez', async () => {
    const { codigo } = (await (await pedirCodigo('pessoal')).json()) as { codigo: string }
    expect((await concluir(codigo, 'Lucas')).status).toBe(201)
    const segunda = await concluir(codigo, 'Outro')
    expect(segunda.status).toBe(422)
    expect(await segunda.json()).toMatchObject({ erro: { codigo: 'codigo-invalido' } })
    expect([...(await api.sql`select count(*)::int as n from aparelhos`)]).toEqual([{ n: 1 }])
  })

  test('código vencido é recusado', async () => {
    const { codigo } = (await (await pedirCodigo('pessoal')).json()) as { codigo: string }
    const antes = api.agora()
    api.em((antes + 10 * 60_000) as typeof antes)
    const resposta = await concluir(codigo, 'Lucas')
    api.em(antes)
    expect(resposta.status).toBe(422)
  })

  test('papel fora do contrato (inclusive um desconhecido) é 400 e não cria código', async () => {
    expect((await pedirCodigo('chefe')).status).toBe(400)
    const semPapel = await api.chamar('/admin/pareamentos', {
      method: 'POST',
      admin: true,
      body: JSON.stringify({}),
    })
    expect(semPapel.status).toBe(400)
    expect([...(await api.sql`select count(*)::int as n from pareamentos`)]).toEqual([{ n: 0 }])
  })

  test('nome inválido é 422 e não gasta o código', async () => {
    const { codigo } = (await (await pedirCodigo('pessoal')).json()) as { codigo: string }
    expect((await concluir(codigo, ' ')).status).toBe(422)
    expect((await concluir(codigo, 'Lucas')).status).toBe(201)
  })
})
