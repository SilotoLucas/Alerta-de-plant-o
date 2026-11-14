import { describe, expect, test } from 'bun:test'
import { EMPRESA, montarPlantao, OUTRO_PESSOAL, PESSOAL } from '../../fakes'
import { receberEvento } from '../receber-evento/receber-evento.use-case'
import { confirmarVisto } from './confirmar-visto.use-case'

const avisoDePlantao = async () => {
  const deps = montarPlantao()
  await deps.ligar(PESSOAL)
  await receberEvento(deps)(EMPRESA, {
    conversa: 'Ana',
    mensagens: [{ remetente: null, texto: 'oi', hora: 5 }],
  })
  const [aviso] = deps.entregas
  if (!aviso) return expect.unreachable()
  return { deps, aviso }
}

describe('confirmarVisto', () => {
  test('marca o aviso como visto na hora do relógio', async () => {
    const { deps, aviso } = await avisoDePlantao()
    deps.relogio.avancar(7_000)
    expect(await confirmarVisto(deps)(PESSOAL, aviso.id)).toEqual({ ok: true, valor: undefined })
    expect(deps.guardados.get(aviso.id)?.vistoEm).toBe(deps.relogio.agora())
  })

  test('aviso de outro aparelho é "não encontrado", nunca "proibido"', async () => {
    const { deps, aviso } = await avisoDePlantao()
    expect(await confirmarVisto(deps)(OUTRO_PESSOAL, aviso.id)).toEqual({
      ok: false,
      erro: 'aviso-nao-encontrado',
    })
    expect(deps.guardados.get(aviso.id)?.vistoEm).toBeNull()
  })

  test('id inexistente ou que não é UUID dá aviso-nao-encontrado', async () => {
    const { deps } = await avisoDePlantao()
    const esperado = { ok: false, erro: 'aviso-nao-encontrado' } as const
    expect(await confirmarVisto(deps)(PESSOAL, '0192f1e2-0000-7000-8000-000000000999')).toEqual(
      esperado,
    )
    expect(await confirmarVisto(deps)(PESSOAL, 'x')).toEqual(esperado)
  })
})
