import { ehUuid, err, type Instante, type Marcado, ok, type Result } from '../compartilhado'
import type { ErroDeAparelhos } from './erros'

export type AparelhoId = Marcado<string, 'AparelhoId'>

export const lerAparelhoId = (texto: string): AparelhoId | null =>
  ehUuid(texto) ? (texto as AparelhoId) : null

export const PAPEIS = ['empresa', 'pessoal'] as const
export type Papel = (typeof PAPEIS)[number]

export type Aparelho = {
  readonly id: AparelhoId
  readonly papel: Papel
  readonly nome: string
  readonly criadoEm: Instante
}

export const NOME_MINIMO = 2
export const NOME_MAXIMO = 40

export const validarPapel = (texto: string): Result<Papel, ErroDeAparelhos> => {
  const papel = PAPEIS.find((candidato) => candidato === texto)
  return papel === undefined ? err('papel-invalido') : ok(papel)
}

export const validarNomeDoAparelho = (texto: string): Result<string, ErroDeAparelhos> => {
  const nome = texto.trim().replace(/\s+/g, ' ')
  return nome.length >= NOME_MINIMO && nome.length <= NOME_MAXIMO ? ok(nome) : err('nome-invalido')
}
