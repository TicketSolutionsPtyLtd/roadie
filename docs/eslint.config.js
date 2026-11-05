// Oxlint lints this app's JS and TS (oxlint.config.ts). ESLint stays for
// Markdown and MDX only, because oxlint has no processors to lint live fences
// as code, so this config keeps the live-fence processor and the MDX rules.
import {
  createRemarkProcessor,
  flatCodeBlocks,
  flat as mdxFlat
} from 'eslint-plugin-mdx'
import oxlint from 'eslint-plugin-oxlint'
import reactHooks from 'eslint-plugin-react-hooks'
import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

import published from '@oztix/roadie-lint-plugin'

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

// Live examples get icons from LiveRunner's scope, so the phosphor rules have
// no import to find them by. A key without the Icon suffix fails
// roadie/phosphor-icon-suffix wherever a fence uses it.
function liveScopeIcons() {
  const runner = readFileSync(
    new URL('./src/components/LiveRunner.tsx', import.meta.url),
    'utf8'
  )
  const [, icons] = runner.match(/^const PhosphorIcons = \{\n([^}]*)\n\}/m)
  return [...icons.matchAll(/^ {2}(\w+)/gm)].map(([, name]) => name)
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

const MARKDOWN = ['**/*.{md,mdx}', '**/*.{md,mdx}/**']

// Oxlint never sees fences, so its rules stay on for them. Elsewhere, such as
// a .tsx open in an editor, ESLint leaves oxlint's rules to oxlint.
const oxlintRules = (
  await oxlint.buildFromConfigFile(
    fileURLToPath(new URL('./oxlint.config.ts', import.meta.url))
  )
).map((block) =>
  // A block with only ignores is a global ignore, so it stays as it is.
  block.rules
    ? { ...block, ignores: [...(block.ignores ?? []), ...MARKDOWN] }
    : block
)

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
      ...published.configs.recommended.rules,
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
      'src/app/{components,charts}/{accordion,badge,bar-chart,button,dashboards,data-visualisation,record-grid}/page.mdx/*.{tsx,jsx}',
      'src/app/components/{autocomplete,checkbox,combobox,date-field,date-picker,date-range-picker,field,input,number-field,otp-field,query-field,radio-group,select,slider,textarea,time-field}/page.mdx/*.{tsx,jsx}',
      'src/app/components/{breadcrumb,carousel,collapsible,dialog,drawer,list,menu,navigator,pane,popover,steps,tabs,toast,toggle-group,tooltip}/page.mdx/*.{tsx,jsx}',
      'src/app/components/{avatar,callout,card,empty-state,icon-tile,kbd,logo,mark,progress,qr-code,skeleton,spot-illustration}/page.mdx/*.{tsx,jsx}',
      'src/app/components/{calendar,calendar-tile,code,countdown,date-time,duration,highlight,icon-button,link-button,link-icon-button,prose,separator,toggle}/page.mdx/*.{tsx,jsx}',
      'src/app/charts/{chart,chart-patterns,dashboard-period,data-card,delta,funnel,heatmap,histogram,line-chart,meter,ranked-bars,scatter,small-multiples,sparkline,stacked-bars,stat-tile}/page.mdx/*.{tsx,jsx}',
      'src/app/foundations/{date-and-time,iconography,interactions,layout,linking,motion,navigation,records,theming,typography}/page.mdx/*.{tsx,jsx}'
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

  ...oxlintRules
]

export default config
