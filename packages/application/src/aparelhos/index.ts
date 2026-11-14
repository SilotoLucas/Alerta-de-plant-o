export {
  autenticarAparelho,
  type DependenciasDeAutenticarAparelho,
} from './casos-de-uso/autenticar-aparelho/autenticar-aparelho.use-case'
export {
  type AparelhoPareado,
  concluirPareamento,
  type DependenciasDeConcluirPareamento,
} from './casos-de-uso/concluir-pareamento/concluir-pareamento.use-case'
export {
  type DependenciasDeIniciarPareamento,
  iniciarPareamento,
} from './casos-de-uso/iniciar-pareamento/iniciar-pareamento.use-case'
export {
  type DependenciasDeListarAparelhos,
  listarAparelhos,
} from './casos-de-uso/listar-aparelhos/listar-aparelhos.use-case'
export {
  type DependenciasDeRevogarAparelho,
  revogarAparelho,
} from './casos-de-uso/revogar-aparelho/revogar-aparelho.use-case'
export type {
  RepositorioDeAparelhos,
  RepositorioDePareamentos,
  Segredos,
  TokenNovo,
} from './portas'
