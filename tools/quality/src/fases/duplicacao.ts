import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Fase } from '../fase'
import { binario, executar, quebrou } from '../processo'
import type { Violacao } from '../relatorio'

type Trecho = {
  readonly name: string
  readonly startLoc: { readonly line: number; readonly column: number }
  readonly endLoc: { readonly line: number }
}

type Relatorio = {
  readonly duplicates: readonly { readonly firstFile: Trecho; readonly secondFile: Trecho }[]
}

const semPontoBarra = (caminho: string): string => caminho.replace(/^\.\//, '')

const lerRelatorioDoJscpd = (relatorio: Relatorio): readonly Violacao[] =>
  relatorio.duplicates.map(({ firstFile, secondFile }) => ({
    arquivo: semPontoBarra(secondFile.name),
    linha: secondFile.startLoc.line,
    coluna: secondFile.startLoc.column + 1,
    regra: 'clone',
    fato: `linhas ${secondFile.startLoc.line}-${secondFile.endLoc.line} repetem ${semPontoBarra(firstFile.name)}:${firstFile.startLoc.line}-${firstFile.endLoc.line}`,
    correcao:
      'extraia o trecho comum para uma função no módulo dono do conceito e chame dos dois lugares',
  }))

export const duplicacao: Fase = {
  nome: 'duplicacao',
  ferramenta: 'jscpd',
  modos: ['full'],
  executar: async (raiz) => {
    const saidaTemporaria = mkdtempSync(join(tmpdir(), 'jscpd-'))
    try {
      const execucao = await executar(raiz, [
        binario(raiz, 'jscpd'),
        '--config',
        '.jscpd.json',
        '--reporters',
        'json',
        '--output',
        saidaTemporaria,
        '--silent',
        '--exit-code',
        '1',
        '.',
      ])
      if (execucao.codigo > 1) throw quebrou('jscpd', execucao)
      try {
        return lerRelatorioDoJscpd(
          JSON.parse(readFileSync(join(saidaTemporaria, 'jscpd-report.json'), 'utf8')),
        )
      } catch {
        throw quebrou('jscpd', execucao)
      }
    } finally {
      rmSync(saidaTemporaria, { recursive: true, force: true })
    }
  },
}
