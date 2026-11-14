import type { Pet } from '../pets/pet'

export interface Deck {
  readonly proximos: (pet: Pet) => Promise<readonly Pet[]>
}
