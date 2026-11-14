import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { Fase } from '../fase'
import { binario, executar, quebrou } from '../processo'
import type { Violacao } from '../relatorio'

const LINHA_GITHUB =
  /^::(error|warning) title=([^,]+),file=([^,]+),line=(\d+),endLine=\d+,col=(\d+),endColumn=\d+::(.*)$/
const GLOBAL_PROIBIDO = /global variable (\w+)/

type ConfigDoBiome = {
  readonly overrides?: readonly {
    readonly linter?: {
      readonly rules?: {
        readonly style?: {
          readonly noRestrictedGlobals?: {
            readonly options?: { readonly deniedGlobals?: Record<string, string> }
          }
        }
      }
    }
  }[]
}

const motivosDeGlobais = (config: ConfigDoBiome): ReadonlyMap<string, string> => {
  const motivos = new Map<string, string>()
  for (const override of config.overrides ?? []) {
    const negados = override.linter?.rules?.style?.noRestrictedGlobals?.options?.deniedGlobals
    for (const [nome, motivo] of Object.entries(negados ?? {})) {
      if (!motivos.has(nome)) motivos.set(nome, motivo)
    }
  }
  return motivos
}

const correcaoPara = (
  regra: string,
  fato: string,
  motivos: ReadonlyMap<string, string>,
): string => {
  if (regra === 'format') return 'rode bun run format'
  if (regra.startsWith('assist/')) return 'rode bun x biome check --write no arquivo'
  const global = GLOBAL_PROIBIDO.exec(fato)?.[1]
  const motivo = global ? motivos.get(global) : undefined
  if (motivo) return motivo
  const nome = regra.split('/').pop() ?? regra
  const kebab = nome.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`)
  return `ajuste o código conforme https://biomejs.dev/linter/rules/${kebab}`
}

const lerSaidaDoBiome = (
  saida: string,
  raiz: string,
  motivos: ReadonlyMap<string, string>,
): readonly Violacao[] =>
  saida.split('\n').flatMap((linha): Violacao[] => {
    const partes = LINHA_GITHUB.exec(linha)
    if (!partes) return []
    const [, , regra = '', arquivo = '', linhaNum = '1', coluna = '1', fato = ''] = partes
    return [
      {
        arquivo: arquivo.startsWith('/') ? relative(raiz, arquivo) : arquivo,
        linha: Number(linhaNum),
        coluna: Number(coluna),
        regra,
        fato,
        correcao: correcaoPara(regra, fato, motivos),
      },
    ]
  })

export const estilo: Fase = {
  nome: 'estilo',
  ferramenta: 'biome',
  modos: ['quick', 'full'],
  executar: async (raiz) => {
    const config: ConfigDoBiome = JSON.parse(readFileSync(join(raiz, 'biome.json'), 'utf8'))
    const execucao = await executar(raiz, [
      binario(raiz, 'biome'),
      'ci',
      '--error-on-warnings',
      '--reporter=github',
      '--colors=off',
      '.',
    ])
    const violacoes = lerSaidaDoBiome(execucao.saida, raiz, motivosDeGlobais(config))
    if (execucao.codigo !== 0 && violacoes.length === 0) throw quebrou('biome', execucao)
    return violacoes
  },
}
