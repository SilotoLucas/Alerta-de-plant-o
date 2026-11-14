import { randomInt } from 'node:crypto'
import type { Segredos } from '@plantao/application'
import { DIGITOS_DO_CODIGO } from '@plantao/domain'

const BYTES_DO_TOKEN = 32

const hashDe = (token: string): string => new Bun.CryptoHasher('sha256').update(token).digest('hex')

export const segredosAleatorios = (): Segredos => ({
  novoCodigo: () => String(randomInt(0, 10 ** DIGITOS_DO_CODIGO)).padStart(DIGITOS_DO_CODIGO, '0'),
  novoToken: () => {
    const token = Buffer.from(crypto.getRandomValues(new Uint8Array(BYTES_DO_TOKEN))).toString(
      'base64url',
    )
    return { token, hash: hashDe(token) }
  },
  hashDe,
})
