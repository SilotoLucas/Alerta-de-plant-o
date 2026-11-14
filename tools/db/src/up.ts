import { docker, esperar } from './docker'
import { BANCO, BANCOS } from './servicos'

const garantirRodando = (): void => {
  const estado = docker(['inspect', '-f', '{{.State.Running}}', BANCO.nome])
  if (estado.ok && estado.saida === 'true') return
  if (estado.ok) {
    const inicio = docker(['start', BANCO.nome])
    if (!inicio.ok) throw new Error(`docker start ${BANCO.nome}: ${inicio.erro}`)
    return
  }
  const criacao = docker(['run', '-d', '--name', BANCO.nome, ...BANCO.argumentos, BANCO.imagem])
  if (!criacao.ok) throw new Error(`docker run ${BANCO.nome}: ${criacao.erro}`)
}

const psql = (sql: string) =>
  docker(['exec', BANCO.nome, 'psql', '-U', 'plantao', '-d', 'plantao', '-tAc', sql])

const garantirBancos = (): void => {
  for (const nome of BANCOS) {
    if (psql(`select 1 from pg_database where datname = '${nome}'`).saida === '1') continue
    const criacao = psql(`create database ${nome}`)
    if (!criacao.ok) throw new Error(`create database ${nome}: ${criacao.erro}`)
  }
}

garantirRodando()
await esperar('postgres', () => docker(['exec', BANCO.nome, 'pg_isready', '-U', 'plantao']).ok)
await esperar('postgres aceitando consultas', () => psql('select 1').saida === '1')
garantirBancos()
process.stdout.write(`banco em localhost:5435 (${BANCOS.join(', ')})\n`)
