import { expect, test } from 'bun:test'
import { instante } from './instante'
import { janelaVencida, registrarRequisicao } from './limite-de-taxa'

test('conta requisições por minuto, recusa a que passa do máximo e diz quantos segundos esperar', () => {
  const primeira = registrarRequisicao(undefined, instante(0), 2)
  const segunda = registrarRequisicao(primeira.janela, instante(1_000), 2)
  const terceira = registrarRequisicao(segunda.janela, instante(20_000), 2)
  expect([primeira.permitido, segunda.permitido, terceira.permitido]).toEqual([true, true, false])
  expect(terceira.esperaSegundos).toBe(40)
  expect(primeira.esperaSegundos).toBe(0)
})

test('depois de um minuto a janela recomeça', () => {
  const cheia = { inicio: instante(0), contagem: 99 }
  expect(janelaVencida(cheia, instante(59_999))).toBe(false)
  expect(janelaVencida(cheia, instante(60_000))).toBe(true)
  expect(registrarRequisicao(cheia, instante(60_000), 2)).toEqual({
    janela: { inicio: instante(60_000), contagem: 1 },
    permitido: true,
    esperaSegundos: 0,
  })
})
