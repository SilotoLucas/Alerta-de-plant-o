import type { Fase } from '../fase'
import { casoDeUsoComTeste } from './caso-de-uso-com-teste'
import { coberturaDominio } from './cobertura-dominio'
import { codigoMorto } from './codigo-morto'
import { comentario } from './comentario'
import { convencaoDeTeste } from './convencao-de-teste'
import { duplicacao } from './duplicacao'
import { estilo } from './estilo'
import { fronteira } from './fronteira'
import { nomeDeArquivo } from './nome-de-arquivo'
import { portaSoTipo } from './porta-so-tipo'
import { pureza } from './pureza'
import { rotaComE2e } from './rota-com-e2e'
import { segredo } from './segredo'
import { testes } from './testes'
import { tipos } from './tipos'
import { versaoFixa } from './versao-fixa'

export type Grupo = {
  readonly titulo: string
  readonly barreira: boolean
  readonly exigeGrupoAnteriorLimpo: boolean
  readonly fases: readonly Fase[]
}

export const GRUPOS: readonly Grupo[] = [
  {
    titulo: 'higiene',
    barreira: false,
    exigeGrupoAnteriorLimpo: false,
    fases: [segredo, nomeDeArquivo, versaoFixa, convencaoDeTeste],
  },
  {
    titulo: 'arquitetura',
    barreira: false,
    exigeGrupoAnteriorLimpo: false,
    fases: [pureza, portaSoTipo, comentario, casoDeUsoComTeste],
  },
  { titulo: 'tipos', barreira: true, exigeGrupoAnteriorLimpo: false, fases: [tipos] },
  {
    titulo: 'fronteira e estilo',
    barreira: false,
    exigeGrupoAnteriorLimpo: false,
    fases: [fronteira, estilo],
  },
  { titulo: 'testes', barreira: false, exigeGrupoAnteriorLimpo: false, fases: [testes] },
  {
    titulo: 'cobertura',
    barreira: false,
    exigeGrupoAnteriorLimpo: true,
    fases: [coberturaDominio],
  },
  {
    titulo: 'sobra',
    barreira: false,
    exigeGrupoAnteriorLimpo: false,
    fases: [rotaComE2e, codigoMorto, duplicacao],
  },
]
