import { expect, test } from 'bun:test'
import { rodarNaFixture } from '../preparar-fixture'
import { portaSoTipo } from './porta-so-tipo'

test('acha valor exportado e método em arquivo de porta, e aceita porta só com propriedade de função', async () => {
  const violacoes = await rodarNaFixture(portaSoTipo, 'porta-so-tipo')
  expect(violacoes.map(({ arquivo, linha, regra }) => ({ arquivo, linha, regra }))).toEqual([
    { arquivo: 'packages/application/src/pets/portas.ts', linha: 12, regra: 'porta-com-valor' },
    { arquivo: 'packages/application/src/pets/portas.ts', linha: 5, regra: 'porta-com-metodo' },
    { arquivo: 'packages/application/src/pets/portas.ts', linha: 9, regra: 'porta-com-metodo' },
  ])
})
