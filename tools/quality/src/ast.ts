import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

export const lerFonte = (raiz: string, arquivo: string): ts.SourceFile =>
  ts.createSourceFile(
    arquivo,
    readFileSync(join(raiz, arquivo), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    arquivo.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

export const posicao = (
  fonte: ts.SourceFile,
  indice: number,
): { readonly linha: number; readonly coluna: number } => {
  const { line, character } = fonte.getLineAndCharacterOfPosition(indice)
  return { linha: line + 1, coluna: character + 1 }
}

export const visitar = (no: ts.Node, visitante: (no: ts.Node) => void): void => {
  visitante(no)
  ts.forEachChild(no, (filho) => visitar(filho, visitante))
}

export { ts }
