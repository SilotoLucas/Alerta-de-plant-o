import type { Result } from '@plantao/domain'
import type { Context } from 'elysia'
import { type CodigoDeErro, corpoDeErro, MAPA_DE_ERROS } from './error-map'

type Status = Context['status']

export const falha = (status: Status, codigo: CodigoDeErro) =>
  status(MAPA_DE_ERROS[codigo].status, corpoDeErro(codigo))

export const responder = <T, R>(
  status: Status,
  resultado: Result<T, CodigoDeErro>,
  apresentar: (valor: T) => R,
) => (resultado.ok ? apresentar(resultado.valor) : falha(status, resultado.erro))
