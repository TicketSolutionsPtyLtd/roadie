import { matchesGlob } from 'node:path'
import { type OxlintOverride, defineConfig } from 'oxlint'

import published from '@oztix/roadie-lint-plugin'
import testing from '@oztix/roadie-lint-plugin/oxlint/testing.json' with { type: 'json' }

// Globs resolve from this file's folder, so docs/ has its own config.
const roadie = { name: 'roadie', specifier: './eslint/roadie-plugin.js' }

const nextLink = {
  name: 'next/link',
  message:
    'Pass href and let RoadieProvider route it. See https://ticketsolutionsptyltd.github.io/roadie/foundations/linking.'
}

type Restriction = {
  files: string[]
  except?: string[]
  paths?: { name: string; message: string; allowTypeImports?: boolean }[]
  patterns?: { group: string[]; message: string }[]
}

const DASHBOARD_LAYOUT = [
  'packages/core/src/dashboard/totals.ts',
  'packages/core/src/dashboard/cells.ts',
  'packages/core/src/dashboard/layout.ts'
]

// A group's `*` stops at a slash, unlike ESLint's, so `**` also catches deep
// imports such as @atlaskit/pragmatic-drag-and-drop/element/adapter.
const IMPORT_BOUNDARIES: Restriction[] = [
  { files: ['packages/**/*.{ts,tsx}'], paths: [nextLink] },
  // Third-party engines stay behind one file or folder, so they can be swapped.
  {
    files: ['packages/components/src/**/*.{ts,tsx}'],
    except: ['packages/components/src/components/Sortable/dnd/**/*.{ts,tsx}'],
    patterns: [
      {
        group: ['@atlaskit/**'],
        message: 'Import the drag library only in Sortable/dnd.'
      }
    ]
  },
  {
    files: ['packages/components/src/**/*.{ts,tsx}'],
    except: ['packages/components/src/components/Records/rowWindow.ts'],
    patterns: [
      {
        group: ['@tanstack/**'],
        message: 'Import @tanstack/react-virtual only in Records/rowWindow.ts.'
      }
    ]
  },
  {
    files: ['packages/charts/src/**/*.{ts,tsx}'],
    except: [
      'packages/charts/src/plot/**/*.{ts,tsx}',
      'packages/charts/src/static/**/*.{ts,tsx}',
      'packages/charts/src/**/definition.ts',
      'packages/charts/src/**/definition.test.{ts,tsx}'
    ],
    patterns: [
      {
        group: ['@tanstack/**'],
        message:
          "Import TanStack only in plot/, static/, and each chart's definition.ts."
      }
    ]
  },
  {
    files: ['packages/widgets/src/cart-drawer/react/**/*.{ts,tsx}'],
    patterns: [
      {
        group: ['next', 'next/**'],
        message: 'The React skin routes through onNavigate, not next/*.'
      }
    ]
  },
  // The dashboard-layout entry ships these without zod.
  {
    files: DASHBOARD_LAYOUT,
    paths: [
      { name: 'zod', message: 'Keep this module zod-free.' },
      {
        name: './schema',
        allowTypeImports: true,
        message: 'Import only types from ./schema here.'
      }
    ]
  }
]

const sampleOf = (glob: string) =>
  glob.replace(/\{([^,}]+)[^}]*\}/g, '$1').replace(/\*+/g, 'x')

// The last matching override replaces no-restricted-imports' options, so every
// glob a boundary names gets a block restating each boundary its files sit in,
// ordered from the widest glob to the narrowest. Globs must nest: a file in two
// globs that don't gets only the later block's boundaries.
function importBoundaryOverrides(boundaries: Restriction[]): OxlintOverride[] {
  const globs = [
    ...new Set(boundaries.flatMap((b) => [...b.files, ...(b.except ?? [])]))
  ]
  const applies = (b: Restriction, file: string) =>
    b.files.some((g) => matchesGlob(file, g)) &&
    !b.except?.some((g) => matchesGlob(file, g))
  const depth = (glob: string) =>
    globs.filter((g) => matchesGlob(sampleOf(glob), g)).length
  return globs
    .sort((a, b) => depth(a) - depth(b))
    .map((glob) => {
      const active = boundaries.filter((b) => applies(b, sampleOf(glob)))
      const paths = active.flatMap((b) => b.paths ?? [])
      const patterns = active.flatMap((b) => b.patterns ?? [])
      return {
        files: [glob],
        rules: {
          'no-restricted-imports': active.length
            ? ['error', { paths, patterns }]
            : ('off' as const)
        }
      }
    })
}

const roadieRules = (
  files: string[],
  rules: OxlintOverride['rules'],
  excludeFiles?: string[]
): OxlintOverride => ({ files, ...(excludeFiles && { excludeFiles }), rules })

export default defineConfig({
  plugins: [],
  jsPlugins: [roadie],
  categories: { correctness: 'off' },
  env: { builtin: true },
  // ESLint 9 warns on these by default; oxlint doesn't.
  options: { reportUnusedDisableDirectives: 'warn' },
  // Overrides can't hold settings. rules-of-hooks reads this; exhaustive-deps
  // doesn't, so it gets additionalHooks too.
  settings: {
    'react-hooks': { additionalEffectHooks: '^useIsomorphicLayoutEffect$' }
  },
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/out/**',
    '**/coverage/**',
    '**/.turbo/**',
    '**/roadie-core/**',
    '**/trace-output/**',
    '**/.tsup/**',
    '**/__testfixtures__/**',
    '**/*.config.js',
    '**/*.config.ts',
    '**/*.config.mjs',
    // ESLint never parsed Vue templates here, so Vue files stay unlinted.
    '**/*.vue'
  ],
  rules: {
    'constructor-super': 'error',
    'for-direction': 'error',
    'getter-return': 'error',
    'no-async-promise-executor': 'error',
    'no-case-declarations': 'error',
    'no-class-assign': 'error',
    'no-compare-neg-zero': 'error',
    'no-cond-assign': 'error',
    'no-const-assign': 'error',
    'no-constant-binary-expression': 'error',
    'no-constant-condition': 'error',
    'no-control-regex': 'error',
    'no-debugger': 'error',
    'no-delete-var': 'error',
    'no-dupe-class-members': 'error',
    'no-dupe-else-if': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-empty': 'error',
    'no-empty-character-class': 'error',
    'no-empty-pattern': 'error',
    'no-empty-static-block': 'error',
    'no-ex-assign': 'error',
    'no-extra-boolean-cast': 'error',
    'no-fallthrough': 'error',
    'no-func-assign': 'error',
    'no-global-assign': 'error',
    'no-import-assign': 'error',
    'no-invalid-regexp': 'error',
    'no-irregular-whitespace': 'error',
    'no-loss-of-precision': 'error',
    'no-misleading-character-class': 'error',
    'no-new-native-nonconstructor': 'error',
    'no-nonoctal-decimal-escape': 'error',
    'no-obj-calls': 'error',
    'no-prototype-builtins': 'error',
    'no-redeclare': 'error',
    'no-regex-spaces': 'error',
    'no-self-assign': 'error',
    'no-setter-return': 'error',
    'no-shadow-restricted-names': 'error',
    'no-sparse-arrays': 'error',
    'no-this-before-super': 'error',
    'no-unexpected-multiline': 'error',
    'no-unreachable': 'error',
    'no-unsafe-finally': 'error',
    'no-unsafe-negation': 'error',
    'no-unsafe-optional-chaining': 'error',
    'no-unused-labels': 'error',
    'no-unused-private-class-members': 'error',
    'no-unused-vars': 'error',
    'no-useless-backreference': 'error',
    'no-useless-catch': 'error',
    'no-useless-escape': 'error',
    'no-with': 'error',
    'require-yield': 'error',
    // oxfmt sorts the declarations; this sorts the names inside each one.
    'sort-imports': ['error', { ignoreDeclarationSort: true }],
    'use-isnan': 'error',
    'valid-typeof': 'error'
  },
  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      plugins: ['typescript', 'react'],
      env: { es2022: true, browser: true },
      globals: { React: 'readonly' },
      rules: {
        'no-array-constructor': 'error',
        'no-unused-expressions': 'error',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'no-unexpected-multiline': 'off',
        'react/react-in-jsx-scope': 'off',
        'typescript/ban-ts-comment': 'error',
        'typescript/no-duplicate-enum-values': 'error',
        'typescript/no-explicit-any': 'error',
        'typescript/no-extra-non-null-assertion': 'error',
        'typescript/no-misused-new': 'error',
        'typescript/no-namespace': 'error',
        'typescript/no-non-null-asserted-optional-chain': 'error',
        'typescript/no-require-imports': 'error',
        'typescript/no-this-alias': 'error',
        'typescript/no-unnecessary-type-constraint': 'error',
        'typescript/no-unsafe-declaration-merging': 'error',
        'typescript/no-unsafe-function-type': 'error',
        'typescript/no-wrapper-object-types': 'error',
        'typescript/prefer-as-const': 'error',
        'typescript/prefer-namespace-keyword': 'error',
        'typescript/triple-slash-reference': 'error'
      }
    },
    {
      // TypeScript checks these, and oxlint's no-undef misreads type-only globals.
      files: ['**/*.{js,mjs,cjs}'],
      env: { es2022: true, node: true },
      rules: {
        'no-undef': 'error',
        'no-unexpected-multiline': 'off'
      }
    },
    {
      files: ['**/*.test.{js,ts,tsx}'],
      env: { node: true, vitest: true }
    },
    {
      files: ['packages/components/**/*.{ts,tsx}'],
      plugins: ['react'],
      rules: {
        'react/rules-of-hooks': 'error',
        'react/exhaustive-deps': [
          'warn',
          { additionalHooks: '^useIsomorphicLayoutEffect$' }
        ],
        'react/static-components': 'error',
        'react/use-memo': 'error',
        'react/void-use-memo': 'error',
        'react/preserve-manual-memoization': 'error',
        'react/incompatible-library': 'warn',
        'react/immutability': 'error',
        'react/globals': 'error',
        'react/refs': 'error',
        'react/set-state-in-effect': 'error',
        'react/error-boundaries': 'error',
        'react/purity': 'error',
        'react/set-state-in-render': 'error',
        'react/unsupported-syntax': 'warn'
      }
    },
    {
      // Hydration-time syncs from the DOM, storage or Embla. Each needs a
      // useSyncExternalStore rework, not a one-line fix.
      files: [
        'packages/components/src/components/Carousel/CarouselRoot.tsx',
        'packages/components/src/components/Image/index.tsx',
        'packages/components/src/providers/ThemeProvider.tsx'
      ],
      rules: { 'react/set-state-in-effect': 'warn' }
    },
    roadieRules(['packages/**/*.{ts,tsx}'], {
      ...(published.configs.recommended.rules as OxlintOverride['rules']),
      'roadie/no-dynamic-next-link': 'error'
    }),
    roadieRules(
      ['packages/*/src/**/*.{ts,tsx}'],
      { 'roadie/no-import-meta-env': 'error' },
      ['**/*.test.{ts,tsx}']
    ),
    // The testing preset covers the tests; these are the helpers they wait in.
    roadieRules(
      [
        'packages/**/testUtils.{ts,tsx}',
        'packages/**/*TestUtils.{ts,tsx}',
        'packages/**/browserTesting.tsx',
        'packages/*/vitest.setup.ts',
        'packages/components/src/components/RecordTable/renderCounter.ts'
      ],
      { 'roadie/no-fixed-sleep': 'error' }
    ),
    ...(testing.overrides as OxlintOverride[]),
    roadieRules(
      [
        // Has its own setup (INNO-1238).
        'packages/widgets/src/cart-drawer/vue/useCartDrawerDrag.test.ts'
      ],
      { 'roadie/no-layout-fake-in-jsdom': 'off' }
    ),
    roadieRules(
      [
        // Parity tests: each checks a generated file or a mirrored constant
        // against the CSS it comes from, not rendered behaviour.
        'packages/core/src/utils/cn.test.ts',
        // palette.ts mirrors tokens.css.
        'packages/core/src/dataviz/parity.test.ts',
        // DEFAULT_ACCENT_COLOR mirrors the accent step 9 in tokens.css.
        'packages/core/src/theme/parity.test.ts',
        // The audit and charts skills mirror palette.ts and tokens.css.
        'packages/core/src/dataviz/skill-parity.test.ts',
        // The motion skill names every token and utility in motion.css.
        'packages/core/src/css/motion-skill-parity.test.ts',
        // tokens.json is generated from every sheet roadie.css imports.
        'packages/core/src/tokens/manifest.test.ts',
        // NAVIGATOR_EXPANDED_SCOPE mirrors the variant so jsdom tests can match it.
        'packages/core/src/css/navigator-variant.test.ts',
        // safelist.html must name every @utility in charts.css.
        'packages/charts/src/css/safelist.test.ts'
      ],
      { 'roadie/no-css-source-in-jsdom': 'off' }
    ),
    roadieRules(['packages/widgets/src/cart-drawer/react/**/*.{ts,tsx}'], {
      'roadie/no-dynamic-next-import': 'error'
    }),
    roadieRules(DASHBOARD_LAYOUT, { 'roadie/no-dynamic-zod-import': 'error' }),
    ...importBoundaryOverrides(IMPORT_BOUNDARIES)
  ]
})
