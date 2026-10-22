import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import plugin from '../src/index.js'

const oxlintPreset = (name) =>
  JSON.parse(
    readFileSync(new URL(`../oxlint/${name}.json`, import.meta.url), 'utf8')
  )

describe.each(Object.keys(plugin.configs))('the %s preset', (name) => {
  const preset = oxlintPreset(name)

  it('turns on the same rules in oxlint as in ESLint', () => {
    expect(preset.rules).toEqual(plugin.configs[name].rules)
  })

  // Given a bare specifier, oxlint names the plugin after the package, which
  // would make every rule ID @oztix/roadie-lint-plugin/<rule>.
  it('loads the plugin as roadie, so rule IDs match ESLint', () => {
    expect(preset.jsPlugins).toEqual([
      { name: 'roadie', specifier: plugin.meta.name }
    ])
  })
})
