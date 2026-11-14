import { describe, expect, test } from 'bun:test'
import { instante, MILISSEGUNDOS_POR_DIA } from '@plantao/domain'
import { relogioParado } from '../../../compartilhado/fakes'
import type { ResumoDaLimpeza, Retencao } from '../../portas'
import { limparDadosAntigos } from './limpar-dados-antigos.use-case'

const montar = (dias: number) => {
  const cortes: number[] = []
  const resumo: ResumoDaLimpeza = { mensagens: 3, avisos: 2, pareamentos: 1 }
  const retencao: Retencao = {
    apagarAnterioresA: async (limite) => {
      cortes.push(limite)
      return resumo
    },
  }
  const relogio = relogioParado(instante(100 * MILISSEGUNDOS_POR_DIA))
  return { cortes, resumo, executar: limparDadosAntigos({ retencao, relogio, dias }) }
}

describe('limparDadosAntigos', () => {
  test('apaga o que é anterior a "agora menos os dias de retenção" e devolve a contagem', async () => {
    const { cortes, resumo, executar } = montar(7)
    expect(await executar()).toEqual(resumo)
    expect(cortes).toEqual([93 * MILISSEGUNDOS_POR_DIA])
  })

  test('o prazo vem da configuração: com 1 dia o corte é ontem', async () => {
    const { cortes, executar } = montar(1)
    await executar()
    expect(cortes).toEqual([99 * MILISSEGUNDOS_POR_DIA])
  })
})
