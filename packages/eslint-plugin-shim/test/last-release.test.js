import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { pendingBumps, rereleasesShim } from './lastRelease.js'

const read = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))

const changesetDir = new URL('../../../.changeset/', import.meta.url)
const changesets = readdirSync(changesetDir)
  .filter((file) => file.endsWith('.md') && file !== 'README.md')
  .map((file) => readFileSync(new URL(file, changesetDir), 'utf8'))

const PLUGIN = '@oztix/roadie-lint-plugin'
const SHIM = '@oztix/roadie-eslint-plugin'

// The README promises 0.1.2 is this name's last release. Changesets bumps the
// shim whenever its dependency on the new name leaves its range, so a minor
// of the new name would publish an undeprecated 0.1.3.
it('stays at its last release until the shim is removed', () => {
  const bumps = pendingBumps(changesets)
  expect(
    rereleasesShim({
      pluginVersion: read('../../lint-plugin/package.json').version,
      pluginBump: bumps[PLUGIN],
      shimBump: bumps[SHIM]
    }),
    `A ${bumps[PLUGIN]} of ${PLUGIN} would release ${SHIM} again. Remove packages/eslint-plugin-shim before it merges.`
  ).toBe(false)
})

describe('pendingBumps', () => {
  it('reads each package and bump from changeset frontmatter', () => {
    expect(
      pendingBumps([
        `---\n'${PLUGIN}': minor\n"${SHIM}": patch\n---\n\nText: major\n`,
        `---\n${PLUGIN}: patch\n---\n`
      ])
    ).toEqual({ [PLUGIN]: 'minor', [SHIM]: 'patch' })
  })
})

describe('rereleasesShim', () => {
  it.each([
    ['0.2.0', 'minor', undefined, true],
    ['0.2.0', 'major', undefined, true],
    ['0.2.0', 'patch', undefined, false],
    ['0.2.0', undefined, undefined, false],
    ['1.0.0', 'minor', undefined, false],
    ['1.0.0', 'major', undefined, true],
    // The release that ships 0.1.2 bumps both on purpose.
    ['0.1.1', 'minor', 'patch', false]
  ])(
    'at %s, a %s of the new name with a %s of the shim: %s',
    (pluginVersion, pluginBump, shimBump, expected) => {
      expect(rereleasesShim({ pluginVersion, pluginBump, shimBump })).toBe(
        expected
      )
    }
  )
})
