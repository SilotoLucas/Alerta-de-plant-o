import type { AparelhoId, AvisoId, Instante, Mensagem } from '@plantao/domain'

export type AvisoRegistrado = {
  readonly id: AvisoId
  readonly aparelhoId: AparelhoId
  readonly titulo: string
  readonly texto: string
  readonly criadoEm: Instante
  readonly vistoEm: Instante | null
}

export type EstadoDoPlantao = { readonly ativo: boolean; readonly alteradoEm: Instante | null }

export interface RegistroDeMensagens {
  readonly registrarNovas: (
    aparelhoId: AparelhoId,
    conversa: string,
    mensagens: readonly Mensagem[],
    agora: Instante,
  ) => Promise<readonly Mensagem[]>
}

export interface RepositorioDeAvisos {
  readonly inserir: (aviso: AvisoRegistrado) => Promise<void>
  readonly marcarVisto: (aparelhoId: AparelhoId, id: AvisoId, em: Instante) => Promise<boolean>
  readonly pendentes: (
    aparelhoId: AparelhoId,
    depoisDe: AvisoId | null,
    desde: Instante,
  ) => Promise<readonly AvisoRegistrado[]>
}

export interface RepositorioDoPlantao {
  readonly ler: (aparelhoId: AparelhoId) => Promise<EstadoDoPlantao>
  readonly definir: (aparelhoId: AparelhoId, ativo: boolean, em: Instante) => Promise<void>
  readonly pessoaisEmPlantao: () => Promise<readonly AparelhoId[]>
}

export interface Notificador {
  readonly entregar: (aparelhoId: AparelhoId, aviso: AvisoRegistrado) => Promise<void>
  readonly assinar: (
    aparelhoId: AparelhoId,
    escutar: (aviso: AvisoRegistrado) => void,
  ) => () => void
}
