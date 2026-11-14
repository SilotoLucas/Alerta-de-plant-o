import { listarArquivos } from '../arquivos'
import type { Fase } from '../fase'

const CASO_DE_USO = /\.use-case\.ts$/

export const casoDeUsoComTeste: Fase = {
  nome: 'caso-de-uso-com-teste',
  ferramenta: 'evidencia',
  modos: ['quick', 'full'],
  executar: async (raiz) => {
    const arquivos = await listarArquivos(raiz)
    const existentes = new Set(arquivos)
    return arquivos
      .filter((arquivo) => CASO_DE_USO.test(arquivo))
      .filter((arquivo) => !existentes.has(arquivo.replace(CASO_DE_USO, '.unit.test.ts')))
      .map((arquivo) => ({
        arquivo,
        linha: 1,
        coluna: 1,
        regra: 'sem-teste-irmao',
        fato: `caso de uso sem ${arquivo.split('/').pop()?.replace(CASO_DE_USO, '.unit.test.ts')} ao lado`,
        correcao:
          'crie o teste irmão com fakes em memória cobrindo caminho feliz, negativa de autorização e cada erro de domínio que o caso de uso devolve',
      }))
  },
}
