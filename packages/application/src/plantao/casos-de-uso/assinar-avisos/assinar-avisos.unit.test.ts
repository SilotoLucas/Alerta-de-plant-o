import { describe, expect, test } from 'bun:test'
import { EMPRESA, montarPlantao, PESSOAL } from '../../fakes'
import type { AvisoRegistrado } from '../../portas'
import { receberEvento } from '../receber-evento/receber-evento.use-case'
import { assinarAvisos } from './assinar-avisos.use-case'

const mensagem = (hora: number) => ({
  conversa: 'Ana',
  mensagens: [{ remetente: null, texto: `m${hora}`, hora }],
})

describe('assinarAvisos', () => {
  test('entrega ao vivo o que chega depois da assinatura e para de entregar ao cancelar', async () => {
    const deps = montarPlantao()
    await deps.ligar(PESSOAL)
    const recebidos: AvisoRegistrado[] = []
    const assinatura = await assinarAvisos(deps)(PESSOAL, null, (aviso) => recebidos.push(aviso))
    if (!assinatura.ok) return expect.unreachable()
    expect(assinatura.valor.pendentes).toEqual([])
    await receberEvento(deps)(EMPRESA, mensagem(1))
    assinatura.valor.cancelar()
    await receberEvento(deps)(EMPRESA, mensagem(2))
    expect(recebidos).toHaveLength(1)
    expect(deps.ouvintesDe(PESSOAL.id)).toBe(0)
  })

  test('reenvia os avisos ainda não vistos; com Last-Event-ID só os posteriores', async () => {
    const deps = montarPlantao()
    await deps.ligar(PESSOAL)
    for (const hora of [1, 2, 3]) await receberEvento(deps)(EMPRESA, mensagem(hora))
    const [primeiro, segundo, terceiro] = deps.entregas
    if (!primeiro || !segundo || !terceiro) return expect.unreachable()
    deps.guardados.set(segundo.id, { ...segundo, vistoEm: deps.relogio.agora() })
    const todos = await assinarAvisos(deps)(PESSOAL, null, () => undefined)
    if (!todos.ok) return expect.unreachable()
    expect(todos.valor.pendentes.map((aviso) => aviso.id)).toEqual([primeiro.id, terceiro.id])
    const depois = await assinarAvisos(deps)(PESSOAL, primeiro.id, () => undefined)
    if (!depois.ok) return expect.unreachable()
    expect(depois.valor.pendentes.map((aviso) => aviso.id)).toEqual([terceiro.id])
  })

  test('aviso com mais de 24 horas não é reenviado', async () => {
    const deps = montarPlantao()
    await deps.ligar(PESSOAL)
    await receberEvento(deps)(EMPRESA, mensagem(1))
    deps.relogio.avancar(24 * 3_600_000 + 1)
    const assinatura = await assinarAvisos(deps)(PESSOAL, null, () => undefined)
    if (!assinatura.ok) return expect.unreachable()
    expect(assinatura.valor.pendentes).toEqual([])
  })

  test('Last-Event-ID que não é UUID é ignorado em vez de quebrar a conexão', async () => {
    const deps = montarPlantao()
    await deps.ligar(PESSOAL)
    await receberEvento(deps)(EMPRESA, mensagem(1))
    const assinatura = await assinarAvisos(deps)(PESSOAL, 'lixo', () => undefined)
    if (!assinatura.ok) return expect.unreachable()
    expect(assinatura.valor.pendentes).toHaveLength(1)
  })

  test('o celular da empresa não recebe avisos', async () => {
    const deps = montarPlantao()
    const resultado = await assinarAvisos(deps)(EMPRESA, null, () => undefined)
    expect(resultado).toEqual({ ok: false, erro: 'papel-incorreto' })
    expect(deps.ouvintesDe(EMPRESA.id)).toBe(0)
  })

  test('se a leitura dos pendentes falha, a assinatura é desfeita antes de o erro subir', async () => {
    const deps = montarPlantao()
    const quebrado = {
      ...deps,
      avisos: { ...deps.avisos, pendentes: () => Promise.reject(new Error('banco fora')) },
    }
    await expect(assinarAvisos(quebrado)(PESSOAL, null, () => undefined)).rejects.toThrow(
      'banco fora',
    )
    expect(deps.ouvintesDe(PESSOAL.id)).toBe(0)
  })
})
