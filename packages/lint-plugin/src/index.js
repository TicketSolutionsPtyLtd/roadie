import { createRequire } from 'node:module'

import { cardRules } from './card.js'
import { classRules } from './classes.js'
import { phosphorRules } from './phosphor.js'
import { jsdomRules } from './testing.js'

const { name, version } = createRequire(import.meta.url)('../package.json')

const recommendedRules = { ...phosphorRules, ...classRules, ...cardRules }
const rules = { ...recommendedRules, ...jsdomRules }

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

plugin.configs.recommended = {
  name: `${name}/recommended`,
  files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
  plugins: { roadie: plugin },
  languageOptions,
  rules: turn('error', recommendedRules)
}

plugin.configs.testing = [
  {
    name: `${name}/testing`,
    files: ['**/*.test.{js,jsx,ts,tsx}'],
    plugins: { roadie: plugin },
    languageOptions,
    rules: turn('error', jsdomRules)
  },
  // A browser test is where layout and CSS get tested.
  {
    name: `${name}/testing/browser`,
    files: ['**/*.browser.test.{js,jsx,ts,tsx}'],
    rules: turn('off', jsdomRules)
  }
]

export default plugin
