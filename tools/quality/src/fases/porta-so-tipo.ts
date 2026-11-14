import { listarArquivos } from '../arquivos'
import { lerFonte, posicao, ts, visitar } from '../ast'
import type { Fase } from '../fase'
import type { Violacao } from '../relatorio'

const ARQUIVO_DE_PORTA = /^packages\/application\/src\/(.+\/)?portas\.ts$/

const ehDeclaracaoDeTipo = (no: ts.Statement): boolean =>
  ts.isInterfaceDeclaration(no) ||
  ts.isTypeAliasDeclaration(no) ||
  (ts.isImportDeclaration(no) && no.importClause?.isTypeOnly === true) ||
  (ts.isExportDeclaration(no) && no.isTypeOnly)

const violacoesDaPorta = (raiz: string, arquivo: string): readonly Violacao[] => {
  const fonte = lerFonte(raiz, arquivo)
  const violacoes: Violacao[] = []
  for (const declaracao of fonte.statements) {
    if (ehDeclaracaoDeTipo(declaracao)) continue
    violacoes.push({
      arquivo,
      ...posicao(fonte, declaracao.getStart(fonte)),
      regra: 'porta-com-valor',
      fato: 'arquivo de porta declara valor, não só tipo',
      correcao:
        'deixe em portas.ts só interface/type (e import type); implementação vai para packages/infra, função pura para packages/domain',
    })
  }
  visitar(fonte, (no) => {
    if (!ts.isMethodSignature(no)) return
    violacoes.push({
      arquivo,
      ...posicao(fonte, no.getStart(fonte)),
      regra: 'porta-com-metodo',
      fato: `${no.name.getText(fonte)} declarado como método`,
      correcao: `declare como propriedade de função: readonly ${no.name.getText(fonte)}: (...) => ...; método tem parâmetro bivariante e aceita adaptador incompatível`,
    })
  })
  return violacoes
}

export const portaSoTipo: Fase = {
  nome: 'porta-so-tipo',
  ferramenta: 'arquitetura',
  modos: ['quick', 'full'],
  executar: async (raiz) =>
    (await listarArquivos(raiz))
      .filter((arquivo) => ARQUIVO_DE_PORTA.test(arquivo))
      .flatMap((arquivo) => violacoesDaPorta(raiz, arquivo)),
}
