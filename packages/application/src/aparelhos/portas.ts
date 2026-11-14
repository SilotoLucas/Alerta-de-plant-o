import type { Aparelho, AparelhoId, Instante, Pareamento } from '@plantao/domain'

export interface RepositorioDeAparelhos {
  readonly inserir: (aparelho: Aparelho, tokenHash: string) => Promise<void>
  readonly buscarPorTokenHash: (tokenHash: string) => Promise<Aparelho | null>
  readonly listar: () => Promise<readonly Aparelho[]>
  readonly remover: (id: AparelhoId) => Promise<boolean>
}

export interface RepositorioDePareamentos {
  readonly inserir: (pareamento: Pareamento) => Promise<boolean>
  readonly consumir: (codigo: string, agora: Instante) => Promise<Pareamento | null>
}

export type TokenNovo = { readonly token: string; readonly hash: string }

export interface Segredos {
  readonly novoCodigo: () => string
  readonly novoToken: () => TokenNovo
  readonly hashDe: (token: string) => string
}
