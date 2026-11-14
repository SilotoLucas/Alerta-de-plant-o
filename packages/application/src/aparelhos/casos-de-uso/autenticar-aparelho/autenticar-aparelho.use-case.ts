import { type Aparelho, type ErroDeAparelhos, err, ok, type Result } from '@plantao/domain'
import type { RepositorioDeAparelhos, Segredos } from '../../portas'

export type DependenciasDeAutenticarAparelho = {
  readonly aparelhos: RepositorioDeAparelhos
  readonly segredos: Segredos
}

export const autenticarAparelho =
  (deps: DependenciasDeAutenticarAparelho) =>
  async (token: string): Promise<Result<Aparelho, ErroDeAparelhos>> => {
    if (token === '') return err('aparelho-invalido')
    const aparelho = await deps.aparelhos.buscarPorTokenHash(deps.segredos.hashDe(token))
    return aparelho === null ? err('aparelho-invalido') : ok(aparelho)
  }
