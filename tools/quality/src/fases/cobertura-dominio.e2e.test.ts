import { expect, test } from 'bun:test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { achados, prepararFixture, removerFixture } from '../preparar-fixture'
import { FerramentaQuebrada } from '../relatorio'
import { coberturaDominio } from './cobertura-dominio'
import { DIRETORIO_COBERTURA } from './testes'

const LCOV = [
  'TN:',
  'SF:packages/domain/src/coberto.ts',
  'DA:1,4',
  'end_of_record',
  'TN:',
  'SF:packages/domain/src/parcial.ts',
  'DA:2,3',
  'DA:3,0',
  'end_of_record',
  '',
].join('\n')

test('acha linha do domínio nunca executada e arquivo que nenhum teste carrega, e ignora arquivo só de tipos ou declare, index e fora do domínio', async () => {
  const destino = await prepararFixture('cobertura-dominio')
  try {
    mkdirSync(join(destino, DIRETORIO_COBERTURA), { recursive: true })
    writeFileSync(join(destino, DIRETORIO_COBERTURA, 'lcov.info'), LCOV)
    const violacoes = await coberturaDominio.executar(destino)
    expect(achados(violacoes)).toEqual([
      { arquivo: 'packages/domain/src/esquecido.ts', regra: 'nao-carregado' },
      { arquivo: 'packages/domain/src/parcial.ts', regra: 'linha-descoberta' },
    ])
    expect(violacoes.find((violacao) => violacao.regra === 'linha-descoberta')?.linha).toBe(3)
  } finally {
    removerFixture(destino)
  }
})

test('sem lcov é ferramenta quebrada, não domínio coberto', async () => {
  const destino = await prepararFixture('cobertura-dominio')
  try {
    await expect(coberturaDominio.executar(destino)).rejects.toBeInstanceOf(FerramentaQuebrada)
  } finally {
    removerFixture(destino)
  }
})
