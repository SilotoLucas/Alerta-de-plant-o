import { expect, test } from 'bun:test'
import { ehUuid } from './uuid'

test('reconhece UUID em minúsculas e recusa qualquer outra coisa', () => {
  expect(ehUuid('0192f1e2-0000-7000-8000-000000000001')).toBe(true)
  expect(ehUuid('0192F1E2-0000-7000-8000-000000000001')).toBe(false)
  expect(ehUuid("1' or '1'='1")).toBe(false)
  expect(ehUuid('')).toBe(false)
})
