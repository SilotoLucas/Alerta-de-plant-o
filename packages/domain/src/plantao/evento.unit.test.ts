import { describe, expect, test } from 'bun:test'
import { instante } from '../compartilhado'
import { validarEvento } from './evento'

const MENSAGEM = { remetente: 'Maria', texto: 'oi', hora: 1_700_000_000_000 }

describe('validarEvento', () => {
  test('aceita uma conversa com mensagens e devolve as horas como Instante', () => {
    expect(validarEvento({ conversa: ' Grupo Suporte ', mensagens: [MENSAGEM] })).toEqual({
      ok: true,
      valor: {
        conversa: 'Grupo Suporte',
        mensagens: [{ remetente: 'Maria', texto: 'oi', hora: instante(1_700_000_000_000) }],
      },
    })
  })

  test('remetente vazio ou só espaços vira ausente, para a assinatura não depender de como o app mandou', () => {
    const resultado = validarEvento({
      conversa: 'Ana',
      mensagens: [
        { ...MENSAGEM, remetente: '  ' },
        { ...MENSAGEM, remetente: null, hora: 2 },
      ],
    })
    if (!resultado.ok) return expect.unreachable()
    expect(resultado.valor.mensagens.map((m) => m.remetente)).toEqual([null, null])
  })

  test('recusa conversa vazia ou longa demais', () => {
    expect(validarEvento({ conversa: '   ', mensagens: [MENSAGEM] })).toEqual({
      ok: false,
      erro: 'evento-invalido',
    })
    expect(validarEvento({ conversa: 'x'.repeat(121), mensagens: [MENSAGEM] }).ok).toBe(false)
    expect(validarEvento({ conversa: 'x'.repeat(120), mensagens: [MENSAGEM] }).ok).toBe(true)
  })

  test('recusa evento sem mensagem ou com mais de 50', () => {
    expect(validarEvento({ conversa: 'Ana', mensagens: [] }).ok).toBe(false)
    const muitas = Array.from({ length: 51 }, (_, i) => ({ ...MENSAGEM, hora: i + 1 }))
    expect(validarEvento({ conversa: 'Ana', mensagens: muitas }).ok).toBe(false)
    expect(validarEvento({ conversa: 'Ana', mensagens: muitas.slice(0, 50) }).ok).toBe(true)
  })

  test('recusa hora que não seja inteiro positivo e texto ou remetente longos demais', () => {
    for (const hora of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 2])
      expect(validarEvento({ conversa: 'Ana', mensagens: [{ ...MENSAGEM, hora }] }).ok).toBe(false)
    expect(
      validarEvento({ conversa: 'Ana', mensagens: [{ ...MENSAGEM, texto: 'x'.repeat(4_001) }] }).ok,
    ).toBe(false)
    expect(
      validarEvento({ conversa: 'Ana', mensagens: [{ ...MENSAGEM, remetente: 'x'.repeat(121) }] })
        .ok,
    ).toBe(false)
  })
})
