import {
  type Aparelho,
  type AparelhoId,
  type AvisoId,
  assinaturaNaConversa,
  type Instante,
  instante,
  type Mensagem,
} from '@plantao/domain'
import { idsSequenciais, relogioParado } from '../compartilhado/fakes'
import type {
  AvisoRegistrado,
  EstadoDoPlantao,
  Notificador,
  RegistroDeMensagens,
  RepositorioDeAvisos,
  RepositorioDoPlantao,
} from './portas'

export const EMPRESA: Aparelho = {
  id: '0192f1e2-0000-7000-8000-00000000e001' as AparelhoId,
  papel: 'empresa',
  nome: 'Celular da empresa',
  criadoEm: instante(0),
}

export const PESSOAL: Aparelho = {
  id: '0192f1e2-0000-7000-8000-00000000a001' as AparelhoId,
  papel: 'pessoal',
  nome: 'Lucas',
  criadoEm: instante(0),
}

export const OUTRO_PESSOAL: Aparelho = {
  id: '0192f1e2-0000-7000-8000-00000000a002' as AparelhoId,
  papel: 'pessoal',
  nome: 'Marina',
  criadoEm: instante(0),
}

export const montarPlantao = (incluirTexto = false) => {
  const vistas = new Set<string>()
  const avisos = new Map<string, AvisoRegistrado>()
  const estados = new Map<AparelhoId, EstadoDoPlantao>()
  const entregas: AvisoRegistrado[] = []

  const mensagens: RegistroDeMensagens = {
    registrarNovas: async (aparelhoId, conversa, lote) => {
      const novas: Mensagem[] = []
      for (const mensagem of lote) {
        const chave = `${aparelhoId}|${assinaturaNaConversa(conversa, mensagem)}`
        if (vistas.has(chave)) continue
        vistas.add(chave)
        novas.push(mensagem)
      }
      return novas
    },
  }

  const repositorioDeAvisos: RepositorioDeAvisos = {
    inserir: async (aviso) => {
      avisos.set(aviso.id, aviso)
    },
    marcarVisto: async (aparelhoId, id, em) => {
      const aviso = avisos.get(id)
      if (!aviso || aviso.aparelhoId !== aparelhoId) return false
      avisos.set(id, { ...aviso, vistoEm: aviso.vistoEm ?? em })
      return true
    },
    pendentes: async (aparelhoId, depoisDe: AvisoId | null, desde: Instante) =>
      [...avisos.values()]
        .filter(
          (aviso) =>
            aviso.aparelhoId === aparelhoId &&
            aviso.vistoEm === null &&
            aviso.criadoEm >= desde &&
            (depoisDe === null || aviso.id > depoisDe),
        )
        .sort((a, b) => (a.id < b.id ? -1 : 1)),
  }

  const plantao: RepositorioDoPlantao = {
    ler: async (id) => estados.get(id) ?? { ativo: false, alteradoEm: null },
    definir: async (id, ativo, em) => {
      estados.set(id, { ativo, alteradoEm: em })
    },
    pessoaisEmPlantao: async () =>
      [...estados].filter(([, estado]) => estado.ativo).map(([id]) => id),
  }

  const assinantes: { aparelhoId: AparelhoId; escutar: (aviso: AvisoRegistrado) => void }[] = []
  const notificador: Notificador = {
    entregar: async (aparelhoId, aviso) => {
      entregas.push(aviso)
      for (const assinante of assinantes)
        if (assinante.aparelhoId === aparelhoId) assinante.escutar(aviso)
    },
    assinar: (aparelhoId, escutar) => {
      const assinante = { aparelhoId, escutar }
      assinantes.push(assinante)
      return () => {
        assinantes.splice(assinantes.indexOf(assinante), 1)
      }
    },
  }

  return {
    mensagens,
    avisos: repositorioDeAvisos,
    plantao,
    notificador,
    ids: idsSequenciais(),
    relogio: relogioParado(instante(1_000_000_000)),
    incluirTexto,
    guardados: avisos,
    entregas,
    ouvintesDe: (id: AparelhoId) => assinantes.filter((a) => a.aparelhoId === id).length,
    ligar: (aparelho: Aparelho) => plantao.definir(aparelho.id, true, instante(1)),
  }
}
