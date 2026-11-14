import type { Violacao } from './relatorio'

export type Modo = 'quick' | 'full'

export type Fase = {
  readonly nome: string
  readonly ferramenta: string
  readonly modos: readonly Modo[]
  readonly executar: (raiz: string) => Promise<readonly Violacao[]>
}
