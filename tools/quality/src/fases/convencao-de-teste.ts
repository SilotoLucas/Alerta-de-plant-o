import { ehCodigoFonte, listarArquivos } from '../arquivos'
import { lerFonte, posicao, ts, visitar } from '../ast'
import type { Fase } from '../fase'
import type { Violacao } from '../relatorio'

const QUALQUER_TESTE = /\.(test|spec)\.[cm]?[jt]sx?$/
const SUFIXO_VALIDO = /\.(unit|e2e)\.test\.tsx?$/
const FUNCOES_DE_TESTE = new Set(['test', 'it', 'describe'])
const MODIFICADORES_PROIBIDOS = new Set(['skip', 'only', 'todo', 'skipIf', 'if', 'failing'])

const sufixoErrado = (arquivo: string): readonly Violacao[] =>
  QUALQUER_TESTE.test(arquivo) && !SUFIXO_VALIDO.test(arquivo)
    ? [
        {
          arquivo,
          linha: 1,
          coluna: 1,
          regra: 'sufixo',
          fato: 'teste sem sufixo .unit.test.ts nem .e2e.test.ts',
          correcao:
            'renomeie para .unit.test.ts se não toca I/O (fakes em memória) ou .e2e.test.ts se usa infraestrutura real',
        },
      ]
    : []

const testesDesligados = (raiz: string, arquivo: string): readonly Violacao[] => {
  const fonte = lerFonte(raiz, arquivo)
  const violacoes: Violacao[] = []
  visitar(fonte, (no) => {
    if (!ts.isPropertyAccessExpression(no)) return
    if (!ts.isIdentifier(no.expression) || !FUNCOES_DE_TESTE.has(no.expression.text)) return
    if (!MODIFICADORES_PROIBIDOS.has(no.name.text)) return
    violacoes.push({
      arquivo,
      ...posicao(fonte, no.getStart(fonte)),
      regra: 'teste-desligado',
      fato: `${no.expression.text}.${no.name.text} desliga ou isola teste`,
      correcao:
        'remova o modificador; teste quebrado se conserta, teste que não vale mais se apaga com motivo no commit',
    })
  })
  return violacoes
}

export const convencaoDeTeste: Fase = {
  nome: 'convencao-de-teste',
  ferramenta: 'teste',
  modos: ['quick', 'full'],
  executar: async (raiz) => {
    const arquivos = await listarArquivos(raiz)
    return [
      ...arquivos.flatMap(sufixoErrado),
      ...arquivos
        .filter((arquivo) => ehCodigoFonte(arquivo) && SUFIXO_VALIDO.test(arquivo))
        .flatMap((arquivo) => testesDesligados(raiz, arquivo)),
    ]
  },
}
