import { Type } from '@sinclair/typebox'
import { nome } from '../../domain/src/pets'

export const schema = Type.Literal(nome)
