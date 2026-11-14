export { type BancoDeTeste, prepararBancoDeTeste } from './db/banco-de-teste'
export { criarConexao, type Sql } from './db/conexao'
export { aplicarMigracoes } from './db/migracoes'
export {
  repositorioDeAparelhos,
  repositorioDePareamentos,
} from './db/repositorios/aparelhos.repository'
export {
  registroDeMensagens,
  repositorioDeAvisos,
  repositorioDoPlantao,
  retencaoDeDados,
} from './db/repositorios/plantao.repository'
export { notificadorEmMemoria } from './entrega/notificador-em-memoria'
export { segredosAleatorios } from './seguranca/segredos'
export { idsAleatorios, relogioDoSistema } from './sistema/relogio'
