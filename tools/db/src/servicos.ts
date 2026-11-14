export type Servico = {
  readonly nome: string
  readonly imagem: string
  readonly argumentos: readonly string[]
}

export const BANCO: Servico = {
  nome: 'plantao-db',
  imagem: 'postgres:18.2-alpine',
  argumentos: [
    '-p',
    '5435:5432',
    '-e',
    'POSTGRES_USER=plantao',
    '-e',
    'POSTGRES_PASSWORD=plantao',
    '-e',
    'POSTGRES_DB=plantao',
    '-v',
    'plantao-db-dados:/var/lib/postgresql',
  ],
}

export const BANCOS = ['plantao', 'plantao_teste'] as const

export const URL_PADRAO = 'postgres://plantao:plantao@localhost:5435/plantao'
