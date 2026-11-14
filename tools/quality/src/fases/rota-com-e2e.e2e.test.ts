import { expect, test } from 'bun:test'
import { rodarNaFixture } from '../preparar-fixture'
import { rotaComE2e } from './rota-com-e2e'

test('acha rota sem e2e, resolve prefixo, barra final e parâmetro, e não confunde /health com /healthcheck', async () => {
  const violacoes = await rodarNaFixture(rotaComE2e, 'rota-com-e2e')
  expect(violacoes.map((violacao) => violacao.fato).sort()).toEqual([
    'GET /health não aparece em nenhum *.e2e.test.ts de apps/api',
    'GET /pets não aparece em nenhum *.e2e.test.ts de apps/api',
    'POST /pets/:id/fotos não aparece em nenhum *.e2e.test.ts de apps/api',
  ])
})
