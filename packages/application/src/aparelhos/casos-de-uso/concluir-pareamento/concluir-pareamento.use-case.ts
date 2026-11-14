import {
  type Aparelho,
  type ErroDeAparelhos,
  err,
  normalizarCodigo,
  ok,
  type Result,
  validarNomeDoAparelho,
} from '@plantao/domain'
import type { GeradorDeId, Relogio } from '../../../compartilhado'
import type { RepositorioDeAparelhos, RepositorioDePareamentos, Segredos } from '../../portas'

export type DependenciasDeConcluirPareamento = {
  readonly aparelhos: RepositorioDeAparelhos
  readonly pareamentos: RepositorioDePareamentos
  readonly segredos: Segredos
  readonly ids: GeradorDeId
  readonly relogio: Relogio
}

export type AparelhoPareado = { readonly aparelho: Aparelho; readonly token: string }

export const concluirPareamento =
  (deps: DependenciasDeConcluirPareamento) =>
  async (entrada: {
    readonly codigo: string
    readonly nome: string
  }): Promise<Result<AparelhoPareado, ErroDeAparelhos>> => {
    const codigo = normalizarCodigo(entrada.codigo)
    if (!codigo.ok) return codigo
    const nome = validarNomeDoAparelho(entrada.nome)
    if (!nome.ok) return nome
    const agora = deps.relogio.agora()
    const pareamento = await deps.pareamentos.consumir(codigo.valor, agora)
    if (pareamento === null) return err('codigo-invalido')
    const aparelho: Aparelho = {
      id: deps.ids.novo<'AparelhoId'>(),
      papel: pareamento.papel,
      nome: nome.valor,
      criadoEm: agora,
    }
    const { token, hash } = deps.segredos.novoToken()
    await deps.aparelhos.inserir(aparelho, hash)
    return ok({ aparelho, token })
  }
