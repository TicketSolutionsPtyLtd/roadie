import { createRequire } from 'node:module'

import { cardRules } from './card.js'
import { classRules } from './classes.js'
import { docsPage } from './docs.js'
import { phosphorRules } from './phosphor.js'
import { jsdomRules, testRules } from './testing.js'

const { name, version } = createRequire(import.meta.url)('../package.json')

const LINTING = docsPage('overview/linting')

const linked = (ruleSet, section) =>
  Object.fromEntries(
    Object.entries(ruleSet).map(([id, rule]) => [
      id,
      {
        ...rule,
        meta: {
          ...rule.meta,
          docs: { ...rule.meta.docs, url: `${LINTING}#${section}` }
        }
      }
    ])
  )

const recommendedRules = linked(
  { ...phosphorRules, ...classRules, ...cardRules },
  'rules'
)
const testingRules = linked({ ...jsdomRules, ...testRules }, 'testing')
const rules = { ...recommendedRules, ...testingRules }

const plugin = {
  meta: { name, version },
  rules,
  configs: {}
}

const turn = (severity, ruleSet) =>
  Object.fromEntries(
    Object.keys(ruleSet).map((rule) => [`roadie/${rule}`, severity])
  )

const languageOptions = { parserOptions: { ecmaFeatures: { jsx: true } } }
const EXTENSIONS = '{js,jsx,mjs,cjs,ts,tsx,mts,cts}'

plugin.configs.recommended = {
  name: `${name}/recommended`,
  files: [`**/*.${EXTENSIONS}`],
  plugins: { roadie: plugin },
  languageOptions,
  rules: turn('error', recommendedRules)
}

plugin.configs.testing = [
  {
    name: `${name}/testing`,
    files: [`**/*.test.${EXTENSIONS}`],
    plugins: { roadie: plugin },
    languageOptions,
    rules: turn('error', testingRules)
  },
  // Vitest's browser mode, and Playwright's specs and e2e folders, run in a
  // real browser, which is where layout and CSS get tested.
  {
    name: `${name}/testing/browser`,
    files: [
      `**/*.browser.test.${EXTENSIONS}`,
      `**/*.spec.${EXTENSIONS}`,
      `**/e2e/**/*.${EXTENSIONS}`
    ],
    plugins: { roadie: plugin },
    languageOptions,
    rules: { ...turn('off', jsdomRules), 'roadie/no-fixed-sleep': 'error' }
  }
]

export default plugin
