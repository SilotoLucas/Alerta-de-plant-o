import { expect, test } from 'bun:test'
import { achados, rodarNaFixture } from '../preparar-fixture'
import { FerramentaQuebrada } from '../relatorio'
import { testes } from './testes'

test('acha o teste que falhou, com arquivo, linha e a mensagem da asserção', async () => {
  const violacoes = await rodarNaFixture(testes, 'testes')
  expect(achados(violacoes)).toEqual([{ arquivo: 'src/soma.unit.test.ts', regra: 'falhou' }])
  expect(violacoes[0]?.linha).toBe(7)
  expect(violacoes[0]?.fato).toContain('soma errada de propósito')
})

test('nenhum teste executado é ferramenta quebrada, nunca verde', async () => {
  await expect(rodarNaFixture(testes, 'testes-vazio')).rejects.toBeInstanceOf(FerramentaQuebrada)
})

test('infraestrutura de teste fora do ar é ferramenta quebrada antes de rodar qualquer teste', async () => {
  const promessa = rodarNaFixture(testes, 'testes-infra-fora')
  await expect(promessa).rejects.toBeInstanceOf(FerramentaQuebrada)
  await expect(rodarNaFixture(testes, 'testes-infra-fora')).rejects.toThrow('banco fora do ar')
})
