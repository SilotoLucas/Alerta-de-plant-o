import { describe, expect, test } from 'bun:test'
import { lerConfiguracao } from './configuracao'

const TOKEN = 'um-segredo-bem-comprido'

describe('lerConfiguracao', () => {
  test('só com o token de administrador, usa os padrões locais e não envia o texto das mensagens', () => {
    expect(lerConfiguracao({ PLANTAO_ADMIN_TOKEN: TOKEN })).toEqual({
      ok: true,
      valor: {
        porta: 3350,
        bancoUrl: 'postgres://plantao:plantao@localhost:5435/plantao',
        tokenDeAdmin: TOKEN,
        enviarTexto: false,
        retencaoEmDias: 7,
        limites: { geralPorMinuto: 300, pareamentoPorMinuto: 5, confiarNoProxy: false },
      },
    })
  })

  test('lê porta, banco, texto e proxy do ambiente', () => {
    const resultado = lerConfiguracao({
      PLANTAO_ADMIN_TOKEN: TOKEN,
      API_PORT: '4000',
      DATABASE_URL: 'postgres://x@h/d',
      PLANTAO_ENVIAR_TEXTO: 'true',
      CONFIAR_NO_PROXY: 'true',
      RETENCAO_EM_DIAS: '3',
      LIMITE_GERAL_POR_MINUTO: '10',
      LIMITE_DE_PAREAMENTO_POR_MINUTO: '2',
    })
    expect(resultado).toMatchObject({
      ok: true,
      valor: {
        porta: 4000,
        bancoUrl: 'postgres://x@h/d',
        enviarTexto: true,
        retencaoEmDias: 3,
        limites: { geralPorMinuto: 10, pareamentoPorMinuto: 2, confiarNoProxy: true },
      },
    })
  })

  test('recusa subir sem token de administrador ou com token curto', () => {
    for (const ambiente of [{}, { PLANTAO_ADMIN_TOKEN: 'curto' }]) {
      const resultado = lerConfiguracao(ambiente)
      expect(resultado.ok).toBe(false)
      if (!resultado.ok) expect(resultado.erro.join(' ')).toContain('PLANTAO_ADMIN_TOKEN')
    }
  })

  test('junta todos os problemas de uma vez', () => {
    const resultado = lerConfiguracao({
      PLANTAO_ADMIN_TOKEN: TOKEN,
      API_PORT: 'abc',
      PLANTAO_ENVIAR_TEXTO: 'talvez',
      LIMITE_GERAL_POR_MINUTO: '0',
    })
    if (resultado.ok) return expect.unreachable()
    expect(resultado.erro).toHaveLength(3)
  })

  test('em produção exige DATABASE_URL explícita', () => {
    const resultado = lerConfiguracao({ PLANTAO_ADMIN_TOKEN: TOKEN, NODE_ENV: 'production' })
    if (resultado.ok) return expect.unreachable()
    expect(resultado.erro).toEqual(['DATABASE_URL não definida'])
  })
})
