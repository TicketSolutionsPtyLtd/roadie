import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

import roadie from './eslint/roadie-plugin.js'

// A later no-restricted-imports block replaces earlier ones, so each repeats this.
const nextLink = {
  name: 'next/link',
  message:
    'Pass href and let RoadieProvider route it. See https://ticketsolutionsptyltd.github.io/roadie/foundations/linking.'
}

export default [
  // Ignore patterns
  {
    ignores: [
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
      'pnpm-lock.yaml'
    ]
  },

  // Base recommended config for all files
  js.configs.recommended,

  // TypeScript files configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': typescript,
      prettier: prettierPlugin,
      react: reactPlugin
    },
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        React: 'readonly'
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...prettierConfig.rules,

      // Prettier integration
      'prettier/prettier': 'error',

      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-empty-object-type': 'off'
    }
  },

  {
    files: ['packages/components/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat['recommended-latest'],
    settings: {
      'react-hooks': { additionalEffectHooks: '^useIsomorphicLayoutEffect$' }
    }
  },
  {
    files: ['packages/**/*.{ts,tsx}'],
    plugins: { roadie },
    rules: {
      'roadie/phosphor-icon-suffix': 'error',
      'roadie/phosphor-icon-size-prop': 'error',
      'roadie/phosphor-icon-weight': 'error',
      'roadie/no-dark-variant': 'error',
      'roadie/no-hex-colour-class': 'error',
      'roadie/no-arbitrary-z-index': 'error',
      'roadie/no-arbitrary-radius': 'warn',
      'roadie/no-dynamic-next-link': 'error',
      'no-restricted-imports': ['error', { paths: [nextLink] }]
    }
  },
  {
    files: ['packages/*/src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: { 'roadie/no-import-meta-env': 'error' }
  },
  {
    files: ['packages/**/*.test.{ts,tsx}'],
    rules: { 'roadie/no-fixed-sleep': 'warn' }
  },
  {
    files: ['packages/**/*.test.{ts,tsx}'],
    ignores: ['**/*.browser.test.{ts,tsx}'],
    rules: {
      'roadie/no-css-class-in-jsdom': 'warn',
      'roadie/no-compound-root-identity': 'warn',
      'roadie/no-cva-output-assertion': 'warn'
    }
  },
  {
    files: ['packages/**/*.test.{ts,tsx}'],
    ignores: [
      '**/*.browser.test.{ts,tsx}',
      'packages/core/src/utils/cn.test.ts'
    ],
    rules: { 'roadie/no-css-source-in-jsdom': 'warn' }
  },
  {
    files: ['packages/widgets/src/cart-drawer/react/**/*.{ts,tsx}'],
    rules: {
      'roadie/no-dynamic-next-import': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['next', 'next/*'],
              message: 'The React skin routes through onNavigate, not next/*.'
            }
          ]
        }
      ]
    }
  },
  {
    // The dashboard-layout entry ships these without zod.
    files: [
      'packages/core/src/dashboard/totals.ts',
      'packages/core/src/dashboard/cells.ts',
      'packages/core/src/dashboard/layout.ts'
    ],
    rules: {
      'roadie/no-dynamic-zod-import': 'error',
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
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
    }
  },
  {
    // Third-party engines stay behind one file or folder, so they can be
    // swapped. TanStack uses the typescript-eslint copy of the rule so each
    // boundary keeps its own exceptions.
    files: ['packages/components/src/**/*.{ts,tsx}'],
    ignores: ['packages/components/src/components/Sortable/dnd/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [nextLink],
          patterns: [
            {
              group: ['@atlaskit/*'],
              message: 'Import the drag library only in Sortable/dnd.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['packages/components/src/**/*.{ts,tsx}'],
    ignores: ['packages/components/src/components/RecordTable/rowWindow.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@tanstack/*'],
              message:
                'Import @tanstack/react-virtual only in RecordTable/rowWindow.ts.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['packages/charts/src/**/*.{ts,tsx}'],
    ignores: [
      'packages/charts/src/plot/**',
      'packages/charts/src/static/**',
      'packages/charts/src/**/definition.ts',
      'packages/charts/src/**/definition.test.{ts,tsx}'
    ],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@tanstack/*'],
              message:
                "Import TanStack only in plot/, static/, and each chart's definition.ts."
            }
          ]
        }
      ]
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
    rules: { 'react-hooks/set-state-in-effect': 'warn' }
  },

  // JavaScript files configuration
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    plugins: {
      prettier: prettierPlugin
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      ...prettierConfig.rules,
      'prettier/prettier': 'error'
    }
  },

  // Test files configuration (Vitest)
  {
    files: ['**/*.test.js', '**/*.test.ts', '**/*.test.tsx'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest
      }
    }
  }
]
