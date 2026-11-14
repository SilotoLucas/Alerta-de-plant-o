import { RespostaSaude } from '@plantao/contracts'
import { Elysia } from 'elysia'

export const rotasDeSaude = new Elysia().get('/health', () => ({ status: 'ok' as const }), {
  response: RespostaSaude,
})
