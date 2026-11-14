import {
  type Aparelho,
  type ErroDePlantao,
  err,
  lerAvisoId,
  ok,
  type Result,
} from '@plantao/domain'
import type { Relogio } from '../../../compartilhado'
import type { RepositorioDeAvisos } from '../../portas'

export type DependenciasDeConfirmarVisto = {
  readonly avisos: RepositorioDeAvisos
  readonly relogio: Relogio
}

export const confirmarVisto =
  (deps: DependenciasDeConfirmarVisto) =>
  async (aparelho: Aparelho, idTexto: string): Promise<Result<void, ErroDePlantao>> => {
    const id = lerAvisoId(idTexto)
    if (id === null) return err('aviso-nao-encontrado')
    const marcado = await deps.avisos.marcarVisto(aparelho.id, id, deps.relogio.agora())
    return marcado ? ok(undefined) : err('aviso-nao-encontrado')
  }
