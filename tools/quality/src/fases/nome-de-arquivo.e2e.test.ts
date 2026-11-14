import { expect, test } from 'bun:test'
import { achados, rodarNaFixture } from '../preparar-fixture'
import { nomeDeArquivo } from './nome-de-arquivo'

test('ls-lint acha o arquivo fora de kebab-case e só ele', async () => {
  expect(achados(await rodarNaFixture(nomeDeArquivo, 'nome-de-arquivo'))).toEqual([
    { arquivo: 'packages/domain/src/NomeRuim.ts', regra: '.ts' },
  ])
})
