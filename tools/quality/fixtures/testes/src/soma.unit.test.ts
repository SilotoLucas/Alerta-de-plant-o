import { expect, test } from 'bun:test'

test('soma certa', () => {
  expect(1 + 1).toBe(2)
})

test('soma errada de propósito', () => {
  expect(1 + 1).toBe(3)
})
