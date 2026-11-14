export const docker = (argumentos: readonly string[]) => {
  const resultado = Bun.spawnSync(['docker', ...argumentos], { stdout: 'pipe', stderr: 'pipe' })
  return {
    ok: resultado.exitCode === 0,
    saida: resultado.stdout.toString().trim(),
    erro: resultado.stderr.toString().trim(),
  }
}

export const esperar = async (
  descricao: string,
  pronto: () => boolean | Promise<boolean>,
  tentativas = 60,
): Promise<void> => {
  for (let tentativa = 0; tentativa < tentativas; tentativa += 1) {
    if (await pronto()) return
    await Bun.sleep(1000)
  }
  throw new Error(`${descricao} não ficou pronto em ${tentativas}s`)
}
