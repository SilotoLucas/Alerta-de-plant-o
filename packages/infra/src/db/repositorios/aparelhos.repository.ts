import type { RepositorioDeAparelhos, RepositorioDePareamentos } from '@plantao/application'
import {
  type Aparelho,
  type AparelhoId,
  instante,
  type Papel,
  type Pareamento,
} from '@plantao/domain'
import type { Sql } from '../conexao'

type LinhaDeAparelho = {
  id: string
  papel: Papel
  nome: string
  criado_em: Date
}

const paraAparelho = (linha: LinhaDeAparelho): Aparelho => ({
  id: linha.id as AparelhoId,
  papel: linha.papel,
  nome: linha.nome,
  criadoEm: instante(linha.criado_em.getTime()),
})

export const repositorioDeAparelhos = (sql: Sql): RepositorioDeAparelhos => ({
  inserir: async (aparelho, tokenHash) => {
    await sql`
      insert into aparelhos (id, papel, nome, token_hash, criado_em)
      values (${aparelho.id}, ${aparelho.papel}, ${aparelho.nome}, ${tokenHash},
        ${new Date(aparelho.criadoEm)})`
  },
  buscarPorTokenHash: async (tokenHash) => {
    const [linha] = await sql<LinhaDeAparelho[]>`
      select id, papel, nome, criado_em from aparelhos where token_hash = ${tokenHash}`
    return linha ? paraAparelho(linha) : null
  },
  listar: async () =>
    (
      await sql<LinhaDeAparelho[]>`
        select id, papel, nome, criado_em from aparelhos order by criado_em, id`
    ).map(paraAparelho),
  remover: async (id) => {
    const removidos = await sql`delete from aparelhos where id = ${id} returning id`
    return removidos.length > 0
  },
})

type LinhaDePareamento = { codigo: string; papel: Papel; criado_em: Date; expira_em: Date }

export const repositorioDePareamentos = (sql: Sql): RepositorioDePareamentos => ({
  inserir: async (pareamento) => {
    const gravados = await sql`
      insert into pareamentos (codigo, papel, criado_em, expira_em)
      values (${pareamento.codigo}, ${pareamento.papel}, ${new Date(pareamento.criadoEm)},
        ${new Date(pareamento.expiraEm)})
      on conflict (codigo) do update
        set papel = excluded.papel, criado_em = excluded.criado_em, expira_em = excluded.expira_em
        where pareamentos.expira_em <= excluded.criado_em
      returning codigo`
    return gravados.length > 0
  },
  consumir: async (codigo, agora) => {
    const [linha] = await sql<LinhaDePareamento[]>`
      delete from pareamentos where codigo = ${codigo} and expira_em > ${new Date(agora)}
      returning codigo, papel, criado_em, expira_em`
    if (!linha) return null
    const pareamento: Pareamento = {
      codigo: linha.codigo,
      papel: linha.papel,
      criadoEm: instante(linha.criado_em.getTime()),
      expiraEm: instante(linha.expira_em.getTime()),
    }
    return pareamento
  },
})
