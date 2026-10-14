import { classRules } from './classes.js'
import { phosphorRules } from './phosphor.js'

const rules = { ...phosphorRules, ...classRules }

const plugin = {
  meta: { name: '@oztix/eslint-plugin-roadie' },
  rules,
  configs: {}
}

plugin.configs.recommended = {
  name: '@oztix/eslint-plugin-roadie/recommended',
  files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
  plugins: { roadie: plugin },
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  rules: Object.fromEntries(
    Object.keys(rules).map((name) => [`roadie/${name}`, 'error'])
  )
}

export default plugin
