import { lerConfiguracao } from './composicao/configuracao'
import { montarServidor } from './composicao/servidor'

const configuracao = lerConfiguracao(process.env)
if (!configuracao.ok) {
  process.stderr.write(`configuração inválida:\n- ${configuracao.erro.join('\n- ')}\n`)
  process.exit(1)
}
const { app, encerrar, limparDadosAntigos } = montarServidor(configuracao.valor)
app.listen(configuracao.valor.porta)
process.stdout.write(`api ouvindo na porta ${app.server?.port ?? configuracao.valor.porta}\n`)

const UMA_HORA_EM_MS = 3_600_000
const limpar = () =>
  limparDadosAntigos().then(
    (r) =>
      process.stdout.write(
        `limpeza: ${r.mensagens} hashes, ${r.avisos} avisos, ${r.pareamentos} códigos apagados\n`,
      ),
    () => process.stderr.write('limpeza de dados antigos falhou\n'),
  )
void limpar()
const limpeza = setInterval(() => void limpar(), UMA_HORA_EM_MS)

const parar = () => {
  clearInterval(limpeza)
  void encerrar().finally(() => process.exit(0))
}
process.on('SIGTERM', parar)
process.on('SIGINT', parar)
