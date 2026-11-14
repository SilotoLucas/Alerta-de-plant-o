const NPM = [
  'npm',
  'npm-dev',
  'npm-optional',
  'npm-peer',
  'npm-bundled',
  'npm-no-pkg',
  'npm-unknown',
]

module.exports = {
  forbidden: [
    {
      name: 'dominio-sem-dependencia',
      severity: 'error',
      comment:
        'packages/domain não importa npm nem módulo do runtime. Mova o código para packages/infra e exponha uma porta declarada pelo consumidor em packages/application.',
      from: { path: '^packages/domain/src/', pathNot: '\\.test\\.tsx?$' },
      to: { dependencyTypes: [...NPM, 'core'] },
    },
    {
      name: 'dominio-nao-importa-camada',
      severity: 'error',
      comment:
        'packages/domain é a camada mais pura e não importa nenhum outro pacote. Inverta a dependência: quem precisa do domínio importa ele.',
      from: { path: '^packages/domain/src/' },
      to: {
        path: '^(packages/(application|contracts|infra|api-client|design-tokens|apresentacao)|apps|tools)/',
      },
    },
    {
      name: 'application-sem-dependencia',
      severity: 'error',
      comment:
        'packages/application só declara casos de uso e portas. Biblioteca e runtime ficam no adaptador em packages/infra, ligado em apps/api/src/composicao.',
      from: { path: '^packages/application/src/', pathNot: '\\.test\\.tsx?$' },
      to: { dependencyTypes: [...NPM, 'core'] },
    },
    {
      name: 'application-so-dominio',
      severity: 'error',
      comment:
        'packages/application só importa packages/domain. O formato de rede (contracts) é mapeado na borda HTTP; adaptador concreto (infra) é ligado na composição.',
      from: { path: '^packages/application/src/' },
      to: {
        path: '^(packages/(contracts|infra|api-client|design-tokens|apresentacao)|apps|tools)/',
      },
    },
    {
      name: 'contexto-so-pelo-index',
      severity: 'error',
      comment:
        'Um bounded context só importa outro pelo index.ts dele. Exporte o que precisa no index.ts do contexto de destino.',
      from: { path: '^packages/(domain|application)/src/([^/]+)/' },
      to: {
        path: '^packages/$1/src/([^/]+)/.+',
        pathNot: [
          '^packages/$1/src/$2/',
          '^packages/$1/src/[^/]+/index\\.ts$',
          '^packages/$1/src/[^/]+/fakes\\.ts$',
        ],
      },
    },
    {
      name: 'contracts-so-typebox',
      severity: 'error',
      comment:
        'packages/contracts só depende de @sinclair/typebox. Qualquer outra coisa entra no bundle de web e mobile; elysia aqui colocaria o servidor no app.',
      from: { path: '^packages/contracts/src/', pathNot: '\\.test\\.tsx?$' },
      to: {
        pathNot: ['^packages/contracts/src/', 'node_modules/@sinclair/typebox/'],
      },
    },
    {
      name: 'infra-nao-sobe',
      severity: 'error',
      comment:
        'packages/infra implementa portas de application com tipos de domain. Não conhece contrato de rede, cliente HTTP do front nem apps.',
      from: { path: '^packages/infra/src/' },
      to: { path: '^(packages/(contracts|api-client|design-tokens|apresentacao)|apps|tools)/' },
    },
    {
      name: 'api-client-so-contracts',
      severity: 'error',
      comment:
        'packages/api-client só conhece packages/contracts. Regra de domínio no cliente HTTP duplica a API.',
      from: { path: '^packages/api-client/src/' },
      to: { path: '^(packages/(domain|application|infra|design-tokens|apresentacao)|apps|tools)/' },
    },
    {
      name: 'design-tokens-isolado',
      severity: 'error',
      comment: 'packages/design-tokens é fonte de valor puro e não importa nenhum outro pacote.',
      from: { path: '^packages/design-tokens/src/' },
      to: {
        path: '^(packages/(domain|application|contracts|infra|api-client|apresentacao)|apps|tools)/',
      },
    },
    {
      name: 'apresentacao-isolada',
      severity: 'error',
      comment:
        'packages/apresentacao é formatação e cor pura para web e mobile e não importa nenhum outro pacote. Regra de negócio fica em packages/domain; o app combina os dois.',
      from: { path: '^packages/apresentacao/src/' },
      to: {
        path: '^(packages/(domain|application|contracts|infra|api-client|design-tokens)|apps|tools)/',
      },
    },
    {
      name: 'pacote-nao-importa-app',
      severity: 'error',
      comment:
        'packages/* nunca importa apps/*. Dependência reversa compila em silêncio e quebra o grafo depois. Mova o código comum para um pacote.',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'elysia-so-na-borda-http',
      severity: 'error',
      comment:
        'elysia só é importado sob apps/api/src/http. Fora dali o framework vaza para quem não é servidor. Declare o que precisa como porta ou contrato.',
      from: { pathNot: '^apps/api/src/http/' },
      to: { path: 'node_modules/(elysia|@elysiajs)/' },
    },
    {
      name: 'driver-so-em-infra',
      severity: 'error',
      comment:
        'Driver de banco e SDK de storage só existem em packages/infra/src/db e packages/infra/src/storage (e em tools/db). Em qualquer outro lugar, use a porta.',
      from: { pathNot: ['^packages/infra/src/(db|storage)/', '^tools/db/src/'] },
      to: { path: 'node_modules/(postgres|pg|@aws-sdk/[^/]+)/' },
    },
    {
      name: 'infra-so-na-composicao',
      severity: 'error',
      comment:
        'apps/api só toca packages/infra em src/composicao, que liga adaptadores a casos de uso. Rotas recebem casos de uso já montados.',
      from: { path: '^apps/api/src/', pathNot: '^apps/api/src/composicao/' },
      to: { path: '^packages/infra/' },
    },
    {
      name: 'front-sem-camada-de-servidor',
      severity: 'error',
      comment:
        'web e mobile não importam application nem infra. Falam com a API por @plantao/api-client e só usam regra pura de @plantao/domain.',
      from: { path: '^apps/(web|mobile)/' },
      to: { path: '^packages/(application|infra)/' },
    },
    {
      name: 'front-contracts-so-tipo',
      severity: 'error',
      comment:
        'web e mobile importam @plantao/contracts só com import type. Valor de schema no front arrasta o TypeBox para o bundle; a validação já acontece no api-client.',
      from: { path: '^apps/(web|mobile)/' },
      to: { path: '^packages/contracts/', dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'feature-so-pelo-index',
      severity: 'error',
      comment:
        'Uma feature do front nunca importa arquivo interno de outra. Importe pelo index.ts da feature ou suba o código para compartilhado/.',
      from: { path: '^apps/(web|mobile)/src/features/([^/]+)/' },
      to: {
        path: '^apps/$1/src/features/([^/]+)/.+',
        pathNot: ['^apps/$1/src/features/$2/', '^apps/$1/src/features/[^/]+/index\\.tsx?$'],
      },
    },
    {
      name: 'armazenamento-so-no-adaptador',
      severity: 'error',
      comment:
        'Armazenamento do dispositivo só é tocado em apps/mobile/src/armazenamento, atrás da porta ArmazenamentoDeSessao.',
      from: { pathNot: '^apps/mobile/src/armazenamento/' },
      to: { path: 'node_modules/(@react-native-async-storage/async-storage|expo-secure-store)/' },
    },
    {
      name: 'tools-nao-importa-app',
      severity: 'error',
      comment: 'tools/* não importa apps/*. Ferramenta depende de pacote, nunca de aplicação.',
      from: { path: '^tools/' },
      to: { path: '^apps/' },
    },
    {
      name: 'unit-test-sem-io',
      severity: 'error',
      comment:
        '*.unit.test.ts é zero I/O: sem infra, driver, framework HTTP nem módulo de rede/disco. Use fakes em memória, ou renomeie para *.e2e.test.ts se o teste precisa de infra real.',
      from: { path: '\\.unit\\.test\\.tsx?$' },
      to: {
        path: [
          '^packages/infra/',
          'node_modules/(postgres|pg|@aws-sdk/[^/]+|elysia)/',
          '^(node:)?(fs|fs/promises|net|http|https|child_process|dgram|tls)$',
        ],
      },
    },
    {
      name: 'fake-so-em-teste',
      severity: 'error',
      comment:
        'fakes.ts é apoio de teste (repositório em memória, relógio parado, Ator de teste). Código de produção recebe a implementação real pela composição em apps/api/src/composicao.',
      from: { pathNot: ['\\.test\\.tsx?$', '(^|/)fakes\\.ts$'] },
      to: { path: '(^|/)fakes\\.ts$' },
    },
    {
      name: 'sem-ciclo',
      severity: 'error',
      comment: 'Ciclo de dependência. Extraia a parte comum para um módulo que os dois importam.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'sem-orfao',
      severity: 'error',
      comment:
        'Módulo que ninguém importa e que não é ponto de entrada. Apague, ou importe a partir do index.ts do pacote.',
      from: {
        orphan: true,
        pathNot: [
          '\\.d\\.ts$',
          '(^|/)index\\.tsx?$',
          '(^|/)main\\.ts$',
          '\\.(unit|e2e)\\.test\\.tsx?$',
          '(^|/)fakes\\.ts$',
          '\\.config\\.(ts|js|cjs|mjs)$',
          '^apps/(web/src|mobile)/app/',
          '^packages/design-tokens/src/gerar\\.ts$',
          '^tools/[^/]+/src/[^/]+\\.ts$',
        ],
      },
      to: {},
    },
    {
      name: 'nao-declarado',
      severity: 'error',
      comment:
        'Import que não resolve porque o pacote não está declarado (o linker isolado do Bun só enxerga o que o package.json do próprio pacote declara). Antes de declarar, confira a matriz em docs/arquitetura.md §D: se esta camada não pode importar esse pacote, o import é que está errado. Se pode, declare com versão exata, catalog: ou workspace:*.',
      from: {},
      to: {
        dependencyTypes: ['npm-no-pkg', 'npm-unknown', 'unknown', 'undetermined'],
        pathNot: '^packages/',
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: [
        '(^|/)(dist|\\.next|\\.expo|generated|\\.reports)/',
        '^tools/quality/(fixtures|\\.fixtures-em-uso)/',
        '^apps/(android|windows)/',
        '\\.d\\.ts$',
      ],
    },
    tsPreCompilationDeps: true,
    combinedDependencies: false,
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      exportsFields: ['exports'],
      mainFields: ['module', 'main', 'types'],
    },
    builtInModules: { add: ['bun', 'bun:test'] },
  },
}
