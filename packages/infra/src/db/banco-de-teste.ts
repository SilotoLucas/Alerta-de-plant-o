import { criarConexao, type Sql } from './conexao'
import { aplicarMigracoes } from './migracoes'

const SUFIXO_OBRIGATORIO = '_teste'

const TABELAS_DE_MOVIMENTO = ['avisos', 'mensagens_vistas', 'pareamentos', 'aparelhos']

export type BancoDeTeste = {
  readonly sql: Sql
  readonly limpar: () => Promise<void>
  readonly encerrar: () => Promise<void>
}

export const prepararBancoDeTeste = async (url: string): Promise<BancoDeTeste> => {
  const nome = new URL(url).pathname.slice(1)
  if (!nome.endsWith(SUFIXO_OBRIGATORIO))
    throw new Error(
      `recusado: ${nome} não termina em ${SUFIXO_OBRIGATORIO}; o banco de teste é apagado`,
    )
  const sql = criarConexao(url)
  await sql.unsafe('drop schema if exists public cascade; create schema public;')
  await aplicarMigracoes(sql)
  return {
    sql,
    limpar: async () => {
      await sql.unsafe(`truncate ${TABELAS_DE_MOVIMENTO.join(', ')} cascade`)
    },
    encerrar: async () => {
      await sql.end()
    },
  }
}
