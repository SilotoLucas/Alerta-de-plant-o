import { instante, MILISSEGUNDOS_POR_DIA } from '@plantao/domain'
import type { Relogio } from '../../../compartilhado'
import type { ResumoDaLimpeza, Retencao } from '../../portas'

export type DependenciasDeLimparDadosAntigos = {
  readonly retencao: Retencao
  readonly relogio: Relogio
  readonly dias: number
}

export const limparDadosAntigos =
  (deps: DependenciasDeLimparDadosAntigos) => (): Promise<ResumoDaLimpeza> =>
    deps.retencao.apagarAnterioresA(
      instante(deps.relogio.agora() - deps.dias * MILISSEGUNDOS_POR_DIA),
    )
