import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Sql } from './conexao'

const PASTA = join(import.meta.dir, 'migrations')

export const aplicarMigracoes = async (sql: Sql): Promise<readonly string[]> => {
  await sql`create table if not exists migracoes (nome text primary key, aplicada_em timestamptz not null default now())`
  const aplicadas = new Set(
    (await sql<{ nome: string }[]>`select nome from migracoes`).map((linha) => linha.nome),
  )
  const pendentes = readdirSync(PASTA)
    .filter((arquivo) => arquivo.endsWith('.sql') && !aplicadas.has(arquivo))
    .sort()
  for (const arquivo of pendentes) {
    await sql.begin(async (transacao) => {
      await transacao.unsafe(readFileSync(join(PASTA, arquivo), 'utf8'))
      await transacao`insert into migracoes (nome) values (${arquivo})`
    })
  }
  return pendentes
}
