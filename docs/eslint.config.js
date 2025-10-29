import pandacssPlugin from '@pandacss/eslint-plugin'
import { flatCodeBlocks, flat as mdxFlat } from 'eslint-plugin-mdx'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const nextConfig = require('eslint-config-next')

const config = [
  // Ignore generated files
  {
    ignores: ['**/roadie-core/**']
  },

  // Next.js config (native flat config)
  ...nextConfig,

  // MDX plugin config
  mdxFlat,
  flatCodeBlocks,

  // Panda CSS rules - only apply to source files, not MDX
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    ignores: ['**/*.mdx', '**/*.mdx/**'],
    plugins: {
      '@pandacss': pandacssPlugin
    },
    rules: {
      ...pandacssPlugin.configs.recommended.rules,
      '@pandacss/no-margin-properties': 'warn',
      '@pandacss/no-config-function-in-source': 'off'
    }
  },

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

export default config
