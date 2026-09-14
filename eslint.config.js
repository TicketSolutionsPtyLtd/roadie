import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

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
    ...reactHooks.configs.flat['recommended-latest']
  },
  {
    files: [
      'packages/components/src/components/Carousel/Carousel.test.tsx',
      'packages/components/src/components/Carousel/CarouselRoot.tsx',
      'packages/components/src/components/Image/index.tsx',
      'packages/components/src/components/Link/RoadieRoutedLink.tsx',
      'packages/components/src/components/Navigator/NavigatorPrimary.tsx',
      'packages/components/src/providers/ThemeProvider.tsx'
    ],
    rules: Object.fromEntries(
      Object.keys(reactHooks.configs.flat['recommended-latest'].rules).map(
        (rule) => [rule, 'warn']
      )
    )
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
