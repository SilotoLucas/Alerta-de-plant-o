import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ehCodigoFonte, listarArquivos } from '../arquivos'
import { lerFonte, posicao, ts } from '../ast'
import type { Fase } from '../fase'
import type { Violacao } from '../relatorio'

const LISTA_DE_PERMISSAO = 'tools/quality/comentarios-permitidos.json'

type Permissao = { readonly arquivo: string; readonly trecho: string; readonly motivo: string }

type Comentario = { readonly texto: string; readonly linha: number; readonly coluna: number }

const PASTAS_DE_CODIGO = /^(packages|apps|tools)\//

const comentariosDe = (fonte: ts.SourceFile): readonly Comentario[] => {
  const vistos = new Map<number, Comentario>()
  const texto = fonte.getFullText()
  const registrar = (inicio: number): void => {
    const faixas = [
      ...(ts.getLeadingCommentRanges(texto, inicio) ?? []),
      ...(ts.getTrailingCommentRanges(texto, inicio) ?? []),
    ]
    for (const faixa of faixas) {
      if (vistos.has(faixa.pos)) continue
      vistos.set(faixa.pos, {
        texto: texto.slice(faixa.pos, faixa.end),
        ...posicao(fonte, faixa.pos),
      })
    }
  }
  const percorrer = (no: ts.Node): void => {
    registrar(no.getFullStart())
    for (const filho of no.getChildren(fonte)) percorrer(filho)
  }
  percorrer(fonte)
  registrar(fonte.endOfFileToken.getFullStart())
  return [...vistos.values()]
}

const lerPermissoes = (raiz: string): readonly Permissao[] => {
  const caminho = join(raiz, LISTA_DE_PERMISSAO)
  return existsSync(caminho) ? JSON.parse(readFileSync(caminho, 'utf8')) : []
}

export const comentario: Fase = {
  nome: 'comentario',
  ferramenta: 'comentario',
  modos: ['quick', 'full'],
  executar: async (raiz) => {
    const permissoes = lerPermissoes(raiz)
    const usadas = new Set<Permissao>()
    const arquivos = (await listarArquivos(raiz)).filter(
      (arquivo) => PASTAS_DE_CODIGO.test(arquivo) && ehCodigoFonte(arquivo),
    )
    const violacoes: Violacao[] = []
    for (const arquivo of arquivos) {
      for (const achado of comentariosDe(lerFonte(raiz, arquivo))) {
        const permissao = permissoes.find(
          (item) => item.arquivo === arquivo && achado.texto.includes(item.trecho),
        )
        if (permissao) {
          usadas.add(permissao)
          continue
        }
        violacoes.push({
          arquivo,
          linha: achado.linha,
          coluna: achado.coluna,
          regra: 'sem-justificativa',
          fato: `comentário ${JSON.stringify(achado.texto.slice(0, 60))}`,
          correcao: `apague o comentário e deixe o nome do identificador explicar; se ele carrega um porquê que o código não diz, registre em ${LISTA_DE_PERMISSAO} com o motivo`,
        })
      }
    }
    for (const permissao of permissoes.filter((item) => !usadas.has(item))) {
      violacoes.push({
        arquivo: LISTA_DE_PERMISSAO,
        linha: 1,
        coluna: 1,
        regra: 'permissao-obsoleta',
        fato: `nenhum comentário em ${permissao.arquivo} contém ${JSON.stringify(permissao.trecho)}`,
        correcao: 'remova a entrada da lista de permissão',
      })
    }
    return violacoes
  },
}
