import { describe, expect, test } from 'bun:test'
import { err, ok, type Result } from './result'

const dividir = (a: number, b: number): Result<number, 'divisao-por-zero'> =>
  b === 0 ? err('divisao-por-zero') : ok(a / b)

describe('Result', () => {
  test('ok carrega o valor e marca ok como true', () => {
    expect(dividir(6, 3)).toEqual({ ok: true, valor: 2 })
  })

  test('err carrega o código de erro e marca ok como false, sem lançar exceção', () => {
    expect(dividir(1, 0)).toEqual({ ok: false, erro: 'divisao-por-zero' })
  })
})
