import { type ErroDeAparelhos, err, lerAparelhoId, ok, type Result } from '@plantao/domain'
import type { RepositorioDeAparelhos } from '../../portas'

export type DependenciasDeRevogarAparelho = { readonly aparelhos: RepositorioDeAparelhos }

export const revogarAparelho =
  (deps: DependenciasDeRevogarAparelho) =>
  async (idTexto: string): Promise<Result<void, ErroDeAparelhos>> => {
    const id = lerAparelhoId(idTexto)
    if (id === null) return err('aparelho-nao-encontrado')
    return (await deps.aparelhos.remover(id)) ? ok(undefined) : err('aparelho-nao-encontrado')
  }
