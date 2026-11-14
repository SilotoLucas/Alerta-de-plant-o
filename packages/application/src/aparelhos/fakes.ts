import type { Aparelho, AparelhoId, Instante, Pareamento } from '@plantao/domain'
import { idsSequenciais, relogioParado } from '../compartilhado/fakes'
import type { RepositorioDeAparelhos, RepositorioDePareamentos, Segredos } from './portas'

const aparelhosEmMemoria = () => {
  const porHash = new Map<string, Aparelho>()
  const repositorio: RepositorioDeAparelhos = {
    inserir: async (aparelho, hash) => {
      porHash.set(hash, aparelho)
    },
    buscarPorTokenHash: async (hash) => porHash.get(hash) ?? null,
    listar: async () => [...porHash.values()],
    remover: async (id: AparelhoId) => {
      for (const [hash, aparelho] of porHash) if (aparelho.id === id) return porHash.delete(hash)
      return false
    },
  }
  return { repositorio, porHash }
}

const pareamentosEmMemoria = () => {
  const codigos = new Map<string, Pareamento>()
  let recusarTudo = false
  const repositorio: RepositorioDePareamentos = {
    inserir: async (pareamento) => {
      if (recusarTudo) return false
      const existente = codigos.get(pareamento.codigo)
      if (existente && existente.expiraEm > pareamento.criadoEm) return false
      codigos.set(pareamento.codigo, pareamento)
      return true
    },
    consumir: async (codigo, agora: Instante) => {
      const pareamento = codigos.get(codigo)
      if (!pareamento || pareamento.expiraEm <= agora) return null
      codigos.delete(codigo)
      return pareamento
    },
  }
  return {
    repositorio,
    codigos,
    recusarTudo: () => {
      recusarTudo = true
    },
  }
}

const segredosSequenciais = (codigos: readonly string[] = []): Segredos => {
  let token = 0
  let codigo = 0
  const hashDe = (valor: string) => `h(${valor})`
  return {
    novoCodigo: () => {
      const proximo = codigos[codigo] ?? String(codigo + 1).padStart(6, '0')
      codigo += 1
      return proximo
    },
    novoToken: () => {
      token += 1
      return { token: `token-${token}`, hash: hashDe(`token-${token}`) }
    },
    hashDe,
  }
}

export const montarAparelhos = (codigos: readonly string[] = []) => {
  const aparelhos = aparelhosEmMemoria()
  const pareamentos = pareamentosEmMemoria()
  return {
    aparelhos: aparelhos.repositorio,
    porHash: aparelhos.porHash,
    pareamentos: pareamentos.repositorio,
    codigos: pareamentos.codigos,
    recusarTodosOsCodigos: pareamentos.recusarTudo,
    segredos: segredosSequenciais(codigos),
    ids: idsSequenciais(),
    relogio: relogioParado(1_000_000 as Instante),
  }
}
