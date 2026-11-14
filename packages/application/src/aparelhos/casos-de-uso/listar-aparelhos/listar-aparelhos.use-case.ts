import type { Aparelho } from '@plantao/domain'
import type { RepositorioDeAparelhos } from '../../portas'

export type DependenciasDeListarAparelhos = { readonly aparelhos: RepositorioDeAparelhos }

export const listarAparelhos =
  (deps: DependenciasDeListarAparelhos) => (): Promise<readonly Aparelho[]> =>
    deps.aparelhos.listar()
