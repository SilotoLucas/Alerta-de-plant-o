import postgres from 'postgres'

export type Sql = postgres.Sql

export const criarConexao = (url: string): Sql =>
  postgres(url, { max: 10, onnotice: () => undefined })
