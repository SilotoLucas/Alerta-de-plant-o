import type { Fase } from '../fase'
import { binario, executar, quebrou } from '../processo'
import type { Violacao } from '../relatorio'

type SaidaDoCruiser = {
  readonly summary: {
    readonly violations: readonly {
      readonly from: string
      readonly to: string
      readonly rule: { readonly name: string }
      readonly cycle?: readonly ({ readonly name: string } | string)[]
    }[]
    readonly ruleSetUsed?: {
      readonly forbidden?: readonly { readonly name: string; readonly comment?: string }[]
    }
  }
}

const nomeNoCiclo = (passo: { readonly name: string } | string): string =>
  typeof passo === 'string' ? passo : passo.name

const lerSaidaDoCruiser = (json: SaidaDoCruiser): readonly Violacao[] => {
  const comentarios = new Map(
    (json.summary.ruleSetUsed?.forbidden ?? []).map((regra) => [regra.name, regra.comment ?? '']),
  )
  return json.summary.violations.map((violacao) => {
    const ciclo = violacao.cycle?.map(nomeNoCiclo).join(' -> ')
    const ehOrfao = violacao.from === violacao.to
    const fato = ciclo
      ? `ciclo ${violacao.from} -> ${ciclo}`
      : ehOrfao
        ? `${violacao.from} não é importado por ninguém`
        : `${violacao.from} importa ${violacao.to}`
    return {
      arquivo: violacao.from,
      linha: 1,
      coluna: 1,
      regra: violacao.rule.name,
      fato,
      correcao: comentarios.get(violacao.rule.name) || 'veja a regra em .dependency-cruiser.cjs',
    }
  })
}

export const fronteira: Fase = {
  nome: 'fronteira',
  ferramenta: 'dependency-cruiser',
  modos: ['quick', 'full'],
  executar: async (raiz) => {
    const execucao = await executar(raiz, [
      binario(raiz, 'depcruise'),
      '--config',
      '.dependency-cruiser.cjs',
      '--output-type',
      'json',
      '--no-progress',
      'packages',
      'apps',
      'tools',
    ])
    try {
      return lerSaidaDoCruiser(JSON.parse(execucao.saida))
    } catch {
      throw quebrou('dependency-cruiser', execucao)
    }
  },
}
