import type { AvisoRegistrado, Notificador } from '@plantao/application'
import type { AparelhoId } from '@plantao/domain'

export const notificadorEmMemoria = (): Notificador => {
  const ouvintes = new Map<AparelhoId, Set<(aviso: AvisoRegistrado) => void>>()
  return {
    entregar: async (aparelhoId, aviso) => {
      for (const escutar of [...(ouvintes.get(aparelhoId) ?? [])]) escutar(aviso)
    },
    assinar: (aparelhoId, escutar) => {
      const conjunto = ouvintes.get(aparelhoId) ?? new Set()
      conjunto.add(escutar)
      ouvintes.set(aparelhoId, conjunto)
      return () => {
        conjunto.delete(escutar)
        if (conjunto.size === 0 && ouvintes.get(aparelhoId) === conjunto)
          ouvintes.delete(aparelhoId)
      }
    },
  }
}
