import prettierConfig from 'eslint-config-prettier'
import { flatCodeBlocks, flat as mdxFlat } from 'eslint-plugin-mdx'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const nextConfig = require('eslint-config-next/core-web-vitals')

const config = [
  // Ignore generated files and Next.js build artifacts
  {
    ignores: ['**/roadie-core/**', '.next/**', 'out/**', 'next-env.d.ts']
  },

  // Next.js config (native flat config)
  ...nextConfig,

  // MDX plugin config
  mdxFlat,
  flatCodeBlocks,

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
  },

  // Prettier config (must be last to override conflicting rules)
  prettierConfig
]

export default config
