import {
  type Aparelho,
  type AvisoId,
  type ErroDePlantao,
  type EventoRecebido,
  err,
  montarAviso,
  ok,
  type Result,
  validarEvento,
} from '@plantao/domain'
import type { GeradorDeId, Relogio } from '../../../compartilhado'
import type {
  Notificador,
  RegistroDeMensagens,
  RepositorioDeAvisos,
  RepositorioDoPlantao,
} from '../../portas'

export type DependenciasDeReceberEvento = {
  readonly mensagens: RegistroDeMensagens
  readonly plantao: RepositorioDoPlantao
  readonly avisos: RepositorioDeAvisos
  readonly notificador: Notificador
  readonly ids: GeradorDeId
  readonly relogio: Relogio
  readonly incluirTexto: boolean
}

export type ResumoDoEvento = { readonly novas: number; readonly avisados: number }

export const receberEvento =
  (deps: DependenciasDeReceberEvento) =>
  async (
    aparelho: Aparelho,
    entrada: EventoRecebido,
  ): Promise<Result<ResumoDoEvento, ErroDePlantao>> => {
    if (aparelho.papel !== 'empresa') return err('papel-incorreto')
    const evento = validarEvento(entrada)
    if (!evento.ok) return evento
    const agora = deps.relogio.agora()
    const novas = await deps.mensagens.registrarNovas(
      aparelho.id,
      evento.valor.conversa,
      evento.valor.mensagens,
      agora,
    )
    if (novas.length === 0) return ok({ novas: 0, avisados: 0 })
    const destinos = await deps.plantao.pessoaisEmPlantao()
    const aviso = montarAviso(evento.valor.conversa, novas, deps.incluirTexto)
    for (const destino of destinos) {
      const registrado = {
        id: deps.ids.novo<'AvisoId'>() as AvisoId,
        aparelhoId: destino,
        titulo: aviso.titulo,
        texto: aviso.texto,
        criadoEm: agora,
        vistoEm: null,
      }
      await deps.avisos.inserir(registrado)
      await deps.notificador.entregar(destino, registrado)
    }
    return ok({ novas: novas.length, avisados: destinos.length })
  }
