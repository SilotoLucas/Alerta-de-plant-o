import { expect, test } from 'bun:test'
import { achados, rodarNaFixture } from '../preparar-fixture'
import { fronteira } from './fronteira'

test('dependency-cruiser acha exatamente uma violação plantada por regra, e nada nos casos permitidos', async () => {
  const violacoes = await rodarNaFixture(fronteira, 'fronteira')
  expect(achados(violacoes)).toEqual([
    { arquivo: 'apps/api/src/composicao/sem-pacote.ts', regra: 'nao-declarado' },
    { arquivo: 'apps/api/src/composicao/servidor.ts', regra: 'elysia-so-na-borda-http' },
    { arquivo: 'apps/api/src/http/rota.ts', regra: 'infra-so-na-composicao' },
    { arquivo: 'apps/mobile/src/sessao.ts', regra: 'armazenamento-so-no-adaptador' },
    { arquivo: 'apps/web/src/features/match/tela.ts', regra: 'feature-so-pelo-index' },
    { arquivo: 'apps/web/src/usa-app.ts', regra: 'front-sem-camada-de-servidor' },
    { arquivo: 'apps/web/src/usa-schema.ts', regra: 'front-contracts-so-tipo' },
    { arquivo: 'packages/api-client/src/index.ts', regra: 'api-client-so-contracts' },
    { arquivo: 'packages/application/src/caso.ts', regra: 'application-so-dominio' },
    { arquivo: 'packages/application/src/pets/usa-fake.ts', regra: 'fake-so-em-teste' },
    { arquivo: 'packages/application/src/usa-typebox.ts', regra: 'application-sem-dependencia' },
    { arquivo: 'packages/apresentacao/src/index.ts', regra: 'apresentacao-isolada' },
    { arquivo: 'packages/contracts/src/schema.ts', regra: 'contracts-so-typebox' },
    { arquivo: 'packages/design-tokens/src/index.ts', regra: 'design-tokens-isolado' },
    { arquivo: 'packages/domain/src/ciclo-a.ts', regra: 'sem-ciclo' },
    { arquivo: 'packages/domain/src/match/curtida.ts', regra: 'contexto-so-pelo-index' },
    { arquivo: 'packages/domain/src/orfao.ts', regra: 'sem-orfao' },
    { arquivo: 'packages/domain/src/pet.unit.test.ts', regra: 'unit-test-sem-io' },
    { arquivo: 'packages/domain/src/sobe.ts', regra: 'dominio-nao-importa-camada' },
    { arquivo: 'packages/domain/src/usa-runtime.ts', regra: 'dominio-sem-dependencia' },
    { arquivo: 'packages/infra/src/repo.ts', regra: 'infra-nao-sobe' },
    { arquivo: 'packages/infra/src/repositorios/pet.ts', regra: 'driver-so-em-infra' },
    { arquivo: 'packages/infra/src/volta.ts', regra: 'infra-nao-sobe' },
    { arquivo: 'packages/infra/src/volta.ts', regra: 'pacote-nao-importa-app' },
    { arquivo: 'tools/script/src/script.ts', regra: 'tools-nao-importa-app' },
  ])
})

test('a correção de cada violação é o comentário da regra, não uma mensagem genérica', async () => {
  const violacoes = await rodarNaFixture(fronteira, 'fronteira')
  const dominio = violacoes.find((violacao) => violacao.regra === 'dominio-sem-dependencia')
  expect(dominio?.correcao).toContain('packages/infra')
  expect(dominio?.fato).toBe('packages/domain/src/usa-runtime.ts importa fs')
})
