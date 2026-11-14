import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { type ApiDeTeste, subirApiDeTeste } from '../../composicao/ambiente-de-teste'

const EVENTO = {
  conversa: 'Grupo Suporte',
  mensagens: [{ remetente: 'Maria', texto: 'sistema parou', hora: 1_700_000_000_000 }],
}

describe('POST /eventos contra servidor e banco reais', () => {
  let api: ApiDeTeste
  let empresa: { token: string; id: string }
  let lucas: { token: string; id: string }

  beforeAll(async () => {
    api = await subirApiDeTeste()
  })

  beforeEach(async () => {
    await api.limpar()
    empresa = await api.parear('empresa', 'Celular da empresa')
    lucas = await api.parear('pessoal', 'Lucas')
  })

  afterAll(async () => {
    await api.encerrar()
  })

  const enviar = (evento: unknown, token = empresa.token) =>
    api.chamar('/eventos', { method: 'POST', token, body: JSON.stringify(evento) })

  const ligar = () =>
    api.chamar('/plantao', {
      method: 'POST',
      token: lucas.token,
      body: JSON.stringify({ comando: 'sai' }),
    })

  test('com plantão ligado cria um aviso só com o nome da conversa, sem o texto do cliente', async () => {
    await ligar()
    const resposta = await enviar(EVENTO)
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ novas: 1, avisados: 1 })
    expect([...(await api.sql`select aparelho_id, titulo, texto from avisos`)]).toEqual([
      { aparelho_id: lucas.id, titulo: 'Grupo Suporte', texto: 'Nova mensagem' },
    ])
    const guardado = JSON.stringify(await api.sql`select * from mensagens_vistas`)
    expect(guardado).not.toContain('sistema parou')
  })

  test('a mesma notificação reenviada pelo WhatsApp é ignorada; uma mensagem nova na mesma conversa passa', async () => {
    await ligar()
    await enviar(EVENTO)
    expect(await (await enviar(EVENTO)).json()).toEqual({ novas: 0, avisados: 0 })
    const maisUma = {
      conversa: EVENTO.conversa,
      mensagens: [
        ...EVENTO.mensagens,
        { remetente: 'Maria', texto: 'urgente', hora: 1_700_000_005_000 },
      ],
    }
    expect(await (await enviar(maisUma)).json()).toEqual({ novas: 1, avisados: 1 })
    expect([...(await api.sql`select count(*)::int as n from avisos`)]).toEqual([{ n: 2 }])
  })

  test('mensagem repetida dentro do mesmo pedido conta uma vez só', async () => {
    await ligar()
    const [mensagem] = EVENTO.mensagens
    const resposta = await enviar({ ...EVENTO, mensagens: [mensagem, mensagem] })
    expect(await resposta.json()).toEqual({ novas: 1, avisados: 1 })
  })

  test('sem plantão ligado ninguém é avisado, mas a mensagem fica registrada e não avisa depois', async () => {
    expect(await (await enviar(EVENTO)).json()).toEqual({ novas: 1, avisados: 0 })
    await ligar()
    expect(await (await enviar(EVENTO)).json()).toEqual({ novas: 0, avisados: 0 })
    expect([...(await api.sql`select count(*)::int as n from avisos`)]).toEqual([{ n: 0 }])
  })

  test('evento silencioso registra as mensagens sem avisar; elas não avisam quando chegarem de novo', async () => {
    await ligar()
    const silencioso = await enviar({ ...EVENTO, silencioso: true })
    expect(await silencioso.json()).toEqual({ novas: 1, avisados: 0 })
    expect(await (await enviar(EVENTO)).json()).toEqual({ novas: 0, avisados: 0 })
    expect([...(await api.sql`select count(*)::int as n from avisos`)]).toEqual([{ n: 0 }])
  })

  test('evento inválido é 422; fora do contrato é 400', async () => {
    const vazio = await enviar({ conversa: 'Ana', mensagens: [] })
    expect(vazio.status).toBe(422)
    expect(await vazio.json()).toMatchObject({ erro: { codigo: 'evento-invalido' } })
    expect((await enviar({ conversa: 'Ana' })).status).toBe(400)
    expect(
      (await enviar({ conversa: 'Ana', mensagens: [{ remetente: null, texto: 'oi', hora: 0 }] }))
        .status,
    ).toBe(422)
  })

  test('sem token é 401 e o celular pessoal não pode mandar evento (404)', async () => {
    expect(
      (await api.chamar('/eventos', { method: 'POST', body: JSON.stringify(EVENTO) })).status,
    ).toBe(401)
    const resposta = await enviar(EVENTO, lucas.token)
    expect(resposta.status).toBe(404)
    expect(await resposta.json()).toMatchObject({ erro: { codigo: 'papel-incorreto' } })
  })
})

describe('POST /eventos com PLANTAO_ENVIAR_TEXTO ligado', () => {
  let api: ApiDeTeste

  beforeAll(async () => {
    api = await subirApiDeTeste({ enviarTexto: true })
  })

  afterAll(async () => {
    await api.encerrar()
  })

  test('o aviso leva o texto das mensagens', async () => {
    const empresa = await api.parear('empresa', 'Celular da empresa')
    const lucas = await api.parear('pessoal', 'Lucas')
    await api.chamar('/plantao', {
      method: 'POST',
      token: lucas.token,
      body: JSON.stringify({ comando: 'sai' }),
    })
    await api.chamar('/eventos', {
      method: 'POST',
      token: empresa.token,
      body: JSON.stringify(EVENTO),
    })
    expect([...(await api.sql`select texto from avisos`)]).toEqual([
      { texto: 'Maria: sistema parou' },
    ])
  })
})
