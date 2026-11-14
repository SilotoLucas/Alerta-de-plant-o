import { expect, test } from 'bun:test'
import { achados, rodarNaFixture } from '../preparar-fixture'
import { convencaoDeTeste } from './convencao-de-teste'

test('acha sufixo fora de unit/e2e e teste desligado com skip ou only', async () => {
  expect(achados(await rodarNaFixture(convencaoDeTeste, 'convencao-de-teste'))).toEqual([
    { arquivo: 'packages/domain/src/pet.spec.ts', regra: 'sufixo' },
    { arquivo: 'packages/domain/src/pet.test.ts', regra: 'sufixo' },
    { arquivo: 'packages/domain/src/porte.e2e.test.ts', regra: 'teste-desligado' },
    { arquivo: 'packages/domain/src/raca.unit.test.ts', regra: 'teste-desligado' },
  ])
})
