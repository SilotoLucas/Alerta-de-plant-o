import { describe, expect, test } from 'bun:test'
import { EMPRESA, montarPlantao, OUTRO_PESSOAL, PESSOAL } from '../../fakes'
import { receberEvento } from './receber-evento.use-case'

const EVENTO = {
  conversa: 'Grupo Suporte',
  mensagens: [{ remetente: 'Maria', texto: 'sistema parou', hora: 1_700_000_000_000 }],
}

describe('receberEvento', () => {
  test('com plantão ligado cria o aviso sem o texto (privacidade padrão) e entrega ao aparelho pessoal', async () => {
    const deps = montarPlantao()
    await deps.ligar(PESSOAL)
    const resultado = await receberEvento(deps)(EMPRESA, EVENTO)
    expect(resultado).toEqual({ ok: true, valor: { novas: 1, avisados: 1 } })
    const [aviso] = deps.entregas
    expect(aviso).toMatchObject({
      aparelhoId: PESSOAL.id,
      titulo: 'Grupo Suporte',
      texto: 'Nova mensagem',
      vistoEm: null,
    })
    expect(JSON.stringify([...deps.guardados.values()])).not.toContain('sistema parou')
  })

  test('com a opção ligada, o aviso leva o texto das mensagens', async () => {
    const deps = montarPlantao(true)
    await deps.ligar(PESSOAL)
    await receberEvento(deps)(EMPRESA, EVENTO)
    expect(deps.entregas[0]?.texto).toBe('Maria: sistema parou')
  })

  test('a mesma mensagem reenviada pelo WhatsApp não gera outro aviso, mas uma nova na mesma conversa gera', async () => {
    const deps = montarPlantao()
    await deps.ligar(PESSOAL)
    await receberEvento(deps)(EMPRESA, EVENTO)
    expect(await receberEvento(deps)(EMPRESA, EVENTO)).toEqual({
      ok: true,
      valor: { novas: 0, avisados: 0 },
    })
    const maisUma = {
      ...EVENTO,
      mensagens: [
        ...EVENTO.mensagens,
        { remetente: 'Maria', texto: 'urgente', hora: 1_700_000_001_000 },
      ],
    }
    expect(await receberEvento(deps)(EMPRESA, maisUma)).toEqual({
      ok: true,
      valor: { novas: 1, avisados: 1 },
    })
    expect(deps.entregas).toHaveLength(2)
  })

  test('sem ninguém de plantão a mensagem é registrada mas ninguém é avisado', async () => {
    const deps = montarPlantao()
    expect(await receberEvento(deps)(EMPRESA, EVENTO)).toEqual({
      ok: true,
      valor: { novas: 1, avisados: 0 },
    })
    expect(deps.entregas).toHaveLength(0)
    expect(deps.guardados.size).toBe(0)
  })

  test('avisa todos os aparelhos pessoais que estão de plantão e só eles', async () => {
    const deps = montarPlantao()
    await deps.ligar(PESSOAL)
    await deps.ligar(OUTRO_PESSOAL)
    await deps.plantao.definir(OUTRO_PESSOAL.id, false, deps.relogio.agora())
    await receberEvento(deps)(EMPRESA, EVENTO)
    expect(deps.entregas.map((aviso) => aviso.aparelhoId)).toEqual([PESSOAL.id])
  })

  test('evento silencioso só registra as mensagens: ninguém é avisado agora nem quando elas voltarem', async () => {
    const deps = montarPlantao()
    await deps.ligar(PESSOAL)
    expect(await receberEvento(deps)(EMPRESA, { ...EVENTO, silencioso: true })).toEqual({
      ok: true,
      valor: { novas: 1, avisados: 0 },
    })
    expect(deps.entregas).toHaveLength(0)
    expect(await receberEvento(deps)(EMPRESA, EVENTO)).toEqual({
      ok: true,
      valor: { novas: 0, avisados: 0 },
    })
  })

  test('aparelho pessoal não pode mandar evento', async () => {
    const deps = montarPlantao()
    expect(await receberEvento(deps)(PESSOAL, EVENTO)).toEqual({
      ok: false,
      erro: 'papel-incorreto',
    })
  })

  test('evento inválido é recusado antes de registrar qualquer mensagem', async () => {
    const deps = montarPlantao()
    expect(
      await receberEvento(deps)(EMPRESA, { conversa: ' ', mensagens: EVENTO.mensagens }),
    ).toEqual({
      ok: false,
      erro: 'evento-invalido',
    })
    expect(await receberEvento(deps)(EMPRESA, EVENTO)).toEqual({
      ok: true,
      valor: { novas: 1, avisados: 0 },
    })
  })
})
