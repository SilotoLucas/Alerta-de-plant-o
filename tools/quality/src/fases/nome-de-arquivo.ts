import type { Fase } from '../fase'
import { binario, executar, quebrou } from '../processo'
import type { Violacao } from '../relatorio'

const FALHA = /^(.+?) failed for `([^`]+)` rules: (.+)$/

const lerSaidaDoLsLint = (saida: string): readonly Violacao[] =>
  saida.split('\n').flatMap((linha): Violacao[] => {
    const partes = FALHA.exec(linha.trim())
    if (!partes) return []
    const [, arquivo = '', extensao = '', regras = ''] = partes
    return [
      {
        arquivo,
        linha: 1,
        coluna: 1,
        regra: extensao,
        fato: `nome fora da convenção (${regras})`,
        correcao:
          'renomeie para kebab-case (ou para o padrão listado em .ls-lint.yml para esta pasta) e atualize os imports',
      },
    ]
  })

export const nomeDeArquivo: Fase = {
  nome: 'nome-de-arquivo',
  ferramenta: 'ls-lint',
  modos: ['quick', 'full'],
  executar: async (raiz) => {
    const execucao = await executar(raiz, [binario(raiz, 'ls-lint')])
    const violacoes = lerSaidaDoLsLint(`${execucao.saida}\n${execucao.erro}`)
    if (execucao.codigo !== 0 && violacoes.length === 0) throw quebrou('ls-lint', execucao)
    return violacoes
  },
}
