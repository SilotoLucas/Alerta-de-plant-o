import { describe, expect, test } from 'bun:test'
import { instante, minutosEntre, somarMinutos } from './instante'

describe('Instante', () => {
  test('somarMinutos anda no tempo em minutos inteiros, inclusive para trás', () => {
    expect(somarMinutos(instante(0), 2)).toBe(instante(120_000))
    expect(somarMinutos(instante(120_000), -1)).toBe(instante(60_000))
  })

  test('minutosEntre devolve a distância em minutos, negativa quando o fim vem antes', () => {
    expect(minutosEntre(instante(0), instante(90_000))).toBe(1.5)
    expect(minutosEntre(instante(60_000), instante(0))).toBe(-1)
  })
})
