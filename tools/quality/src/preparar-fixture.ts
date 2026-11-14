import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Fase } from './fase'
import type { Violacao } from './relatorio'

const RAIZ_DO_REPO = resolve(import.meta.dir, '..', '..', '..')
const FIXTURES = join(RAIZ_DO_REPO, 'tools', 'quality', 'fixtures')
const MODULOS_FALSOS = 'modulos-falsos'
const CONFIGURACOES = [
  'biome.json',
  '.dependency-cruiser.cjs',
  '.ls-lint.yml',
  '.jscpd.json',
  '.gitleaks.toml',
]

const EM_USO = join(RAIZ_DO_REPO, 'tools', 'quality', '.fixtures-em-uso')

const montarModulosFalsos = (destino: string, fixture: string): void => {
  const falsos = join(fixture, MODULOS_FALSOS)
  if (existsSync(falsos)) cpSync(falsos, join(destino, 'node_modules'), { recursive: true })
}

export const prepararFixture = async (nome: string): Promise<string> => {
  const fixture = join(FIXTURES, nome)
  mkdirSync(EM_USO, { recursive: true })
  const destino = mkdtempSync(join(EM_USO, `${nome}-`))
  cpSync(fixture, destino, {
    recursive: true,
    filter: (origem) => !origem.startsWith(join(fixture, MODULOS_FALSOS)),
  })
  for (const configuracao of CONFIGURACOES)
    if (!existsSync(join(destino, configuracao)))
      cpSync(join(RAIZ_DO_REPO, configuracao), join(destino, configuracao))
  montarModulosFalsos(destino, fixture)
  writeFileSync(join(destino, '.gitignore'), 'node_modules/\n.reports/\n.env\n')
  await Bun.spawn(['git', 'init', '-q'], { cwd: destino }).exited
  return destino
}

export const removerFixture = (destino: string): void => {
  rmSync(destino, { recursive: true, force: true })
}

export type Achado = Pick<Violacao, 'arquivo' | 'regra'>

export const achados = (violacoes: readonly Violacao[]): readonly Achado[] =>
  violacoes
    .map(({ arquivo, regra }) => ({ arquivo, regra }))
    .sort((a, b) => a.arquivo.localeCompare(b.arquivo) || a.regra.localeCompare(b.regra))

export const rodarNaFixture = async (fase: Fase, nome: string): Promise<readonly Violacao[]> => {
  const destino = await prepararFixture(nome)
  try {
    return await fase.executar(destino)
  } finally {
    removerFixture(destino)
  }
}
