import { timingSafeEqual } from 'node:crypto'
import { Elysia } from 'elysia'
import { corpoDeErro } from './error-map'

const resumo = (texto: string): Buffer =>
  Buffer.from(new Bun.CryptoHasher('sha256').update(texto).digest())

export const administracao = (tokenDeAdmin: string) =>
  new Elysia({ name: 'administracao' }).macro({
    administrador: {
      beforeHandle: ({ headers, status }) => {
        const enviado = headers['x-admin-token'] ?? ''
        if (!timingSafeEqual(resumo(enviado), resumo(tokenDeAdmin)))
          return status(401, corpoDeErro('admin-invalido'))
        return undefined
      },
    },
  })
