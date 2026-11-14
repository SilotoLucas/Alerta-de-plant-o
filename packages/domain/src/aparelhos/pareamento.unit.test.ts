import { expect, test } from 'bun:test'
import { instante } from '../compartilhado'
import { criarPareamento, normalizarCodigo } from './pareamento'

test('o código vale 10 minutos a partir da criação', () => {
  const pareamento = criarPareamento('123456', 'pessoal', instante(1_000))
  expect(pareamento).toEqual({
    codigo: '123456',
    papel: 'pessoal',
    criadoEm: instante(1_000),
    expiraEm: instante(1_000 + 10 * 60_000),
  })
})

test('o código digitado aceita espaço e hífen no meio e recusa o que não for 6 dígitos', () => {
  expect(normalizarCodigo('123 456')).toEqual({ ok: true, valor: '123456' })
  expect(normalizarCodigo(' 123-456 ')).toEqual({ ok: true, valor: '123456' })
  for (const ruim of ['12345', '1234567', '12345a', '', '１２３４５６'])
    expect(normalizarCodigo(ruim)).toEqual({ ok: false, erro: 'codigo-invalido' })
})
