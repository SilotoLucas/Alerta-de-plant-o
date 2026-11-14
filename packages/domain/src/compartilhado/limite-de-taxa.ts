import { type Instante, MILISSEGUNDOS_POR_MINUTO } from './instante'

export type JanelaDeTaxa = { readonly inicio: Instante; readonly contagem: number }

export type DecisaoDeTaxa = {
  readonly janela: JanelaDeTaxa
  readonly permitido: boolean
  readonly esperaSegundos: number
}

export const registrarRequisicao = (
  atual: JanelaDeTaxa | undefined,
  agora: Instante,
  maximoPorMinuto: number,
): DecisaoDeTaxa => {
  const vigente = atual !== undefined && agora - atual.inicio < MILISSEGUNDOS_POR_MINUTO
  const janela = vigente
    ? { inicio: atual.inicio, contagem: atual.contagem + 1 }
    : { inicio: agora, contagem: 1 }
  const permitido = janela.contagem <= maximoPorMinuto
  return {
    janela,
    permitido,
    esperaSegundos: permitido
      ? 0
      : Math.ceil((janela.inicio + MILISSEGUNDOS_POR_MINUTO - agora) / 1000),
  }
}

export const janelaVencida = (janela: JanelaDeTaxa, agora: Instante): boolean =>
  agora - janela.inicio >= MILISSEGUNDOS_POR_MINUTO
