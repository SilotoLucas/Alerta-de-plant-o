import { Elysia } from 'elysia'

export const rotasDePets = new Elysia({ prefix: '/pets' })
  .get('/', () => [])
  .get('/:id', () => null)
  .post('/:id/fotos', () => null)
