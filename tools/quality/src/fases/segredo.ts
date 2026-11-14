import { listarArquivos } from '../arquivos'
import type { Fase } from '../fase'
import { binario, executar, quebrou } from '../processo'
import type { Violacao } from '../relatorio'

type Achado = {
  readonly RuleID: string
  readonly Description: string
  readonly File: string
  readonly StartLine: number
  readonly StartColumn: number
}

const lerSaidaDoGitleaks = (achados: readonly Achado[]): readonly Violacao[] =>
  achados.map((achado) => ({
    arquivo: achado.File,
    linha: achado.StartLine,
    coluna: achado.StartColumn,
    regra: achado.RuleID,
    fato: `${achado.Description} (valor omitido)`,
    correcao:
      'tire o segredo do arquivo, leia de variável de ambiente e, se já foi commitado ou compartilhado, rotacione a credencial antes de qualquer outra coisa',
  }))

export const segredo: Fase = {
  nome: 'segredo',
  ferramenta: 'gitleaks',
  modos: ['quick', 'full'],
  executar: async (raiz) => {
    const execucao = await executar(raiz, [
      binario(raiz, 'gitleaks'),
      'dir',
      '.',
      '--config',
      '.gitleaks.toml',
      '--redact',
      '--no-banner',
      '--log-level',
      'error',
      '--report-format',
      'json',
      '--report-path',
      '-',
      '--exit-code',
      '1',
    ])
    if (execucao.codigo > 1) throw quebrou('gitleaks', execucao)
    let achados: readonly Achado[]
    try {
      achados = JSON.parse(execucao.saida || '[]')
    } catch {
      throw quebrou('gitleaks', execucao)
    }
    const versionaveis = new Set(await listarArquivos(raiz))
    return lerSaidaDoGitleaks(achados.filter((achado) => versionaveis.has(achado.File)))
  },
}
