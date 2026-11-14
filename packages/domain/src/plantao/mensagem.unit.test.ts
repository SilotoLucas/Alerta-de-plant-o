import { describe, expect, test } from 'bun:test'
import { instante } from '../compartilhado'
import { assinaturaDaMensagem, assinaturaNaConversa } from './mensagem'

describe('assinaturaDaMensagem', () => {
  test('é a mesma para a mesma mensagem reenviada pelo WhatsApp (base da deduplicação)', () => {
    const a = { remetente: 'Maria', texto: 'oi', hora: instante(10) }
    expect(assinaturaDaMensagem(a)).toBe(assinaturaDaMensagem({ ...a }))
  })

  test('muda com a hora: o mesmo "ok" duas vezes são duas mensagens', () => {
    const a = { remetente: 'Maria', texto: 'ok', hora: instante(10) }
    const b = { ...a, hora: instante(11) }
    expect(assinaturaDaMensagem(a)).not.toBe(assinaturaDaMensagem(b))
  })

  test('remetente ausente não colide com remetente vazio escrito à mão', () => {
    const semRemetente = { remetente: null, texto: 'oi', hora: instante(1) }
    expect(assinaturaDaMensagem(semRemetente)).toBe('1||oi')
  })
})

describe('assinaturaNaConversa', () => {
  test('a mesma mensagem em conversas diferentes tem assinaturas diferentes', () => {
    const mensagem = { remetente: null, texto: 'ok', hora: instante(5) }
    expect(assinaturaNaConversa('Grupo A', mensagem)).not.toBe(
      assinaturaNaConversa('Grupo B', mensagem),
    )
    expect(assinaturaNaConversa('Grupo A', mensagem)).toBe('Grupo A\n5||ok')
  })
})
