import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { type ApiDeTeste, subirApiDeTeste } from '../../composicao/ambiente-de-teste'

type Aparelho = { token: string; id: string }

const mensagem = (conversa: string, hora: number) => ({
  conversa,
  mensagens: [{ remetente: null, texto: `texto ${hora}`, hora }],
})

const lerAte = async (
  resposta: Response,
  pronto: (texto: string) => boolean,
  limiteMs = 3_000,
): Promise<string> => {
  const leitor = resposta.body?.getReader()
  if (!leitor) return ''
  const decodificador = new TextDecoder()
  let texto = ''
  const fim = Date.now() + limiteMs
  while (!pronto(texto) && Date.now() < fim) {
    const lido = await Promise.race([
      leitor.read(),
      Bun.sleep(Math.max(1, fim - Date.now())).then(() => null),
    ])
    if (lido === null || lido.done) break
    texto += decodificador.decode(lido.value)
  }
  await leitor.cancel()
  return texto
}

const idsDoFluxo = (texto: string): string[] =>
  [...texto.matchAll(/^id: (.+)$/gm)].map((achado) => achado[1] ?? '')

describe('avisos: entrega por SSE e confirmação "Vi" contra servidor e banco reais', () => {
  let api: ApiDeTeste
  let empresa: Aparelho
  let lucas: Aparelho
  let marina: Aparelho

  beforeAll(async () => {
    api = await subirApiDeTeste()
  })

  beforeEach(async () => {
    await api.limpar()
    empresa = await api.parear('empresa', 'Celular da empresa')
    lucas = await api.parear('pessoal', 'Lucas')
    marina = await api.parear('pessoal', 'Marina')
    for (const pessoa of [lucas, marina])
      await api.chamar('/plantao', {
        method: 'POST',
        token: pessoa.token,
        body: JSON.stringify({ comando: 'sai' }),
      })
  })

  afterAll(async () => {
    await api.encerrar()
  })

  const evento = (conversa: string, hora: number) =>
    api.chamar('/eventos', {
      method: 'POST',
      token: empresa.token,
      body: JSON.stringify(mensagem(conversa, hora)),
    })

  const abrirFluxo = (token: string, ultimoId?: string) =>
    api.chamar('/avisos/fluxo', {
      token,
      headers: ultimoId === undefined ? {} : { 'last-event-id': ultimoId },
    })

  test('GET /avisos/fluxo entrega ao vivo, como evento SSE com id, o aviso que chega depois da conexão', async () => {
    const fluxo = await abrirFluxo(lucas.token)
    expect(fluxo.status).toBe(200)
    expect(fluxo.headers.get('content-type')).toContain('text/event-stream')
    const leitura = lerAte(fluxo, (texto) => texto.includes('event: aviso'))
    await Bun.sleep(100)
    await evento('Grupo Suporte', 1_700_000_000_000)
    const texto = await leitura
    expect(texto).toContain(': conectado')
    expect(texto).toContain('event: aviso')
    const dados = /^data: (.+)$/m.exec(texto)?.[1] ?? '{}'
    expect(JSON.parse(dados)).toMatchObject({ titulo: 'Grupo Suporte', texto: 'Nova mensagem' })
    expect(idsDoFluxo(texto)).toHaveLength(1)
  })

  test('cada pessoa de plantão recebe o seu aviso, e só o seu', async () => {
    const deLucas = lerAte(await abrirFluxo(lucas.token), (t) => t.includes('event: aviso'))
    const deMarina = lerAte(await abrirFluxo(marina.token), (t) => t.includes('event: aviso'))
    await Bun.sleep(100)
    await evento('Ana', 1)
    const [textoDeLucas, textoDeMarina] = await Promise.all([deLucas, deMarina])
    const [idDeLucas] = idsDoFluxo(textoDeLucas)
    const [idDeMarina] = idsDoFluxo(textoDeMarina)
    expect(idDeLucas).toBeDefined()
    expect(idDeMarina).toBeDefined()
    expect(idDeLucas).not.toBe(idDeMarina)
  })

  test('ao reconectar reenvia o que ainda não foi visto; com Last-Event-ID, só o que veio depois', async () => {
    await evento('Grupo A', 1)
    await evento('Grupo B', 2)
    await evento('Grupo C', 3)
    const todos = idsDoFluxo(
      await lerAte(await abrirFluxo(lucas.token), (t) => idsDoFluxo(t).length >= 3),
    )
    expect(todos).toHaveLength(3)
    const [primeiro] = todos
    const depoisDoPrimeiro = idsDoFluxo(
      await lerAte(await abrirFluxo(lucas.token, primeiro), (t) => idsDoFluxo(t).length >= 2),
    )
    expect(depoisDoPrimeiro).toEqual(todos.slice(1))
  })

  test('POST /avisos/:id/visto confirma, tira o aviso do reenvio e é idempotente', async () => {
    await evento('Grupo A', 1)
    const [id] = idsDoFluxo(
      await lerAte(await abrirFluxo(lucas.token), (t) => idsDoFluxo(t).length >= 1),
    )
    const visto = await api.chamar(`/avisos/${id}/visto`, { method: 'POST', token: lucas.token })
    expect(visto.status).toBe(204)
    const [linha] = await api.sql<
      { visto_em: Date | null }[]
    >`select visto_em from avisos where id = ${id ?? ''}`
    expect(linha?.visto_em?.getTime()).toBe(api.agora())
    expect(
      (await api.chamar(`/avisos/${id}/visto`, { method: 'POST', token: lucas.token })).status,
    ).toBe(204)
    const reenviado = await lerAte(
      await abrirFluxo(lucas.token),
      (t) => idsDoFluxo(t).length >= 1,
      400,
    )
    expect(idsDoFluxo(reenviado)).toEqual([])
  })

  test('confirmar o aviso de outra pessoa ou um id inexistente é 404, sem sinal de que o aviso existe', async () => {
    await evento('Grupo A', 1)
    const [id] = idsDoFluxo(
      await lerAte(await abrirFluxo(lucas.token), (t) => idsDoFluxo(t).length >= 1),
    )
    const deOutro = await api.chamar(`/avisos/${id}/visto`, { method: 'POST', token: marina.token })
    expect(deOutro.status).toBe(404)
    expect(await deOutro.json()).toMatchObject({ erro: { codigo: 'aviso-nao-encontrado' } })
    const [linha] = await api.sql<
      { visto_em: Date | null }[]
    >`select visto_em from avisos where id = ${id ?? ''}`
    expect(linha?.visto_em).toBeNull()
    const inexistente = await api.chamar('/avisos/0192f1e2-0000-7000-8000-000000000999/visto', {
      method: 'POST',
      token: lucas.token,
    })
    expect(inexistente.status).toBe(404)
    expect(
      (await api.chamar('/avisos/abc/visto', { method: 'POST', token: lucas.token })).status,
    ).toBe(404)
  })

  test('sem token é 401 e o celular da empresa não abre o fluxo (404)', async () => {
    expect((await api.chamar('/avisos/fluxo')).status).toBe(401)
    expect((await api.chamar('/avisos/x/visto', { method: 'POST' })).status).toBe(401)
    const resposta = await abrirFluxo(empresa.token)
    expect(resposta.status).toBe(404)
    expect(await resposta.json()).toMatchObject({ erro: { codigo: 'papel-incorreto' } })
  })
})
