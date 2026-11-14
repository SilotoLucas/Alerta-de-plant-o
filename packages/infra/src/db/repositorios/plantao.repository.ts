import type {
  AvisoRegistrado,
  RegistroDeMensagens,
  RepositorioDeAvisos,
  RepositorioDoPlantao,
} from '@plantao/application'
import {
  type AparelhoId,
  type AvisoId,
  assinaturaNaConversa,
  instante,
  type Mensagem,
} from '@plantao/domain'
import type { Sql } from '../conexao'

const hashDaAssinatura = (assinatura: string): string =>
  new Bun.CryptoHasher('sha256').update(assinatura).digest('hex')

export const registroDeMensagens = (sql: Sql): RegistroDeMensagens => ({
  registrarNovas: async (aparelhoId, conversa, mensagens, agora) => {
    const hashes = mensagens.map((mensagem) =>
      hashDaAssinatura(assinaturaNaConversa(conversa, mensagem)),
    )
    const linhas = [...new Set(hashes)].map((assinatura) => ({
      aparelho_id: aparelhoId,
      assinatura,
      registrada_em: new Date(agora),
    }))
    const gravadas = await sql<{ assinatura: string }[]>`
      insert into mensagens_vistas ${sql(linhas)}
      on conflict do nothing
      returning assinatura`
    const novas = new Set(gravadas.map((linha) => linha.assinatura))
    const novasEmOrdem: Mensagem[] = []
    mensagens.forEach((mensagem, indice) => {
      const hash = hashes[indice]
      if (hash !== undefined && novas.delete(hash)) novasEmOrdem.push(mensagem)
    })
    return novasEmOrdem
  },
})

type LinhaDeAviso = {
  id: string
  aparelho_id: string
  titulo: string
  texto: string
  criado_em: Date
  visto_em: Date | null
}

const paraAviso = (linha: LinhaDeAviso): AvisoRegistrado => ({
  id: linha.id as AvisoId,
  aparelhoId: linha.aparelho_id as AparelhoId,
  titulo: linha.titulo,
  texto: linha.texto,
  criadoEm: instante(linha.criado_em.getTime()),
  vistoEm: linha.visto_em === null ? null : instante(linha.visto_em.getTime()),
})

export const repositorioDeAvisos = (sql: Sql): RepositorioDeAvisos => ({
  inserir: async (aviso) => {
    await sql`
      insert into avisos (id, aparelho_id, titulo, texto, criado_em)
      values (${aviso.id}, ${aviso.aparelhoId}, ${aviso.titulo}, ${aviso.texto},
        ${new Date(aviso.criadoEm)})`
  },
  marcarVisto: async (aparelhoId, id, em) => {
    const marcados = await sql`
      update avisos set visto_em = coalesce(visto_em, ${new Date(em)})
      where id = ${id} and aparelho_id = ${aparelhoId}
      returning id`
    return marcados.length > 0
  },
  pendentes: async (aparelhoId, depoisDe, desde) =>
    (
      await sql<LinhaDeAviso[]>`
        select id, aparelho_id, titulo, texto, criado_em, visto_em from avisos
        where aparelho_id = ${aparelhoId} and visto_em is null and criado_em >= ${new Date(desde)}
          and (${depoisDe}::uuid is null or id > ${depoisDe}::uuid)
        order by id limit 50`
    ).map(paraAviso),
})

export const repositorioDoPlantao = (sql: Sql): RepositorioDoPlantao => ({
  ler: async (aparelhoId) => {
    const [linha] = await sql<{ plantao_ativo: boolean; plantao_alterado_em: Date | null }[]>`
      select plantao_ativo, plantao_alterado_em from aparelhos where id = ${aparelhoId}`
    return {
      ativo: linha?.plantao_ativo ?? false,
      alteradoEm: linha?.plantao_alterado_em ? instante(linha.plantao_alterado_em.getTime()) : null,
    }
  },
  definir: async (aparelhoId, ativo, em) => {
    await sql`
      update aparelhos set plantao_ativo = ${ativo}, plantao_alterado_em = ${new Date(em)}
      where id = ${aparelhoId} and papel = 'pessoal'`
  },
  pessoaisEmPlantao: async () =>
    (await sql<{ id: string }[]>`select id from aparelhos where plantao_ativo order by id`).map(
      (linha) => linha.id as AparelhoId,
    ),
})
