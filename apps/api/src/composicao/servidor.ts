import { criarConexao, relogioDoSistema } from '@plantao/infra'
import { criarApp } from '../http/app'
import { montarCasosDeUso } from './casos-de-uso'
import type { Configuracao } from './configuracao'

export const montarServidor = (config: Configuracao) => {
  const sql = criarConexao(config.bancoUrl)
  const relogio = relogioDoSistema()
  const app = criarApp(
    montarCasosDeUso(sql, relogio, config),
    config.tokenDeAdmin,
    config.limites,
    relogio.agora,
  )
  return {
    app,
    encerrar: async () => {
      await app.stop(true)
      await sql.end()
    },
  }
}
