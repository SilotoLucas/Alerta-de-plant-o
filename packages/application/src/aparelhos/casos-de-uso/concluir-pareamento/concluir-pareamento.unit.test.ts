import { describe, expect, test } from 'bun:test'
import { montarAparelhos } from '../../fakes'
import { iniciarPareamento } from '../iniciar-pareamento/iniciar-pareamento.use-case'
import { concluirPareamento } from './concluir-pareamento.use-case'

const parear = async (papel = 'pessoal') => {
  const deps = montarAparelhos(['123456'])
  await iniciarPareamento(deps)(papel)
  return deps
}

describe('concluirPareamento', () => {
  test('troca o código por um aparelho e um token, e guarda só o hash do token', async () => {
    const deps = await parear('empresa')
    const resultado = await concluirPareamento(deps)({
      codigo: '123 456',
      nome: ' Celular da empresa ',
    })
    if (!resultado.ok) return expect.unreachable()
    expect(resultado.valor.token).toBe('token-1')
    expect(resultado.valor.aparelho).toMatchObject({ papel: 'empresa', nome: 'Celular da empresa' })
    expect([...deps.porHash.keys()]).toEqual(['h(token-1)'])
  })

  test('o código só vale uma vez: a segunda tentativa não cria outro aparelho', async () => {
    const deps = await parear()
    await concluirPareamento(deps)({ codigo: '123456', nome: 'Lucas' })
    expect(await concluirPareamento(deps)({ codigo: '123456', nome: 'Outro' })).toEqual({
      ok: false,
      erro: 'codigo-invalido',
    })
    expect(deps.porHash.size).toBe(1)
  })

  test('código vencido é recusado, igual a código que nunca existiu', async () => {
    const deps = await parear()
    deps.relogio.avancar(10 * 60_000)
    expect(await concluirPareamento(deps)({ codigo: '123456', nome: 'Lucas' })).toEqual({
      ok: false,
      erro: 'codigo-invalido',
    })
    expect(await concluirPareamento(deps)({ codigo: '999999', nome: 'Lucas' })).toEqual({
      ok: false,
      erro: 'codigo-invalido',
    })
  })

  test('código mal formado é recusado sem consultar nada', async () => {
    const deps = await parear()
    expect(await concluirPareamento(deps)({ codigo: '12', nome: 'Lucas' })).toEqual({
      ok: false,
      erro: 'codigo-invalido',
    })
    expect(deps.codigos.size).toBe(1)
  })

  test('nome inválido não gasta o código', async () => {
    const deps = await parear()
    expect(await concluirPareamento(deps)({ codigo: '123456', nome: ' ' })).toEqual({
      ok: false,
      erro: 'nome-invalido',
    })
    expect(deps.codigos.has('123456')).toBe(true)
  })
})
