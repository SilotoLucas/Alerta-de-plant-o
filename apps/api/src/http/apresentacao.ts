import type { AvisoRegistrado, EstadoDoPlantao } from '@plantao/application'
import type { Aparelho, Instante } from '@plantao/domain'

export const iso = (momento: Instante): string => new Date(momento).toISOString()

export const apresentarAparelho = (aparelho: Aparelho) => ({
  id: aparelho.id,
  papel: aparelho.papel,
  nome: aparelho.nome,
  criadoEm: iso(aparelho.criadoEm),
})

export const apresentarPlantao = (estado: EstadoDoPlantao) => ({
  ativo: estado.ativo,
  alteradoEm: estado.alteradoEm === null ? null : iso(estado.alteradoEm),
})

export const apresentarAviso = (aviso: AvisoRegistrado) => ({
  id: aviso.id,
  titulo: aviso.titulo,
  texto: aviso.texto,
  criadoEm: iso(aviso.criadoEm),
})
