import { expect, test } from 'bun:test'
import { rodarNaFixture } from '../preparar-fixture'
import { versaoFixa } from './versao-fixa'

test('acha ^, ~ e latest, inclusive no catalog, e aceita versão exata, workspace:* e catalog:', async () => {
  const violacoes = await rodarNaFixture(versaoFixa, 'versao-fixa')
  expect(violacoes.map((violacao) => violacao.fato).sort()).toEqual([
    'elysia@^1.4.0 em dependencies não é versão exata',
    'knip@~6.41.0 em devDependencies não é versão exata',
    'react@latest em catalog não é versão exata',
  ])
})
