import { expect, test } from 'bun:test'
import { lerAparelhoId, validarNomeDoAparelho, validarPapel } from './aparelho'

test('papel só aceita empresa ou pessoal, exatamente assim', () => {
  expect(validarPapel('empresa')).toEqual({ ok: true, valor: 'empresa' })
  expect(validarPapel('pessoal')).toEqual({ ok: true, valor: 'pessoal' })
  expect(validarPapel('Empresa')).toEqual({ ok: false, erro: 'papel-invalido' })
  expect(validarPapel('')).toEqual({ ok: false, erro: 'papel-invalido' })
})

test('nome do aparelho perde espaços das pontas e repetidos, e exige de 2 a 40 caracteres', () => {
  expect(validarNomeDoAparelho('  Celular   da empresa ')).toEqual({
    ok: true,
    valor: 'Celular da empresa',
  })
  expect(validarNomeDoAparelho(' a ')).toEqual({ ok: false, erro: 'nome-invalido' })
  expect(validarNomeDoAparelho('x'.repeat(40)).ok).toBe(true)
  expect(validarNomeDoAparelho('x'.repeat(41))).toEqual({ ok: false, erro: 'nome-invalido' })
})

test('lê o id do aparelho só se for UUID', () => {
  expect(lerAparelhoId('0192f1e2-0000-7000-8000-000000000001')).toBe(
    '0192f1e2-0000-7000-8000-000000000001' as ReturnType<typeof lerAparelhoId>,
  )
  expect(lerAparelhoId('nao-e-uuid')).toBeNull()
})
