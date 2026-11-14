import { Elysia } from 'elysia'
import { infra } from './rota'

export const app = new Elysia().decorate('infra', infra)
