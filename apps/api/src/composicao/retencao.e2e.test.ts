import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { instante, MILISSEGUNDOS_POR_DIA } from '@plantao/domain'
import { type ApiDeTeste, subirApiDeTeste } from './ambiente-de-teste'

const contar = async (api: ApiDeTeste, tabela: string) => {
  const [linha] = await api.sql<
    { total: string }[]
  >`select count(*) as total from ${api.sql(tabela)}`
  return Number(linha?.total ?? 0)
}

describe('retenção de dados contra o Postgres real', () => {
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

  test('apaga hashes, avisos e códigos com mais de 7 dias e mantém o resto', async () => {
    const empresa = await api.parear('empresa', 'Empresa')
    const pessoal = await api.parear('pessoal', 'Lucas')
    await api.chamar('/plantao', {
      method: 'POST',
      token: pessoal.token,
      body: JSON.stringify({ comando: 'sai' }),
    })
    const enviar = (hora: number) =>
      api.chamar('/eventos', {
        method: 'POST',
        token: empresa.token,
        body: JSON.stringify({
          conversa: 'Ana',
          mensagens: [{ remetente: 'Ana', texto: 'oi', hora }],
        }),
      })
    await enviar(1)
    expect([await contar(api, 'mensagens_vistas'), await contar(api, 'avisos')]).toEqual([1, 1])

    api.em(instante(api.agora() + 6 * MILISSEGUNDOS_POR_DIA))
    expect(await api.casosDeUso.limparDadosAntigos()).toEqual({
      mensagens: 0,
      avisos: 0,
      pareamentos: 0,
    })
    await enviar(2)
    expect([await contar(api, 'mensagens_vistas'), await contar(api, 'avisos')]).toEqual([2, 2])

    api.em(instante(api.agora() + 2 * MILISSEGUNDOS_POR_DIA))
    const resumo = await api.casosDeUso.limparDadosAntigos()
    expect(resumo.mensagens).toBe(1)
    expect(resumo.avisos).toBe(1)
    expect([await contar(api, 'mensagens_vistas'), await contar(api, 'avisos')]).toEqual([1, 1])
    expect(await contar(api, 'aparelhos')).toBe(2)
  })
})
