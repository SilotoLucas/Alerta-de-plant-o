export {
  type Aparelho,
  type AparelhoId,
  lerAparelhoId,
  NOME_MAXIMO,
  NOME_MINIMO,
  PAPEIS,
  type Papel,
  validarNomeDoAparelho,
  validarPapel,
} from './aparelho'
export type { ErroDeAparelhos } from './erros'
export {
  criarPareamento,
  DIGITOS_DO_CODIGO,
  normalizarCodigo,
  type Pareamento,
  VALIDADE_DO_CODIGO_EM_MINUTOS,
} from './pareamento'
