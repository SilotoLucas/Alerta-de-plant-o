import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Fase, Modo } from './fase'
import { GRUPOS } from './fases'
import {
  FerramentaQuebrada,
  formatar,
  ordenar,
  SAIDA_LIMPA,
  SAIDA_QUEBRADA,
  SAIDA_VIOLACAO,
  type Violacao,
} from './relatorio'

type Estado = 'ok' | 'reprovou' | 'quebrado' | 'pulado'

type ResultadoDaFase = {
  readonly fase: string
  readonly ferramenta: string
  readonly estado: Estado
  readonly violacoes: readonly Violacao[]
  readonly motivo: string
  readonly milissegundos: number
}

type Opcoes = { readonly modo: Modo; readonly somente: readonly string[]; readonly json: boolean }

const lerOpcoes = (argumentos: readonly string[]): Opcoes => {
  const valorDe = (chave: string): string | undefined => {
    const indice = argumentos.indexOf(chave)
    return indice === -1 ? undefined : argumentos[indice + 1]
  }
  return {
    modo: valorDe('--mode') === 'full' ? 'full' : 'quick',
    somente: (valorDe('--only') ?? '').split(',').filter(Boolean),
    json: argumentos.includes('--json'),
  }
}

const rodar = async (fase: Fase, raiz: string): Promise<ResultadoDaFase> => {
  const inicio = performance.now()
  const base = { fase: fase.nome, ferramenta: fase.ferramenta }
  const duracao = () => Math.round(performance.now() - inicio)
  try {
    const violacoes = ordenar(await fase.executar(raiz))
    return {
      ...base,
      estado: violacoes.length === 0 ? 'ok' : 'reprovou',
      violacoes,
      motivo: '',
      milissegundos: duracao(),
    }
  } catch (causa) {
    const motivo = (causa instanceof Error ? causa.message : String(causa))
      .replace(/\s+/g, ' ')
      .trim()
    const prefixo = causa instanceof FerramentaQuebrada ? '' : 'erro inesperado no gate: '
    return {
      ...base,
      estado: 'quebrado',
      violacoes: [],
      motivo: `${prefixo}${motivo}`,
      milissegundos: duracao(),
    }
  }
}

const pulada = (fase: Fase, motivo: string): ResultadoDaFase => ({
  fase: fase.nome,
  ferramenta: fase.ferramenta,
  estado: 'pulado',
  violacoes: [],
  motivo,
  milissegundos: 0,
})

const rodarGrupos = async (opcoes: Opcoes, raiz: string): Promise<readonly ResultadoDaFase[]> => {
  const resultados: ResultadoDaFase[] = []
  let interrompido = ''
  let anteriorLimpo = true
  for (const grupo of GRUPOS) {
    const fases = grupo.fases.filter(
      (fase) =>
        fase.modos.includes(opcoes.modo) &&
        (opcoes.somente.length === 0 || opcoes.somente.includes(fase.nome)),
    )
    if (fases.length === 0) continue
    const motivoDePulo =
      interrompido ||
      (grupo.exigeGrupoAnteriorLimpo && !anteriorLimpo ? 'o grupo anterior não ficou limpo' : '')
    if (motivoDePulo) {
      resultados.push(...fases.map((fase) => pulada(fase, motivoDePulo)))
      anteriorLimpo = false
      continue
    }
    const doGrupo = await Promise.all(fases.map((fase) => rodar(fase, raiz)))
    resultados.push(...doGrupo)
    anteriorLimpo = doGrupo.every((resultado) => resultado.estado === 'ok')
    if (grupo.barreira && !anteriorLimpo)
      interrompido = 'os tipos falharam; toda violação seguinte seria consequência do mesmo erro'
  }
  return resultados
}

const segundos = (milissegundos: number): string => `${(milissegundos / 1000).toFixed(1)}s`

const linhaDeResumo = (resultado: ResultadoDaFase): string => {
  const contagem =
    resultado.estado === 'reprovou'
      ? `${resultado.violacoes.length} ${resultado.violacoes.length === 1 ? 'violação' : 'violações'}`
      : resultado.motivo
  return `${resultado.estado.toUpperCase().padEnd(9)} ${resultado.fase.padEnd(22)} ${segundos(resultado.milissegundos).padStart(6)}  ${contagem}`.trimEnd()
}

const codigoDeSaida = (resultados: readonly ResultadoDaFase[]): number => {
  if (resultados.some((resultado) => resultado.estado === 'quebrado')) return SAIDA_QUEBRADA
  if (resultados.some((resultado) => resultado.estado === 'reprovou')) return SAIDA_VIOLACAO
  return SAIDA_LIMPA
}

const principal = async (): Promise<number> => {
  const opcoes = lerOpcoes(process.argv.slice(2))
  const raiz = process.cwd()
  const inicio = performance.now()
  const resultados = await rodarGrupos(opcoes, raiz)
  const total = Math.round(performance.now() - inicio)
  const codigo = codigoDeSaida(resultados)
  const relatorio = { modo: opcoes.modo, codigo, milissegundos: total, resultados }
  mkdirSync(join(raiz, '.reports'), { recursive: true })
  writeFileSync(join(raiz, '.reports', 'validate.json'), `${JSON.stringify(relatorio, null, 2)}\n`)
  if (opcoes.json) {
    process.stdout.write(`${JSON.stringify(relatorio, null, 2)}\n`)
    return codigo
  }
  for (const resultado of resultados)
    for (const violacao of resultado.violacoes)
      process.stdout.write(`${formatar(resultado.ferramenta, violacao)}\n`)
  for (const resultado of resultados.filter((item) => item.estado === 'quebrado'))
    process.stderr.write(`${resultado.fase}: ferramenta quebrada. ${resultado.motivo}\n`)
  process.stdout.write(`\n${resultados.map(linhaDeResumo).join('\n')}\n`)
  const veredito = ['verde', 'reprovou', 'ferramenta quebrada'][codigo]
  process.stdout.write(`\nvalidate(${opcoes.modo}): ${veredito} em ${segundos(total)}\n`)
  return codigo
}

process.exit(await principal())
