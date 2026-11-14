export const sortear = (opcoes: readonly string[]): string | undefined =>
  opcoes[Math.floor(Math.random() * opcoes.length)]
