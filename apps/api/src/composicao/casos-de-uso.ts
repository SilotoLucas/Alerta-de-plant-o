import {
  alterarPlantao,
  assinarAvisos,
  autenticarAparelho,
  concluirPareamento,
  confirmarVisto,
  iniciarPareamento,
  limparDadosAntigos,
  listarAparelhos,
  type Relogio,
  receberEvento,
  revogarAparelho,
} from '@plantao/application'
import {
  idsAleatorios,
  notificadorEmMemoria,
  registroDeMensagens,
  repositorioDeAparelhos,
  repositorioDeAvisos,
  repositorioDePareamentos,
  repositorioDoPlantao,
  retencaoDeDados,
  type Sql,
  segredosAleatorios,
} from '@plantao/infra'
import type { Configuracao } from './configuracao'

export const montarCasosDeUso = (sql: Sql, relogio: Relogio, config: Configuracao) => {
  const aparelhos = repositorioDeAparelhos(sql)
  const pareamentos = repositorioDePareamentos(sql)
  const mensagens = registroDeMensagens(sql)
  const avisos = repositorioDeAvisos(sql)
  const plantao = repositorioDoPlantao(sql)
  const segredos = segredosAleatorios()
  const ids = idsAleatorios()
  const notificador = notificadorEmMemoria()
  return {
    iniciarPareamento: iniciarPareamento({ pareamentos, segredos, relogio }),
    concluirPareamento: concluirPareamento({ aparelhos, pareamentos, segredos, ids, relogio }),
    autenticarAparelho: autenticarAparelho({ aparelhos, segredos }),
    listarAparelhos: listarAparelhos({ aparelhos }),
    revogarAparelho: revogarAparelho({ aparelhos }),
    receberEvento: receberEvento({
      mensagens,
      plantao,
      avisos,
      notificador,
      ids,
      relogio,
      incluirTexto: config.enviarTexto,
    }),
    alterarPlantao: alterarPlantao({ plantao, relogio }),
    confirmarVisto: confirmarVisto({ avisos, relogio }),
    assinarAvisos: assinarAvisos({ avisos, notificador, relogio }),
    limparDadosAntigos: limparDadosAntigos({
      retencao: retencaoDeDados(sql),
      relogio,
      dias: config.retencaoEmDias,
    }),
  }
}

export type CasosDeUso = ReturnType<typeof montarCasosDeUso>
