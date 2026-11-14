import { Elysia } from 'elysia'

export const rotasDeSaude = new Elysia().get('/health', () => ({ status: 'ok' }))
