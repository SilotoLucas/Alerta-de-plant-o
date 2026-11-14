import { err, ok, type Result } from '@plantao/domain'
import type { ConfiguracaoDosLimites } from '../http/limite'

export type Configuracao = {
  readonly porta: number
  readonly bancoUrl: string
  readonly tokenDeAdmin: string
  readonly enviarTexto: boolean
  readonly limites: ConfiguracaoDosLimites
}

type Ambiente = Record<string, string | undefined>

const PADROES = {
  API_PORT: '3350',
  DATABASE_URL: 'postgres://plantao:plantao@localhost:5435/plantao',
  PLANTAO_ENVIAR_TEXTO: 'false',
  CONFIAR_NO_PROXY: 'false',
  LIMITE_GERAL_POR_MINUTO: '300',
  LIMITE_DE_PAREAMENTO_POR_MINUTO: '5',
} as const

const TAMANHO_MINIMO_DO_TOKEN_DE_ADMIN = 16

type Chave = keyof typeof PADROES

const ler = (ambiente: Ambiente, chave: Chave): string => {
  const valor = ambiente[chave]?.trim()
  return valor ? valor : PADROES[chave]
}

const inteiro = (
  ambiente: Ambiente,
  chave: Chave,
  minimo: number,
  maximo: number,
  problemas: string[],
): number => {
  const valor = Number(ler(ambiente, chave))
  if (Number.isInteger(valor) && valor >= minimo && valor <= maximo) return valor
  problemas.push(`${chave} deve ser um inteiro entre ${minimo} e ${maximo}`)
  return Number(PADROES[chave])
}

const booleano = (ambiente: Ambiente, chave: Chave, problemas: string[]): boolean => {
  const valor = ler(ambiente, chave)
  if (valor === 'true' || valor === 'false') return valor === 'true'
  problemas.push(`${chave} deve ser true ou false`)
  return false
}

export const lerConfiguracao = (ambiente: Ambiente): Result<Configuracao, readonly string[]> => {
  const problemas: string[] = []
  const tokenDeAdmin = ambiente['PLANTAO_ADMIN_TOKEN']?.trim() ?? ''
  if (tokenDeAdmin.length < TAMANHO_MINIMO_DO_TOKEN_DE_ADMIN)
    problemas.push(
      `PLANTAO_ADMIN_TOKEN deve ter pelo menos ${TAMANHO_MINIMO_DO_TOKEN_DE_ADMIN} caracteres`,
    )
  if (ambiente['NODE_ENV'] === 'production' && !ambiente['DATABASE_URL']?.trim())
    problemas.push('DATABASE_URL não definida')
  const porta = inteiro(ambiente, 'API_PORT', 1, 65_535, problemas)
  const geralPorMinuto = inteiro(ambiente, 'LIMITE_GERAL_POR_MINUTO', 1, 100_000, problemas)
  const pareamentoPorMinuto = inteiro(
    ambiente,
    'LIMITE_DE_PAREAMENTO_POR_MINUTO',
    1,
    10_000,
    problemas,
  )
  const enviarTexto = booleano(ambiente, 'PLANTAO_ENVIAR_TEXTO', problemas)
  const confiarNoProxy = booleano(ambiente, 'CONFIAR_NO_PROXY', problemas)
  if (problemas.length > 0) return err(problemas)
  return ok({
    porta,
    bancoUrl: ler(ambiente, 'DATABASE_URL'),
    tokenDeAdmin,
    enviarTexto,
    limites: { geralPorMinuto, pareamentoPorMinuto, confiarNoProxy },
  })
}
