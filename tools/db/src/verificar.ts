import { docker } from './docker'
import { BANCO } from './servicos'

if (docker(['inspect', '-f', '{{.State.Running}}', BANCO.nome]).saida !== 'true') {
  process.stderr.write(`${BANCO.nome} fora do ar; rode bun run db:up\n`)
  process.exit(1)
}
