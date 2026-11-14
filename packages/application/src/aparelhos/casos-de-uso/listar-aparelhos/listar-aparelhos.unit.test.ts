import { describe, expect, test } from 'bun:test'
import { montarAparelhos } from '../../fakes'
import { concluirPareamento } from '../concluir-pareamento/concluir-pareamento.use-case'
import { iniciarPareamento } from '../iniciar-pareamento/iniciar-pareamento.use-case'
import { listarAparelhos } from './listar-aparelhos.use-case'

describe('listarAparelhos', () => {
  test('lista vazia antes do primeiro pareamento', async () => {
    expect(await listarAparelhos(montarAparelhos())()).toEqual([])
  })

  test('lista os aparelhos pareados, sem token nem hash', async () => {
    const deps = montarAparelhos(['123456'])
    await iniciarPareamento(deps)('empresa')
    await concluirPareamento(deps)({ codigo: '123456', nome: 'Celular da empresa' })
    const lista = await listarAparelhos(deps)()
    expect(lista.map((aparelho) => aparelho.nome)).toEqual(['Celular da empresa'])
    expect(Object.keys(lista[0] ?? {}).sort()).toEqual(['criadoEm', 'id', 'nome', 'papel'])
  })
})
