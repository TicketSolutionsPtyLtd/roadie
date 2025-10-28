import { FlatCompat } from '@eslint/eslintrc'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

import rootConfig from '../eslint.config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname
})

export default [
  // Extend root config
  ...rootConfig,

  // Next.js config (converted from eslintrc format)
  ...compat.extends('next/core-web-vitals'),

  // MDX plugin config (converted from eslintrc format)
  ...compat.extends('plugin:mdx/recommended'),

  // MDX settings and rules
  {
    files: ['**/*.mdx'],
    settings: {
      'mdx/code-blocks': true
    },
    rules: {
      // MDX files import components that are used in the content
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },

  // Next.js generated files
  {
    files: ['**/next-env.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off'
    }
  },

  // MDX components file
  {
    files: ['**/mdx-components.tsx'],
    languageOptions: {
      globals: {
        MDXProvidedComponents: 'readonly'
      }
    }
  },

  // Docs-specific overrides
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      // Allow any types in docs examples
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
]
