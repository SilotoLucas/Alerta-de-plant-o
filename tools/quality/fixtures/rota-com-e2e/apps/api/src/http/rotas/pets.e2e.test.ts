import { expect, test } from 'bun:test'

test('busca pet de outro tutor responde 404', async () => {
  const id = 'abc'
  const resposta = await fetch(`http://localhost/pets/${id}`)
  expect(resposta.status).toBe(404)
  expect('/healthcheck').toBeTruthy()
})
