import { usada } from './util'
import { Type } from '@sinclair/typebox'

export const schema = Type.Object({ valor: Type.Number() })
export const principal = () => usada()
