import { describe, expect, test } from 'bun:test'
import { interpretarComando } from './comando'

describe('interpretarComando', () => {
  test('"sai" liga os alertas, com ou sem acento, caixa ou espaço sobrando', () => {
    expect(interpretarComando('saí')).toBe('ativar')
    expect(interpretarComando('  SAI \n')).toBe('ativar')
    expect(interpretarComando('ativar')).toBe('ativar')
  })

  test('"voltei" desliga os alertas', () => {
    expect(interpretarComando('Voltei')).toBe('desativar')
    expect(interpretarComando('desligar')).toBe('desativar')
  })

  test('"status" pergunta como está', () => {
    expect(interpretarComando('status')).toBe('status')
    expect(interpretarComando('?')).toBe('status')
  })

  test('texto que não é comando é ignorado em vez de adivinhado', () => {
    expect(interpretarComando('bom dia')).toBeNull()
    expect(interpretarComando('')).toBeNull()
  })
})
