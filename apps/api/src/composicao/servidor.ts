import { criarConexao, relogioDoSistema } from '@plantao/infra'
import { criarApp } from '../http/app'
import { montarCasosDeUso } from './casos-de-uso'
import type { Configuracao } from './configuracao'

export const montarServidor = (config: Configuracao) => {
  const sql = criarConexao(config.bancoUrl)
  const relogio = relogioDoSistema()
  const casosDeUso = montarCasosDeUso(sql, relogio, config)
  const app = criarApp(casosDeUso, config.tokenDeAdmin, config.limites, relogio.agora)
  return {
    app,
    limparDadosAntigos: casosDeUso.limparDadosAntigos,
    encerrar: async () => {
      await app.stop(true)
      await sql.end()
    },
  }
}
