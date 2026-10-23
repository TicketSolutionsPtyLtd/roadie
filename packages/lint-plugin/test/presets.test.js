import { ESLint } from 'eslint'
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import plugin from '../src/index.js'

const oxlintDir = new URL('../oxlint/', import.meta.url)

const oxlintPreset = (name) =>
  JSON.parse(readFileSync(new URL(`${name}.json`, oxlintDir), 'utf8'))

// Top-level rules apply to every file oxlint lints.
const EVERY_SOURCE = ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}']

const oxlintScopes = ({ rules, overrides = [] }) => [
  ...(rules ? [{ files: EVERY_SOURCE, rules }] : []),
  ...overrides
]

const eslintScopes = (config) =>
  [config].flat().map(({ files, rules }) => ({ files, rules }))

it('ships an oxlint preset for each ESLint config, and no other', () => {
  const presets = readdirSync(oxlintDir).map((file) =>
    file.replace(/\.json$/, '')
  )
  expect(presets.sort()).toEqual(Object.keys(plugin.configs).sort())
})

describe.each(Object.keys(plugin.configs))('the %s preset', (name) => {
  const preset = oxlintPreset(name)

  it('turns on the same rules for the same files in oxlint as in ESLint', () => {
    expect(oxlintScopes(preset)).toEqual(eslintScopes(plugin.configs[name]))
  })

  // Given a bare specifier, oxlint names the plugin after the package, which
  // would make every rule ID @oztix/roadie-lint-plugin/<rule>.
  it('loads the plugin as roadie, so rule IDs match ESLint', () => {
    expect(preset.jsPlugins).toEqual([
      { name: 'roadie', specifier: plugin.meta.name }
    ])
  })
})

describe('the testing preset', () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: plugin.configs.testing
  })
  const on = async (file) => {
    const { rules = {} } = (await eslint.calculateConfigForFile(file)) ?? {}
    return Object.keys(rules)
      .filter((rule) => rules[rule][0] === 2)
      .map((rule) => rule.replace('roadie/', ''))
      .sort()
  }
  const ALL = [
    'no-css-class-in-jsdom',
    'no-css-source-in-jsdom',
    'no-cva-output-assertion',
    'no-fixed-sleep',
    'no-layout-fake-in-jsdom'
  ]

  it.each([
    ['a.test.js', ALL],
    ['a.test.tsx', ALL],
    ['a.test.mts', ALL],
    ['a.test.cjs', ALL],
    ['a.browser.test.tsx', ['no-cva-output-assertion', 'no-fixed-sleep']],
    ['a.browser.test.mts', ['no-cva-output-assertion', 'no-fixed-sleep']],
    ['a.spec.ts', ['no-fixed-sleep']],
    ['e2e/checkout.e2e.test.ts', ['no-cva-output-assertion', 'no-fixed-sleep']],
    ['e2e/serve.ts', ['no-fixed-sleep']],
    ['src/Ticket.tsx', []]
  ])('turns on in %s: %j', async (file, rules) =>
    expect(await on(file)).toEqual(rules)
  )
})
