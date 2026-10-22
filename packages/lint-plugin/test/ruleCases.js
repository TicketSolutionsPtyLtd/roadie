import typescriptParser from '@typescript-eslint/parser'
import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'

import roadie from '../src/index.js'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

const tester = new RuleTester({
  languageOptions: {
    parser: typescriptParser,
    parserOptions: { ecmaFeatures: { jsx: true } }
  }
})

/** Runs each rule's cases; a string invalid case expects one error. */
export function runRuleCases(cases) {
  for (const [name, { valid, invalid }] of Object.entries(cases)) {
    tester.run(name, roadie.rules[name], {
      valid,
      invalid: invalid.map((code) => ({
        errors: 1,
        ...(typeof code === 'string' ? { code } : code)
      }))
    })
  }
}
