import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { executar, quebrou } from './processo'

const FIXTURES = /^tools\/quality\/(fixtures|\.fixtures-em-uso)\//

export const listarArquivos = async (raiz: string): Promise<readonly string[]> => {
  const execucao = await executar(raiz, [
    'git',
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
  ])
  if (execucao.codigo !== 0) throw quebrou('git ls-files', execucao)
  return execucao.saida
    .split('\n')
    .filter((arquivo) => arquivo.length > 0 && !FIXTURES.test(arquivo))
    .filter((arquivo) => existsSync(join(raiz, arquivo)))
    .sort()
}

export const CODIGO = /\.(ts|tsx)$/
export const DECLARACAO = /\.d\.ts$/
export const TESTE = /\.test\.tsx?$/

export const ehCodigoFonte = (arquivo: string): boolean =>
  CODIGO.test(arquivo) && !DECLARACAO.test(arquivo)
