import { createRequire } from 'node:module'

import { cardRules } from './card.js'
import { classRules } from './classes.js'
import { phosphorRules } from './phosphor.js'

const { name, version } = createRequire(import.meta.url)('../package.json')

const rules = { ...phosphorRules, ...classRules, ...cardRules }

const plugin = {
  meta: { name, version },
  rules,
  configs: {}
}

plugin.configs.recommended = {
  name: `${name}/recommended`,
  files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
  plugins: { roadie: plugin },
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  rules: Object.fromEntries(
    Object.keys(rules).map((rule) => [`roadie/${rule}`, 'error'])
  )
}

export default plugin
