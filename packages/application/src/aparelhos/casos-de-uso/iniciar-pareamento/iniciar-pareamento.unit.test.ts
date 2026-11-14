import { describe, expect, test } from 'bun:test'
import { montarAparelhos } from '../../fakes'
import { iniciarPareamento } from './iniciar-pareamento.use-case'

describe('iniciarPareamento', () => {
  test('cria um código para o papel pedido, válido por 10 minutos', async () => {
    const deps = montarAparelhos(['482913'])
    const resultado = await iniciarPareamento(deps)('empresa')
    if (!resultado.ok) return expect.unreachable()
    expect(resultado.valor.codigo).toBe('482913')
    expect(resultado.valor.papel).toBe('empresa')
    expect(resultado.valor.expiraEm - resultado.valor.criadoEm).toBe(10 * 60_000)
    expect(deps.codigos.has('482913')).toBe(true)
  })

  test('papel desconhecido é recusado e nenhum código é guardado', async () => {
    const deps = montarAparelhos()
    expect(await iniciarPareamento(deps)('chefe')).toEqual({ ok: false, erro: 'papel-invalido' })
    expect(deps.codigos.size).toBe(0)
  })

  test('se o código sorteado já está em uso, sorteia outro', async () => {
    const deps = montarAparelhos(['111111', '111111', '222222'])
    await iniciarPareamento(deps)('empresa')
    const segundo = await iniciarPareamento(deps)('pessoal')
    if (!segundo.ok) return expect.unreachable()
    expect(segundo.valor.codigo).toBe('222222')
  })

  test('um código vencido pode ser sorteado de novo', async () => {
    const deps = montarAparelhos(['111111', '111111'])
    await iniciarPareamento(deps)('empresa')
    deps.relogio.avancar(10 * 60_000)
    const resultado = await iniciarPareamento(deps)('pessoal')
    expect(resultado.ok).toBe(true)
  })

  test('sem código livre depois de várias tentativas, devolve codigo-indisponivel', async () => {
    const deps = montarAparelhos()
    deps.recusarTodosOsCodigos()
    expect(await iniciarPareamento(deps)('pessoal')).toEqual({
      ok: false,
      erro: 'codigo-indisponivel',
    })
  })
})
