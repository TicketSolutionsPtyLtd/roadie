import typescriptParser from '@typescript-eslint/parser'
import { RuleTester as ESLintRuleTester } from 'eslint'
import { RuleTester as OxlintRuleTester } from 'oxlint/plugins-dev'
import { describe, it } from 'vitest'

import roadie from '../src/index.js'

for (const Tester of [ESLintRuleTester, OxlintRuleTester]) {
  Tester.describe = describe
  Tester.it = it
  Tester.itOnly = it.only
}

// Each rule runs in both tools, since oxlint has its own parser and scope
// analysis behind the same API.
const testers = [
  [
    'ESLint',
    new ESLintRuleTester({
      languageOptions: {
        parser: typescriptParser,
        parserOptions: { ecmaFeatures: { jsx: true } }
      }
    })
  ],
  [
    'oxlint',
    new OxlintRuleTester({
      eslintCompat: true,
      languageOptions: { parserOptions: { lang: 'tsx' } }
    })
  ]
]

/** Runs each rule's cases; a string invalid case expects one error. */
export function runRuleCases(cases) {
  for (const [tool, tester] of testers) {
    describe(tool, () => {
      for (const [name, { valid, invalid }] of Object.entries(cases)) {
        tester.run(name, roadie.rules[name], {
          valid,
          invalid: invalid.map((code) => ({
            errors: 1,
            ...(typeof code === 'string' ? { code } : code)
          }))
        })
      }
    })
  }
}
