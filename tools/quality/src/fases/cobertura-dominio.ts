import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ehCodigoFonte, listarArquivos, TESTE } from '../arquivos'
import { lerFonte, ts } from '../ast'
import type { Fase } from '../fase'
import { FerramentaQuebrada, type Violacao } from '../relatorio'
import { DIRETORIO_COBERTURA } from './testes'

const DOMINIO = /^packages\/(domain|apresentacao)\/src\//

type Cobertura = { readonly linhasSemExecucao: readonly number[] }

const lerLcov = (lcov: string): ReadonlyMap<string, Cobertura> => {
  const mapa = new Map<string, Cobertura>()
  for (const registro of lcov.split('end_of_record')) {
    const arquivo = /^SF:(.+)$/m.exec(registro)?.[1]?.trim()
    if (!arquivo) continue
    const linhasSemExecucao = [...registro.matchAll(/^DA:(\d+),0$/gm)].map((linha) =>
      Number(linha[1]),
    )
    mapa.set(arquivo, { linhasSemExecucao })
  }
  return mapa
}

const ehDeclare = (declaracao: ts.Statement): boolean =>
  ts.canHaveModifiers(declaracao) &&
  (ts.getModifiers(declaracao) ?? []).some(
    (modificador) => modificador.kind === ts.SyntaxKind.DeclareKeyword,
  )

const ehSoTipo = (declaracao: ts.Statement): boolean =>
  ehDeclare(declaracao) ||
  ts.isInterfaceDeclaration(declaracao) ||
  ts.isTypeAliasDeclaration(declaracao) ||
  (ts.isImportDeclaration(declaracao) && declaracao.importClause?.isTypeOnly === true) ||
  (ts.isExportDeclaration(declaracao) && declaracao.isTypeOnly)

const ehReexportacao = (declaracao: ts.Statement): boolean =>
  ts.isExportDeclaration(declaracao) && declaracao.moduleSpecifier !== undefined

const temCodigoExecutavel = (raiz: string, arquivo: string): boolean =>
  lerFonte(raiz, arquivo).statements.some(
    (declaracao) => !ehSoTipo(declaracao) && !ehReexportacao(declaracao),
  )

const CORRECAO =
  'escreva o teste unitário irmão que exercita esta linha; domínio é lógica pura e a meta é 100% de linha'

export const coberturaDominio: Fase = {
  nome: 'cobertura-dominio',
  ferramenta: 'cobertura',
  modos: ['full'],
  executar: async (raiz) => {
    const caminho = join(raiz, DIRETORIO_COBERTURA, 'lcov.info')
    if (!existsSync(caminho))
      throw new FerramentaQuebrada(
        `${DIRETORIO_COBERTURA}/lcov.info não existe; a fase testes precisa rodar antes`,
      )
    const cobertura = lerLcov(readFileSync(caminho, 'utf8'))
    const fontes = (await listarArquivos(raiz)).filter(
      (arquivo) =>
        DOMINIO.test(arquivo) &&
        ehCodigoFonte(arquivo) &&
        !TESTE.test(arquivo) &&
        temCodigoExecutavel(raiz, arquivo),
    )
    return fontes.flatMap((arquivo): Violacao[] => {
      const registro = cobertura.get(arquivo)
      if (!registro)
        return [
          {
            arquivo,
            linha: 1,
            coluna: 1,
            regra: 'nao-carregado',
            fato: 'nenhum teste carrega este arquivo do domínio',
            correcao: CORRECAO,
          },
        ]
      return registro.linhasSemExecucao.map((linha) => ({
        arquivo,
        linha,
        coluna: 1,
        regra: 'linha-descoberta',
        fato: 'linha do domínio nunca executada pelos testes',
        correcao: CORRECAO,
      }))
    })
  },
}
