import { expect, test } from 'bun:test'
import { rodarNaFixture } from '../preparar-fixture'
import { duplicacao } from './duplicacao'

test('jscpd acha o bloco clonado entre camadas e aponta as duas pontas', async () => {
  const violacoes = await rodarNaFixture(duplicacao, 'duplicacao')
  expect(violacoes).toHaveLength(1)
  const [clone] = violacoes
  const pontas = [clone?.arquivo, clone?.fato.split(' repetem ')[1]?.split(':')[0]].sort()
  expect(pontas).toEqual(['apps/api/src/http/pontuacao.ts', 'packages/domain/src/pontuacao.ts'])
})
