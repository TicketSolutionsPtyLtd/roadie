import js from '@eslint/js'
import pandacssPlugin from '@pandacss/eslint-plugin'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import reactPlugin from 'eslint-plugin-react'
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
      '@pandacss': pandacssPlugin,
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
      ...pandacssPlugin.configs.recommended.rules,
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

      // Panda CSS rules
      '@pandacss/no-margin-properties': 'warn',
      '@pandacss/no-config-function-in-source': 'off'
    }
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
