import { expect, test } from 'bun:test'
import { achados, rodarNaFixture } from '../preparar-fixture'
import { casoDeUsoComTeste } from './caso-de-uso-com-teste'

test('acha o caso de uso sem teste unitário irmão e aceita o que tem', async () => {
  expect(achados(await rodarNaFixture(casoDeUsoComTeste, 'caso-de-uso-com-teste'))).toEqual([
    {
      arquivo: 'packages/application/src/match/casos-de-uso/curtir/curtir.use-case.ts',
      regra: 'sem-teste-irmao',
    },
  ])
})
