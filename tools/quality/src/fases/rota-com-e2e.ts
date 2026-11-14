import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { listarArquivos, TESTE } from '../arquivos'
import { lerFonte, posicao, ts, visitar } from '../ast'
import type { Fase } from '../fase'
import type { Violacao } from '../relatorio'

const ROTAS = /^apps\/api\/src\/http\/rotas\/.+\.ts$/
const E2E = /^apps\/api\/.+\.e2e\.test\.ts$/
const METODOS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'ws'])

type Rota = {
  readonly metodo: string
  readonly caminho: string
  readonly linha: number
  readonly coluna: number
}

const prefixoDe = (fonte: ts.SourceFile): string => {
  let prefixo = ''
  visitar(fonte, (no) => {
    if (!ts.isPropertyAssignment(no) || no.name.getText(fonte) !== 'prefix') return
    if (ts.isStringLiteral(no.initializer)) prefixo = no.initializer.text
  })
  return prefixo
}

const normalizar = (caminho: string): string =>
  caminho.length > 1 && caminho.endsWith('/') ? caminho.slice(0, -1) : caminho

const rotasDeclaradas = (fonte: ts.SourceFile): readonly Rota[] => {
  const prefixo = prefixoDe(fonte)
  const rotas: Rota[] = []
  visitar(fonte, (no) => {
    if (!ts.isCallExpression(no) || !ts.isPropertyAccessExpression(no.expression)) return
    const metodo = no.expression.name.text
    const [primeiro] = no.arguments
    if (!METODOS.has(metodo) || !primeiro || !ts.isStringLiteralLike(primeiro)) return
    rotas.push({
      metodo: metodo.toUpperCase(),
      caminho: normalizar(`${prefixo}${primeiro.text}`),
      ...posicao(fonte, no.expression.name.getStart(fonte)),
    })
  })
  return rotas
}

const escapar = (texto: string): string => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const padraoDoCaminho = (caminho: string): RegExp =>
  new RegExp(
    `${caminho
      .split(/(:[A-Za-z0-9_]+)/)
      .map((parte) => (parte.startsWith(':') ? '[^\\s\'"`]+' : escapar(parte)))
      .join('')}(?![A-Za-z0-9_/-])`,
  )

export const rotaComE2e: Fase = {
  nome: 'rota-com-e2e',
  ferramenta: 'evidencia',
  modos: ['full'],
  executar: async (raiz) => {
    const arquivos = await listarArquivos(raiz)
    const evidencia = arquivos
      .filter((arquivo) => E2E.test(arquivo))
      .map((arquivo) => readFileSync(join(raiz, arquivo), 'utf8'))
      .join('\n')
    return arquivos
      .filter((arquivo) => ROTAS.test(arquivo) && !TESTE.test(arquivo))
      .flatMap((arquivo) =>
        rotasDeclaradas(lerFonte(raiz, arquivo))
          .filter((rota) => !padraoDoCaminho(rota.caminho).test(evidencia))
          .map(
            (rota): Violacao => ({
              arquivo,
              linha: rota.linha,
              coluna: rota.coluna,
              regra: 'rota-sem-e2e',
              fato: `${rota.metodo} ${rota.caminho} não aparece em nenhum *.e2e.test.ts de apps/api`,
              correcao:
                'escreva um e2e que chame essa rota contra o servidor real, incluindo o caso negativo (404 para recurso de outro usuário)',
            }),
          ),
      )
  },
}
