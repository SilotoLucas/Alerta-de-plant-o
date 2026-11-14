import { app } from './http/app'
import { servidor } from './composicao/servidor'
import { semPacote } from './composicao/sem-pacote'

export const tudo = [app, servidor, semPacote]
