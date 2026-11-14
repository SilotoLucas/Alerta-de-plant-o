import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { Fase } from '../fase'
import { executar, quebrou } from '../processo'
import { FerramentaQuebrada, type Violacao } from '../relatorio'

const RELATORIO_JUNIT = '.reports/junit.xml'
export const DIRETORIO_COBERTURA = '.reports/coverage'

const CASO = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g
const ATRIBUTO = (nome: string): RegExp => new RegExp(`\\b${nome}="([^"]*)"`)
const FALHA = /<failure\b[^>]*message="([^"]*)"/

const desescapar = (texto: string): string =>
  texto
    .replace(/&#10;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

const contarTestes = (xml: string): number =>
  Number(/<testsuites\b[^>]*\btests="(\d+)"/.exec(xml)?.[1] ?? 0)

const lerJunit = (xml: string): readonly Violacao[] =>
  [...xml.matchAll(CASO)].flatMap((caso): Violacao[] => {
    const atributos = caso[1] ?? ''
    const falha = FALHA.exec(caso[3] ?? '')
    if (!falha) return []
    return [
      {
        arquivo: ATRIBUTO('file').exec(atributos)?.[1] ?? 'desconhecido',
        linha: Number(ATRIBUTO('line').exec(atributos)?.[1] ?? 1),
        coluna: 1,
        regra: 'falhou',
        fato: `"${desescapar(ATRIBUTO('name').exec(atributos)?.[1] ?? '')}": ${desescapar(falha[1] ?? '')}`,
        correcao:
          'entenda por que o teste falhou antes de tocar nele; conserte o código, nunca remova a asserção nem pule o teste',
      },
    ]
  })

const SCRIPT_DE_INFRA = 'infra:verificar'

const verificarInfraestrutura = async (raiz: string): Promise<void> => {
  const caminho = join(raiz, 'package.json')
  if (!existsSync(caminho)) return
  const manifesto: { readonly scripts?: Record<string, string> } = JSON.parse(
    readFileSync(caminho, 'utf8'),
  )
  if (manifesto.scripts?.[SCRIPT_DE_INFRA] === undefined) return
  const execucao = await executar(raiz, [process.execPath, 'run', '--silent', SCRIPT_DE_INFRA])
  if (execucao.codigo !== 0)
    throw new FerramentaQuebrada(
      `infraestrutura de teste indisponível (bun run ${SCRIPT_DE_INFRA}): ${(execucao.erro || execucao.saida).trim()}`,
    )
}

export const testes: Fase = {
  nome: 'testes',
  ferramenta: 'bun-test',
  modos: ['full'],
  executar: async (raiz) => {
    await verificarInfraestrutura(raiz)
    mkdirSync(join(raiz, '.reports'), { recursive: true })
    rmSync(join(raiz, RELATORIO_JUNIT), { force: true })
    rmSync(join(raiz, DIRETORIO_COBERTURA), { recursive: true, force: true })
    const execucao = await executar(raiz, [
      process.execPath,
      'test',
      '--reporter=junit',
      `--reporter-outfile=${RELATORIO_JUNIT}`,
      '--coverage',
      '--coverage-reporter=lcov',
      `--coverage-dir=${DIRETORIO_COBERTURA}`,
    ])
    let xml = ''
    try {
      xml = readFileSync(join(raiz, RELATORIO_JUNIT), 'utf8')
    } catch {
      throw quebrou('bun test', execucao)
    }
    if (contarTestes(xml) === 0)
      throw new FerramentaQuebrada(
        'bun test não executou nenhum teste; um glob errado ou um arquivo que não carrega deixaria o gate verde por acidente',
      )
    const violacoes = lerJunit(xml)
    if (execucao.codigo !== 0 && violacoes.length === 0) throw quebrou('bun test', execucao)
    return violacoes
  },
}
