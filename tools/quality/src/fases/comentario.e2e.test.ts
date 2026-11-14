import { expect, test } from 'bun:test'
import { rodarNaFixture } from '../preparar-fixture'
import { comentario } from './comentario'

test('acha comentário de linha, de bloco e em JSX, ignora // dentro de string e texto, aceita o permitido e cobra permissão obsoleta', async () => {
  const violacoes = await rodarNaFixture(comentario, 'comentario')
  expect(violacoes.map(({ arquivo, linha, regra }) => ({ arquivo, linha, regra }))).toEqual([
    { arquivo: 'apps/web/src/tela.tsx', linha: 3, regra: 'sem-justificativa' },
    { arquivo: 'packages/domain/src/pet.ts', linha: 1, regra: 'sem-justificativa' },
    { arquivo: 'packages/domain/src/pet.ts', linha: 4, regra: 'sem-justificativa' },
    { arquivo: 'tools/quality/comentarios-permitidos.json', linha: 1, regra: 'permissao-obsoleta' },
  ])
})
