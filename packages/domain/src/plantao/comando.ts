export type Comando = 'ativar' | 'desativar' | 'status'

const ATIVAR = new Set(['sai', 'sair', 'ativar', 'ativa', 'on', 'ligar'])
const DESATIVAR = new Set(['voltei', 'voltar', 'desativar', 'desativa', 'off', 'desligar'])
const STATUS = new Set(['status', '?'])

const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/\p{Mn}+/gu, '')
    .trim()
    .toLowerCase()

export const interpretarComando = (texto: string): Comando | null => {
  const palavra = normalizar(texto)
  if (ATIVAR.has(palavra)) return 'ativar'
  if (DESATIVAR.has(palavra)) return 'desativar'
  if (STATUS.has(palavra)) return 'status'
  return null
}
