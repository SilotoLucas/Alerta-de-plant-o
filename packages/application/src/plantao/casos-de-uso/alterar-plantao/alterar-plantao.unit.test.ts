import { describe, expect, test } from 'bun:test'
import { EMPRESA, montarPlantao, PESSOAL } from '../../fakes'
import { alterarPlantao } from './alterar-plantao.use-case'

describe('alterarPlantao', () => {
  test('"sai" liga o plantão, "voltei" desliga, e o estado fica guardado', async () => {
    const deps = montarPlantao()
    const agora = deps.relogio.agora()
    expect(await alterarPlantao(deps)(PESSOAL, 'sai')).toEqual({
      ok: true,
      valor: { ativo: true, alteradoEm: agora },
    })
    expect(await deps.plantao.pessoaisEmPlantao()).toEqual([PESSOAL.id])
    deps.relogio.avancar(5_000)
    expect(await alterarPlantao(deps)(PESSOAL, ' Voltei ')).toEqual({
      ok: true,
      valor: { ativo: false, alteradoEm: deps.relogio.agora() },
    })
    expect(await deps.plantao.pessoaisEmPlantao()).toEqual([])
  })

  test('repetir o mesmo comando não muda a hora em que o plantão começou', async () => {
    const deps = montarPlantao()
    const primeiro = await alterarPlantao(deps)(PESSOAL, 'sai')
    deps.relogio.avancar(60_000)
    expect(await alterarPlantao(deps)(PESSOAL, 'sai')).toEqual(primeiro)
  })

  test('"status" só consulta, sem alterar', async () => {
    const deps = montarPlantao()
    expect(await alterarPlantao(deps)(PESSOAL, 'status')).toEqual({
      ok: true,
      valor: { ativo: false, alteradoEm: null },
    })
    expect(await deps.plantao.pessoaisEmPlantao()).toEqual([])
  })

  test('comando desconhecido é recusado', async () => {
    expect(await alterarPlantao(montarPlantao())(PESSOAL, 'bom dia')).toEqual({
      ok: false,
      erro: 'comando-invalido',
    })
  })

  test('o celular da empresa não tem plantão para ligar', async () => {
    expect(await alterarPlantao(montarPlantao())(EMPRESA, 'sai')).toEqual({
      ok: false,
      erro: 'papel-incorreto',
    })
  })
})
