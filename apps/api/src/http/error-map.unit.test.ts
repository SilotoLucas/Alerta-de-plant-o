import { describe, expect, test } from 'bun:test'
import { type CodigoDeErro, corpoDeErro, MAPA_DE_ERROS } from './error-map'

const TODOS: readonly CodigoDeErro[] = [
  'papel-invalido',
  'nome-invalido',
  'codigo-invalido',
  'codigo-indisponivel',
  'aparelho-invalido',
  'aparelho-nao-encontrado',
  'evento-invalido',
  'comando-invalido',
  'aviso-nao-encontrado',
  'papel-incorreto',
  'admin-invalido',
]

describe('MAPA_DE_ERROS', () => {
  test('todo código de erro tem status HTTP e mensagem em português', () => {
    expect(Object.keys(MAPA_DE_ERROS).sort()).toEqual([...TODOS].sort())
    for (const codigo of TODOS) {
      expect(MAPA_DE_ERROS[codigo].status).toBeGreaterThanOrEqual(400)
      expect(MAPA_DE_ERROS[codigo].mensagem.length).toBeGreaterThan(0)
    }
  })

  test('o que o aparelho não pode ver é 404, nunca 403', () => {
    for (const codigo of TODOS) expect(MAPA_DE_ERROS[codigo].status).not.toBe(403)
    expect(MAPA_DE_ERROS['papel-incorreto'].status).toBe(404)
    expect(MAPA_DE_ERROS['aviso-nao-encontrado'].status).toBe(404)
  })

  test('o corpo de erro leva o código e a mensagem do mapa', () => {
    expect(corpoDeErro('comando-invalido')).toEqual({
      erro: {
        codigo: 'comando-invalido',
        mensagem: 'Comando inválido. Use sai, voltei ou status.',
      },
    })
  })
})
