import { expect, test } from 'bun:test'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { listarArquivos } from './arquivos'
import { prepararFixture, removerFixture } from './preparar-fixture'

test('arquivo rastreado pelo git e apagado do disco (renomeação ainda não commitada) não entra na lista', async () => {
  const destino = await prepararFixture('nome-de-arquivo')
  try {
    await Bun.spawn(['git', 'add', '.'], { cwd: destino }).exited
    rmSync(join(destino, 'packages/domain/src/nome-bom.ts'))
    const arquivos = await listarArquivos(destino)
    expect(arquivos).toContain('packages/domain/src/NomeRuim.ts')
    expect(arquivos).not.toContain('packages/domain/src/nome-bom.ts')
  } finally {
    removerFixture(destino)
  }
})
