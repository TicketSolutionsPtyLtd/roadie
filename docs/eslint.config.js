import prettierConfig from 'eslint-config-prettier'
import {
  createRemarkProcessor,
  flatCodeBlocks,
  flat as mdxFlat
} from 'eslint-plugin-mdx'
import reactHooks from 'eslint-plugin-react-hooks'
import { readFileSync } from 'fs'
import { createRequire } from 'module'

import roadie from '../eslint/roadie-plugin.js'
import { startsWithJsx } from './src/lib/fence-layout.mjs'
import { LIVE_LANGUAGE } from './src/lib/live-examples.mjs'

const require = createRequire(import.meta.url)
const nextConfig = require('eslint-config-next/core-web-vitals')

const remark = createRemarkProcessor({
  lintCodeBlocks: true,
  languageMapper: false
})

// Live examples lint as tsx or jsx. Plain fences are often fragments, so they
// get a name no config matches.
function fenceName(filename) {
  const dot = filename.lastIndexOf('.')
  const lang = filename.slice(dot + 1)
  if (LIVE_LANGUAGE.test(lang)) {
    return `${filename.slice(0, dot)}.${lang.slice(0, 3)}`
  }
  return /^[jt]sx?$/.test(lang) ? `${filename}-snippet` : filename
}

// Live examples get LiveRunner's imported icons, and the bare names it maps
// them to, from scope, so the phosphor rules have no import to find them by.
function liveScopeIcons() {
  const runner = readFileSync(
    new URL('./src/components/LiveRunner.tsx', import.meta.url),
    'utf8'
  )
  const [, imported] = runner.match(
    /import \{([^}]*)\} from '@phosphor-icons\/react'/
  )
  const bare = [...runner.matchAll(/^ {2}(\w+): \w+Icon,?$/gm)]
  return [
    ...imported.split(',').map((name) => name.trim()),
    ...bare.map(([, name]) => name)
  ].filter(Boolean)
}

// A fence that CodePreview lays out may hold sibling elements, which react-live
// runs in a fragment. Lint sees the same fragment, and positions shift back.
const FRAGMENT = '<>'
const fragmentBlocks = new Map()

const isSiblingFence = ({ filename, text }) =>
  LIVE_LANGUAGE.test(filename.slice(filename.lastIndexOf('.') + 1)) &&
  !filename.includes('noinline') &&
  startsWithJsx(text)

const unwrapFix = (fix) =>
  fix && fix.range[0] >= FRAGMENT.length
    ? { ...fix, range: fix.range.map((index) => index - FRAGMENT.length) }
    : undefined

function unwrapPosition(message) {
  const shift = (line, column) =>
    line === 1 ? Math.max(1, column - FRAGMENT.length) : column
  return {
    ...message,
    column: shift(message.line, message.column),
    ...(message.endLine !== undefined && {
      endColumn: shift(message.endLine, message.endColumn)
    }),
    fix: unwrapFix(message.fix),
    suggestions: message.suggestions
      ?.map((suggestion) => ({ ...suggestion, fix: unwrapFix(suggestion.fix) }))
      .filter((suggestion) => suggestion.fix)
  }
}

const liveFenceProcessor = {
  ...remark,
  preprocess(text, filename) {
    const wrapped = new Set()
    const blocks = remark.preprocess(text, filename).map((block, index) => {
      if (typeof block === 'string') return block
      const named = { ...block, filename: fenceName(block.filename) }
      if (!isSiblingFence(block)) return named
      wrapped.add(index)
      return { ...named, text: `${FRAGMENT}${block.text}</>` }
    })
    fragmentBlocks.set(filename, wrapped)
    return blocks
  },
  postprocess(messages, filename) {
    const wrapped = fragmentBlocks.get(filename) ?? new Set()
    fragmentBlocks.delete(filename)
    return remark.postprocess(
      messages.map((list, index) =>
        wrapped.has(index) ? list.map(unwrapPosition) : list
      ),
      filename
    )
  }
}

const config = [
  // Ignore generated files and Next.js build artifacts
  {
    ignores: ['**/roadie-core/**', '.next/**', 'out/**', 'next-env.d.ts']
  },

  // Next.js config (native flat config)
  ...nextConfig,

  // eslint-config-next already registers the plugin, so only the rules
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    rules: reactHooks.configs.flat['recommended-latest'].rules
  },

  // MDX plugin config
  mdxFlat,
  // mdxFlat's processor never sees the mdx/code-blocks setting under flat
  // config, so fences need a processor built with it.
  {
    files: ['**/*.mdx'],
    processor: liveFenceProcessor
  },
  flatCodeBlocks,

  // Live examples are copyable consumer code, so they follow package rules.
  {
    files: ['**/*.mdx/*.{tsx,jsx}'],
    plugins: { roadie },
    settings: { roadie: { phosphorIcons: liveScopeIcons() } },
    rules: {
      'roadie/phosphor-icon-suffix': 'error',
      'roadie/phosphor-icon-size-prop': 'error',
      'roadie/phosphor-icon-weight': 'error',
      'roadie/no-dark-variant': 'error',
      'roadie/no-hex-colour-class': 'error',
      'roadie/no-arbitrary-z-index': 'error',
      'roadie/no-arbitrary-radius': 'error',
      // The live editor puts components in scope, so examples don't import them.
      'react/jsx-no-undef': 'off',
      // React renders a straight apostrophe as is; escaping it hurts copying.
      'react/no-unescaped-entities': 'off',
      // Consumers aren't all on Next.js.
      '@next/next/no-img-element': 'off'
    }
  },

  // Pages move to fence layout options in batches (INNO-1193); each batch
  // adds its pages here, until the rule covers every fence.
  {
    files: [
      'src/app/{components,charts}/{accordion,badge,bar-chart,button,record-grid}/page.mdx/*.{tsx,jsx}',
      'src/app/foundations/{date-and-time,iconography,interactions,layout,linking,records,theming,typography}/page.mdx/*.{tsx,jsx}'
    ],
    plugins: { roadie },
    rules: {
      'roadie/no-fence-layout-wrapper': 'error'
    }
  },

  // Fences lint as virtual files such as page.mdx/0.tsx, or page.mdx/0.mdx.
  {
    files: ['**/*.mdx'],
    ignores: ['**/*.mdx/**'],
    plugins: { roadie },
    rules: {
      'roadie/no-mdx-layout-class': 'error'
    }
  },

  // MDX settings and rules
  {
    files: ['**/*.mdx'],
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
