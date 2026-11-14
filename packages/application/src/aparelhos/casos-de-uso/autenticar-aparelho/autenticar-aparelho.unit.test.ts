import { describe, expect, test } from 'bun:test'
import { montarAparelhos } from '../../fakes'
import { concluirPareamento } from '../concluir-pareamento/concluir-pareamento.use-case'
import { iniciarPareamento } from '../iniciar-pareamento/iniciar-pareamento.use-case'
import { autenticarAparelho } from './autenticar-aparelho.use-case'

describe('autenticarAparelho', () => {
  test('o token entregue no pareamento devolve o aparelho', async () => {
    const deps = montarAparelhos(['123456'])
    await iniciarPareamento(deps)('pessoal')
    const pareado = await concluirPareamento(deps)({ codigo: '123456', nome: 'Lucas' })
    if (!pareado.ok) return expect.unreachable()
    const resultado = await autenticarAparelho(deps)(pareado.valor.token)
    expect(resultado).toEqual({ ok: true, valor: pareado.valor.aparelho })
  })

  test('token desconhecido ou vazio é recusado', async () => {
    const deps = montarAparelhos()
    expect(await autenticarAparelho(deps)('inventado')).toEqual({
      ok: false,
      erro: 'aparelho-invalido',
    })
    expect(await autenticarAparelho(deps)('')).toEqual({ ok: false, erro: 'aparelho-invalido' })
  })
})
