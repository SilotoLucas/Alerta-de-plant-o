import {
  type Aparelho,
  type ErroDePlantao,
  err,
  interpretarComando,
  ok,
  type Result,
} from '@plantao/domain'
import type { Relogio } from '../../../compartilhado'
import type { EstadoDoPlantao, RepositorioDoPlantao } from '../../portas'

export type DependenciasDeAlterarPlantao = {
  readonly plantao: RepositorioDoPlantao
  readonly relogio: Relogio
}

export const alterarPlantao =
  (deps: DependenciasDeAlterarPlantao) =>
  async (aparelho: Aparelho, texto: string): Promise<Result<EstadoDoPlantao, ErroDePlantao>> => {
    if (aparelho.papel !== 'pessoal') return err('papel-incorreto')
    const comando = interpretarComando(texto)
    if (comando === null) return err('comando-invalido')
    const atual = await deps.plantao.ler(aparelho.id)
    if (comando === 'status') return ok(atual)
    const ativo = comando === 'ativar'
    if (atual.ativo === ativo) return ok(atual)
    const alteradoEm = deps.relogio.agora()
    await deps.plantao.definir(aparelho.id, ativo, alteradoEm)
    return ok({ ativo, alteradoEm })
  }
