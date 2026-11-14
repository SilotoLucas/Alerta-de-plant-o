import {
  criarPareamento,
  type ErroDeAparelhos,
  err,
  ok,
  type Pareamento,
  type Result,
  validarPapel,
} from '@plantao/domain'
import type { Relogio } from '../../../compartilhado'
import type { RepositorioDePareamentos, Segredos } from '../../portas'

export type DependenciasDeIniciarPareamento = {
  readonly pareamentos: RepositorioDePareamentos
  readonly segredos: Segredos
  readonly relogio: Relogio
}

const TENTATIVAS_DE_CODIGO = 10

export const iniciarPareamento =
  (deps: DependenciasDeIniciarPareamento) =>
  async (papelTexto: string): Promise<Result<Pareamento, ErroDeAparelhos>> => {
    const papel = validarPapel(papelTexto)
    if (!papel.ok) return papel
    for (let tentativa = 0; tentativa < TENTATIVAS_DE_CODIGO; tentativa += 1) {
      const pareamento = criarPareamento(
        deps.segredos.novoCodigo(),
        papel.valor,
        deps.relogio.agora(),
      )
      if (await deps.pareamentos.inserir(pareamento)) return ok(pareamento)
    }
    return err('codigo-indisponivel')
  }
