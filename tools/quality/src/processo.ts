import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { FerramentaQuebrada } from './relatorio'

export type Execucao = {
  readonly codigo: number
  readonly saida: string
  readonly erro: string
}

const procurarAcima = (diretorio: string, nome: string): string | null => {
  const candidato = join(diretorio, 'node_modules', '.bin', nome)
  if (existsSync(candidato)) return candidato
  const pai = dirname(diretorio)
  return pai === diretorio ? null : procurarAcima(pai, nome)
}

export const binario = (raiz: string, nome: string): string => {
  const local = procurarAcima(raiz, nome)
  if (local) return local
  const global = Bun.which(nome)
  if (global) return global
  throw new FerramentaQuebrada(
    `binário ${nome} não encontrado em node_modules/.bin nem no PATH. Rode bun install (ou instale ${nome}).`,
  )
}

export const executar = async (raiz: string, comando: readonly string[]): Promise<Execucao> => {
  const filho = Bun.spawn([...comando], {
    cwd: raiz,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  })
  const [saida, erro, codigo] = await Promise.all([
    new Response(filho.stdout).text(),
    new Response(filho.stderr).text(),
    filho.exited,
  ])
  return { codigo, saida, erro }
}

export const quebrou = (ferramenta: string, execucao: Execucao): FerramentaQuebrada =>
  new FerramentaQuebrada(
    `${ferramenta} saiu com código ${execucao.codigo} sem violação reconhecível: ${(execucao.erro || execucao.saida).slice(0, 400)}`,
  )
