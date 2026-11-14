import { expect, test } from 'bun:test'
import { rodarNaFixture } from '../preparar-fixture'
import { pureza } from './pureza'

test('acha throw e Math.random em domain e application, aceita Math.floor, e ignora teste, fakes e infra', async () => {
  const violacoes = await rodarNaFixture(pureza, 'pureza')
  expect(violacoes.map(({ arquivo, linha, regra }) => ({ arquivo, linha, regra }))).toEqual([
    { arquivo: 'packages/application/src/pets/cadastrar.ts', linha: 2, regra: 'throw' },
    { arquivo: 'packages/domain/src/pet.ts', linha: 2, regra: 'throw' },
    { arquivo: 'packages/domain/src/sorteio.ts', linha: 2, regra: 'aleatorio' },
  ])
})
