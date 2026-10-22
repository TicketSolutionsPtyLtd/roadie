import { defineConfig } from 'oxfmt'

export default defineConfig({
  arrowParens: 'always',
  bracketSameLine: false,
  bracketSpacing: true,
  embeddedLanguageFormatting: 'auto',
  endOfLine: 'lf',
  htmlWhitespaceSensitivity: 'css',
  jsxSingleQuote: true,
  printWidth: 80,
  proseWrap: 'preserve',
  quoteProps: 'as-needed',
  semi: false,
  singleAttributePerLine: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'none',
  useTabs: false,
  sortPackageJson: false,
  sortTailwindcss: { stylesheet: './packages/core/src/css/roadie.css' },
  // Prettier's old importOrder. oxlint's sort-imports orders the specifiers.
  sortImports: {
    ignoreCase: false,
    sortSideEffects: true,
    internalPattern: ['@/'],
    customGroups: [
      { groupName: 'react', elementNamePattern: ['react'] },
      { groupName: 'next', elementNamePattern: ['next*', 'next*/**'] },
      { groupName: 'oztix', elementNamePattern: ['@oztix/**'] }
    ],
    groups: [
      'react',
      'next',
      ['builtin', 'external', 'unknown'],
      'internal',
      'oztix',
      ['parent', 'sibling', 'index']
    ]
  },
  ignorePatterns: [
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/coverage/**',
    '**/.turbo/**',
    '**/roadie-core/**',
    '**/.cache/**',
    '**/__testfixtures__/**',
    'pnpm-lock.yaml',
    'packages/core/src/tokens/tokens.json',
    'packages/core/src/css/dataviz.css',
    '**/tokens/figma/mode-tokens-*.json',
    '**/tokens/panda/default.json',
    '*.d.ts',
    '.vscode/*',
    '!.vscode/settings.json',
    '!.vscode/extensions.json',
    '.playwright-mcp/',
    // The formatter rewrites the live tsx fences, which are the content here:
    // it turns {/* comments */} into blocks and reorders the Tailwind classes
    // on the pages that teach class order.
    'docs/**/*.mdx',
    'docs/plans/',
    'docs/brainstorms/',
    '.scratch/'
  ]
})
