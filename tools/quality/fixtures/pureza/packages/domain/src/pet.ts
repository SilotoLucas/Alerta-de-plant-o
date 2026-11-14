export const validarNome = (nome: string): string => {
  if (nome.length === 0) throw new Error('nome vazio')
  return nome
}
