import type { Pet } from './pet'

export interface PetRepo {
  readonly salvar: (pet: Pet) => Promise<void>
  buscar(id: string): Promise<Pet | null>
}

export type Relogio = {
  agora(): number
}

export const repoPadrao = null
