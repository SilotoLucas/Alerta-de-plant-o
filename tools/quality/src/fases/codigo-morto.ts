import type { Fase } from '../fase'
import { binario, executar, quebrou } from '../processo'
import type { Violacao } from '../relatorio'

type Item = { readonly name: string; readonly line?: number; readonly col?: number }
type Problema = { readonly file: string } & Record<string, unknown>

const CORRECOES: Readonly<Record<string, string>> = {
  files: 'apague o arquivo, ou importe a partir do index.ts do pacote se ele deveria ser usado',
  dependencies: 'remova a dependência do package.json (bun remove) ou passe a usá-la de fato',
  devDependencies: 'remova a dependência de desenvolvimento do package.json',
  unlisted: 'declare a dependência no package.json deste pacote com versão exata',
  unresolved: 'corrija o caminho do import ou instale o pacote',
  exports: 'remova o export, ou deixe de exportar se só é usado no próprio arquivo',
  types: 'remova o export do tipo, ou deixe de exportar se só é usado no próprio arquivo',
  binaries: 'declare o pacote que fornece o binário no package.json',
}

const ehItem = (valor: unknown): valor is Item =>
  typeof valor === 'object' && valor !== null && 'name' in valor

const lerSaidaDoKnip = (json: { readonly issues: readonly Problema[] }): readonly Violacao[] =>
  json.issues.flatMap((problema) =>
    Object.entries(problema).flatMap(([tipo, valor]): Violacao[] => {
      if (!Array.isArray(valor)) return []
      return valor.filter(ehItem).map((item) => ({
        arquivo: problema.file,
        linha: item.line ?? 1,
        coluna: item.col ?? 1,
        regra: tipo,
        fato: `${item.name} sem uso (${tipo})`,
        correcao: CORRECOES[tipo] ?? 'veja a categoria na documentação do knip e remova a sobra',
      }))
    }),
  )

export const codigoMorto: Fase = {
  nome: 'codigo-morto',
  ferramenta: 'knip',
  modos: ['full'],
  executar: async (raiz) => {
    const execucao = await executar(raiz, [
      binario(raiz, 'knip'),
      '--reporter',
      'json',
      '--no-progress',
      '--no-config-hints',
    ])
    if (execucao.codigo > 1) throw quebrou('knip', execucao)
    try {
      return lerSaidaDoKnip(JSON.parse(execucao.saida))
    } catch {
      throw quebrou('knip', execucao)
    }
  },
}
