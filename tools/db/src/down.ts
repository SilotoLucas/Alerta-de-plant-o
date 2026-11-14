import { docker } from './docker'
import { BANCO } from './servicos'

docker(['stop', BANCO.nome])
process.stdout.write('banco local parado (dados preservados no volume)\n')
