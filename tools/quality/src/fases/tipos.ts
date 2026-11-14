import type { Fase } from '../fase'
import { binario, executar, quebrou } from '../processo'
import type { Violacao } from '../relatorio'

const COM_POSICAO = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/
const SEM_POSICAO = /^error (TS\d+): (.*)$/

const CORRECAO =
  'corrija o tipo neste ponto; nenhuma outra fase rodou porque o resto seria consequência deste erro'

const lerSaidaDoTsc = (saida: string): readonly Violacao[] =>
  saida.split('\n').flatMap((linha): Violacao[] => {
    const comPosicao = COM_POSICAO.exec(linha)
    if (comPosicao) {
      const [, arquivo = '', linhaNum = '1', coluna = '1', regra = '', fato = ''] = comPosicao
      return [
        {
          arquivo,
          linha: Number(linhaNum),
          coluna: Number(coluna),
          regra,
          fato,
          correcao: CORRECAO,
        },
      ]
    }
    const semPosicao = SEM_POSICAO.exec(linha)
    if (!semPosicao) return []
    const [, regra = '', fato = ''] = semPosicao
    return [{ arquivo: 'tsconfig.json', linha: 1, coluna: 1, regra, fato, correcao: CORRECAO }]
  })

export const tipos: Fase = {
  nome: 'tipos',
  ferramenta: 'tsc',
  modos: ['quick', 'full'],
  executar: async (raiz) => {
    const execucao = await executar(raiz, [binario(raiz, 'tsc'), '--build', '--pretty', 'false'])
    const violacoes = lerSaidaDoTsc(execucao.saida)
    if (execucao.codigo !== 0 && violacoes.length === 0) throw quebrou('tsc', execucao)
    return violacoes
  },
}
