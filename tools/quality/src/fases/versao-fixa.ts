import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { listarArquivos } from '../arquivos'
import type { Fase } from '../fase'
import type { Violacao } from '../relatorio'

const EXATA = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/
const INTERNA = /^(workspace:\*|catalog:)$/
const SECOES = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

type Manifesto = Record<string, unknown> & {
  readonly workspaces?: { readonly catalog?: Record<string, string> }
}

const linhaDe = (texto: string, nome: string): number => {
  const indice = texto.indexOf(`"${nome}"`)
  return indice === -1 ? 1 : texto.slice(0, indice).split('\n').length
}

const versoesSoltas = (arquivo: string, texto: string): readonly Violacao[] => {
  const manifesto: Manifesto = JSON.parse(texto)
  const grupos: [string, Record<string, string>][] = SECOES.flatMap((secao) => {
    const valor = manifesto[secao]
    return typeof valor === 'object' && valor !== null
      ? [[secao, valor as Record<string, string>] as [string, Record<string, string>]]
      : []
  })
  if (manifesto.workspaces?.catalog) grupos.push(['catalog', manifesto.workspaces.catalog])
  return grupos.flatMap(([secao, dependencias]) =>
    Object.entries(dependencias)
      .filter(([, versao]) => !EXATA.test(versao) && !(secao !== 'catalog' && INTERNA.test(versao)))
      .map(([nome, versao]) => ({
        arquivo,
        linha: linhaDe(texto, nome),
        coluna: 1,
        regra: 'versao-solta',
        fato: `${nome}@${versao} em ${secao} não é versão exata`,
        correcao: `fixe a versão exata (sem ^, ~, * ou latest), ou use catalog: para versão compartilhada; registre o motivo em docs/arquitetura.md §F`,
      })),
  )
}

export const versaoFixa: Fase = {
  nome: 'versao-fixa',
  ferramenta: 'dependencia',
  modos: ['quick', 'full'],
  executar: async (raiz) =>
    (await listarArquivos(raiz))
      .filter((arquivo) => arquivo === 'package.json' || arquivo.endsWith('/package.json'))
      .flatMap((arquivo) => versoesSoltas(arquivo, readFileSync(join(raiz, arquivo), 'utf8'))),
}
