---
name: new-usecase
description: Cria um caso de uso novo em packages/application seguindo a ordem contrato → domínio → porta → caso de uso → teste unitário, com Result e porta declarada pelo consumidor. Use quando pedirem uma ação nova ("revogar aparelho", "silenciar plantão").
---

# /new-usecase <contexto> <acao>

Contextos: `aparelhos`, `plantao`. Nomes em português, kebab-case no arquivo, camelCase no identificador.

1. **Contrato** (se a ação é exposta por HTTP): `packages/contracts/src/<contexto>/` com request e
   response em TypeBox. Sem campo de id do aparelho.
2. **Domínio**: se a ação tem regra (validação, decisão), ela mora em `packages/domain/src/<contexto>/`
   com teste irmão (100% de linha); códigos de erro novos em `erros.ts` do contexto.
3. **Porta**: só se pagar uma conta. Acrescente em `packages/application/src/<contexto>/portas.ts`
   como propriedade de função `readonly`, só com o que este caso de uso chama.
4. **Caso de uso**: `casos-de-uso/<acao>/<acao>.use-case.ts`, assinatura
   `(deps) => (aparelho, entrada) => Promise<Result<Saida, Erro>>`; confira o papel do aparelho.
5. **Teste** `<acao>.unit.test.ts` irmão, com os fakes de `<contexto>/fakes.ts`: caminho feliz e um
   teste por código de erro devolvido, mais "papel errado" quando houver.
6. Exporte pelo `index.ts` do contexto e ligue em `apps/api/src/composicao/casos-de-uso.ts`.
7. `bun run validate:quick`. Migration, repositório e rota são os passos seguintes (`/migration`,
   `AGENTS.md` "Ordem de criação"); a rota precisa de e2e e de entrada em `docs/api.md`.
