import { aplicarMigracoes, criarConexao } from '@plantao/infra'
import { URL_PADRAO } from './servicos'

const sql = criarConexao(process.env['DATABASE_URL'] ?? URL_PADRAO)
try {
  const aplicadas = await aplicarMigracoes(sql)
  process.stdout.write(
    aplicadas.length === 0
      ? 'migrações: nada pendente\n'
      : `migrações aplicadas: ${aplicadas.join(', ')}\n`,
  )
} finally {
  await sql.end()
}
