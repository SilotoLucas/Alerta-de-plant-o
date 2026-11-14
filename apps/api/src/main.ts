import { lerConfiguracao } from './composicao/configuracao'
import { montarServidor } from './composicao/servidor'

const configuracao = lerConfiguracao(process.env)
if (!configuracao.ok) {
  process.stderr.write(`configuração inválida:\n- ${configuracao.erro.join('\n- ')}\n`)
  process.exit(1)
}
const { app, encerrar } = montarServidor(configuracao.valor)
app.listen(configuracao.valor.porta)
process.stdout.write(`api ouvindo na porta ${app.server?.port ?? configuracao.valor.porta}\n`)

const parar = () => {
  void encerrar().finally(() => process.exit(0))
}
process.on('SIGTERM', parar)
process.on('SIGINT', parar)
