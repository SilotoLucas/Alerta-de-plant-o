import { describe, expect, test } from 'bun:test'
import { instante } from '../compartilhado'
import { MAXIMO_DE_CARACTERES_POR_LINHA, montarAviso } from './aviso'
import type { Mensagem } from './mensagem'

const mensagem = (remetente: string | null, texto: string, hora = 1): Mensagem => ({
  remetente,
  texto,
  hora: instante(hora),
})

const novas = [mensagem('Maria', 'o sistema caiu', 1), mensagem('Carlos', 'a impressora parou', 2)]

describe('montarAviso sem o texto (padrão de privacidade)', () => {
  test('uma mensagem vira "Nova mensagem" com o nome da conversa', () => {
    expect(montarAviso('Grupo A', novas.slice(0, 1), false)).toEqual({
      titulo: 'Grupo A',
      texto: 'Nova mensagem',
    })
  })

  test('várias mensagens viram a contagem, sem vazar nenhum texto do cliente', () => {
    const aviso = montarAviso('Grupo A', novas, false)
    expect(aviso.texto).toBe('2 novas mensagens')
    expect(aviso.texto).not.toContain('sistema')
  })
})

describe('montarAviso com o texto', () => {
  test('mostra remetente e texto de cada mensagem', () => {
    expect(montarAviso('Grupo A', novas, true).texto).toBe(
      'Maria: o sistema caiu\nCarlos: a impressora parou',
    )
  })

  test('conversa individual não repete o nome do contato como remetente', () => {
    expect(montarAviso('João', [mensagem('João', 'pode ligar?')], true).texto).toBe('pode ligar?')
  })

  test('remetente ausente ou em branco mostra só o texto', () => {
    expect(montarAviso('G', [mensagem(null, 'oi'), mensagem('  ', 'tudo bem?')], true).texto).toBe(
      'oi\ntudo bem?',
    )
  })

  test('mostra no máximo três mensagens e resume o resto', () => {
    const muitas = [1, 2, 3, 4, 5].map((n) => mensagem('X', `m${n}`, n))
    const linhas = montarAviso('G', muitas, true).texto.split('\n')
    expect(linhas).toHaveLength(4)
    expect(linhas.at(-1)).toBe('+ 2 mensagens')
  })

  test('trunca texto longo para o limite por linha', () => {
    const longa = mensagem(null, 'a'.repeat(MAXIMO_DE_CARACTERES_POR_LINHA + 300))
    expect(montarAviso('G', [longa], true).texto).toHaveLength(MAXIMO_DE_CARACTERES_POR_LINHA)
  })
})
