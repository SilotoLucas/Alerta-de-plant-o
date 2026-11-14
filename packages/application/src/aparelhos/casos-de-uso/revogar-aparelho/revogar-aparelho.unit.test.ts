import { describe, expect, test } from 'bun:test'
import { montarAparelhos } from '../../fakes'
import { autenticarAparelho } from '../autenticar-aparelho/autenticar-aparelho.use-case'
import { concluirPareamento } from '../concluir-pareamento/concluir-pareamento.use-case'
import { iniciarPareamento } from '../iniciar-pareamento/iniciar-pareamento.use-case'
import { revogarAparelho } from './revogar-aparelho.use-case'

describe('revogarAparelho', () => {
  test('depois de revogado, o token do aparelho deixa de valer', async () => {
    const deps = montarAparelhos(['123456'])
    await iniciarPareamento(deps)('empresa')
    const pareado = await concluirPareamento(deps)({ codigo: '123456', nome: 'Celular da empresa' })
    if (!pareado.ok) return expect.unreachable()
    expect(await revogarAparelho(deps)(pareado.valor.aparelho.id)).toEqual({
      ok: true,
      valor: undefined,
    })
    expect((await autenticarAparelho(deps)(pareado.valor.token)).ok).toBe(false)
  })

  test('id que não existe ou que nem é UUID dá aparelho-nao-encontrado', async () => {
    const deps = montarAparelhos()
    const esperado = { ok: false, erro: 'aparelho-nao-encontrado' } as const
    expect(await revogarAparelho(deps)('0192f1e2-0000-7000-8000-000000000099')).toEqual(esperado)
    expect(await revogarAparelho(deps)('abc')).toEqual(esperado)
  })
})
