import { expect, test } from 'bun:test'
import { rodarNaFixture } from '../preparar-fixture'
import { segredo } from './segredo'

test('gitleaks acha a DSN de produção e ignora a credencial local permitida e o .env ignorado pelo git', async () => {
  const violacoes = await rodarNaFixture(segredo, 'segredo')
  expect(violacoes.map(({ arquivo, linha, regra }) => ({ arquivo, linha, regra }))).toEqual([
    { arquivo: 'packages/infra/src/db/conexao.ts', linha: 1, regra: 'plantao-postgres-dsn' },
  ])
  expect(violacoes[0]?.fato).not.toContain('s3nh4')
})
