import { expect, test } from 'bun:test'
import { rodarNaFixture } from '../preparar-fixture'
import { codigoMorto } from './codigo-morto'

test('knip acha arquivo sem uso, export sem uso e dependência sem uso', async () => {
  const violacoes = await rodarNaFixture(codigoMorto, 'codigo-morto')
  expect(violacoes.map(({ regra, fato }) => `${regra}: ${fato}`).sort()).toEqual([
    'dependencies: elysia sem uso (dependencies)',
    'exports: esquecida sem uso (exports)',
    'files: src/abandonado.ts sem uso (files)',
  ])
})
