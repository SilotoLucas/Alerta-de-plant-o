import { err, type Instante, ok, type Result, somarMinutos } from '../compartilhado'
import type { Papel } from './aparelho'
import type { ErroDeAparelhos } from './erros'

export const DIGITOS_DO_CODIGO = 6
export const VALIDADE_DO_CODIGO_EM_MINUTOS = 10

export type Pareamento = {
  readonly codigo: string
  readonly papel: Papel
  readonly criadoEm: Instante
  readonly expiraEm: Instante
}

const SOMENTE_DIGITOS = /^\d+$/

export const criarPareamento = (codigo: string, papel: Papel, agora: Instante): Pareamento => ({
  codigo,
  papel,
  criadoEm: agora,
  expiraEm: somarMinutos(agora, VALIDADE_DO_CODIGO_EM_MINUTOS),
})

export const normalizarCodigo = (texto: string): Result<string, ErroDeAparelhos> => {
  const codigo = texto.replace(/[\s-]/g, '')
  return codigo.length === DIGITOS_DO_CODIGO && SOMENTE_DIGITOS.test(codigo)
    ? ok(codigo)
    : err('codigo-invalido')
}
