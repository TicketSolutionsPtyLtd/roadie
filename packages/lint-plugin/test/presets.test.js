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
