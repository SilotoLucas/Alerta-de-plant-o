export type Violacao = {
  readonly arquivo: string
  readonly linha: number
  readonly coluna: number
  readonly regra: string
  readonly fato: string
  readonly correcao: string
}

export const SAIDA_LIMPA = 0
export const SAIDA_VIOLACAO = 1
export const SAIDA_QUEBRADA = 2

export class FerramentaQuebrada extends Error {
  override readonly name = 'FerramentaQuebrada'
}

const umaLinha = (texto: string): string => texto.replace(/\s+/g, ' ').trim()

export const formatar = (ferramenta: string, violacao: Violacao): string =>
  `${violacao.arquivo}:${violacao.linha}:${violacao.coluna}: error ${ferramenta}(${violacao.regra}): ${umaLinha(violacao.fato)} fix: ${umaLinha(violacao.correcao)}`

const porPosicao = (a: Violacao, b: Violacao): number =>
  a.arquivo.localeCompare(b.arquivo) ||
  a.linha - b.linha ||
  a.coluna - b.coluna ||
  a.regra.localeCompare(b.regra)

export const ordenar = (violacoes: readonly Violacao[]): readonly Violacao[] =>
  [...violacoes].sort(porPosicao)
