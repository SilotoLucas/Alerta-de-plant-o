import { expect, test } from 'bun:test'
import { achados, rodarNaFixture } from '../preparar-fixture'
import { estilo } from './estilo'

test('biome acha global proibido no domínio e no front, formatação, e libera o fetch do transporte', async () => {
  const violacoes = await rodarNaFixture(estilo, 'estilo')
  expect(achados(violacoes)).toEqual([
    { arquivo: 'apps/web/src/busca.ts', regra: 'lint/style/noRestrictedGlobals' },
    { arquivo: 'packages/contracts/src/mal-formatado.ts', regra: 'format' },
    { arquivo: 'packages/domain/src/relogio.ts', regra: 'lint/style/noRestrictedGlobals' },
  ])
})

test('a correção do global proibido é o motivo configurado no biome.json', async () => {
  const violacoes = await rodarNaFixture(estilo, 'estilo')
  const relogio = violacoes.find(
    (violacao) => violacao.arquivo === 'packages/domain/src/relogio.ts',
  )
  expect(relogio?.correcao).toContain('porta Relogio')
})
