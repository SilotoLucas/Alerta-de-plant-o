import {
  type Aparelho,
  type ErroDePlantao,
  err,
  lerAvisoId,
  MILISSEGUNDOS_POR_DIA,
  MILISSEGUNDOS_POR_MINUTO,
  ok,
  type Result,
  somarMinutos,
} from '@plantao/domain'
import type { Relogio } from '../../../compartilhado'
import type { AvisoRegistrado, Notificador, RepositorioDeAvisos } from '../../portas'

export type DependenciasDeAssinarAvisos = {
  readonly avisos: RepositorioDeAvisos
  readonly notificador: Notificador
  readonly relogio: Relogio
}

export type Assinatura = {
  readonly pendentes: readonly AvisoRegistrado[]
  readonly cancelar: () => void
}

const MINUTOS_DE_REENVIO = MILISSEGUNDOS_POR_DIA / MILISSEGUNDOS_POR_MINUTO

export const assinarAvisos =
  (deps: DependenciasDeAssinarAvisos) =>
  async (
    aparelho: Aparelho,
    ultimoId: string | null,
    escutar: (aviso: AvisoRegistrado) => void,
  ): Promise<Result<Assinatura, ErroDePlantao>> => {
    if (aparelho.papel !== 'pessoal') return err('papel-incorreto')
    const cancelar = deps.notificador.assinar(aparelho.id, escutar)
    const depoisDe = ultimoId === null ? null : lerAvisoId(ultimoId)
    const desde = somarMinutos(deps.relogio.agora(), -MINUTOS_DE_REENVIO)
    const pendentes = await deps.avisos.pendentes(aparelho.id, depoisDe, desde).catch((falha) => {
      cancelar()
      return Promise.reject(falha)
    })
    return ok({ pendentes, cancelar })
  }
