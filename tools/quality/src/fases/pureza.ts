import { ehCodigoFonte, listarArquivos, TESTE } from '../arquivos'
import { lerFonte, posicao, ts, visitar } from '../ast'
import type { Fase } from '../fase'
import type { Violacao } from '../relatorio'

const CAMADAS_PURAS = /^packages\/(domain|application|apresentacao)\/src\//
const FAKES = /(^|\/)fakes\.ts$/

const ehMathRandom = (no: ts.Node): no is ts.PropertyAccessExpression =>
  ts.isPropertyAccessExpression(no) &&
  ts.isIdentifier(no.expression) &&
  no.expression.text === 'Math' &&
  no.name.text === 'random'

const violacoesEm = (raiz: string, arquivo: string): readonly Violacao[] => {
  const fonte = lerFonte(raiz, arquivo)
  const violacoes: Violacao[] = []
  visitar(fonte, (no) => {
    if (ts.isThrowStatement(no))
      violacoes.push({
        arquivo,
        ...posicao(fonte, no.getStart(fonte)),
        regra: 'throw',
        fato: 'throw em domain/application',
        correcao:
          'devolva err(codigo) com Result; o código de erro entra na união do contexto e no error-map da borda HTTP',
      })
    if (ehMathRandom(no))
      violacoes.push({
        arquivo,
        ...posicao(fonte, no.getStart(fonte)),
        regra: 'aleatorio',
        fato: 'Math.random em domain/application',
        correcao:
          'receba o valor pronto ou use a porta GeradorDeId; aleatório torna a regra intestável',
      })
  })
  return violacoes
}

export const pureza: Fase = {
  nome: 'pureza',
  ferramenta: 'arquitetura',
  modos: ['quick', 'full'],
  executar: async (raiz) =>
    (await listarArquivos(raiz))
      .filter(
        (arquivo) =>
          CAMADAS_PURAS.test(arquivo) &&
          ehCodigoFonte(arquivo) &&
          !TESTE.test(arquivo) &&
          !FAKES.test(arquivo),
      )
      .flatMap((arquivo) => violacoesEm(raiz, arquivo)),
}
