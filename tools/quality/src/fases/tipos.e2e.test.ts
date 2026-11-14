import { expect, test } from 'bun:test'
import { rodarNaFixture } from '../preparar-fixture'
import { tipos } from './tipos'

test('tsc acha o erro de tipo com arquivo, linha e coluna, e nada no arquivo correto', async () => {
  const violacoes = await rodarNaFixture(tipos, 'tipos')
  expect(
    violacoes.map(({ arquivo, linha, coluna, regra }) => ({ arquivo, linha, coluna, regra })),
  ).toEqual([{ arquivo: 'src/pet.ts', linha: 1, coluna: 14, regra: 'TS2322' }])
})
