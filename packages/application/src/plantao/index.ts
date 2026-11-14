export {
  alterarPlantao,
  type DependenciasDeAlterarPlantao,
} from './casos-de-uso/alterar-plantao/alterar-plantao.use-case'
export {
  type Assinatura,
  assinarAvisos,
  type DependenciasDeAssinarAvisos,
} from './casos-de-uso/assinar-avisos/assinar-avisos.use-case'
export {
  confirmarVisto,
  type DependenciasDeConfirmarVisto,
} from './casos-de-uso/confirmar-visto/confirmar-visto.use-case'
export {
  type DependenciasDeLimparDadosAntigos,
  limparDadosAntigos,
} from './casos-de-uso/limpar-dados-antigos/limpar-dados-antigos.use-case'
export {
  type DependenciasDeReceberEvento,
  type EntradaDeEvento,
  type ResumoDoEvento,
  receberEvento,
} from './casos-de-uso/receber-evento/receber-evento.use-case'
export type {
  AvisoRegistrado,
  EstadoDoPlantao,
  Notificador,
  RegistroDeMensagens,
  RepositorioDeAvisos,
  RepositorioDoPlantao,
  ResumoDaLimpeza,
  Retencao,
} from './portas'
