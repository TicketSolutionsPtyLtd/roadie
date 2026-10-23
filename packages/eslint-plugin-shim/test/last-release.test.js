import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { nextShimVersion, pendingBumps } from './lastRelease.js'

const read = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))

const changesetDir = new URL('../../../.changeset/', import.meta.url)
const changesets = readdirSync(changesetDir)
  .filter((file) => file.endsWith('.md') && file !== 'README.md')
  .map((file) => readFileSync(new URL(file, changesetDir), 'utf8'))

const PLUGIN = '@oztix/roadie-lint-plugin'
const SHIM = '@oztix/roadie-eslint-plugin'

const LAST_RELEASE = '0.1.2'

// The README promises 0.1.2 is this name's last release. Changesets bumps the
// shim whenever its dependency on the new name leaves its range, so a minor
// of the new name would publish an undeprecated 0.1.3.
it('stays at its last release until the shim is removed', () => {
  const bumps = pendingBumps(changesets)
  const next = nextShimVersion({
    shimVersion: read('../package.json').version,
    shimBump: bumps[SHIM],
    pluginVersion: read('../../lint-plugin/package.json').version,
    pluginBump: bumps[PLUGIN]
  })
  expect(
    next,
    `${SHIM} would release ${next}, but its README promises ${LAST_RELEASE} is its last release. Remove packages/eslint-plugin-shim instead.`
  ).toBe(LAST_RELEASE)
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

describe('nextShimVersion', () => {
  it.each([
    ['0.1.2', undefined, '0.2.0', 'minor', '0.1.3'],
    ['0.1.2', undefined, '0.2.0', 'major', '0.1.3'],
    ['0.1.2', undefined, '0.2.0', 'patch', '0.1.2'],
    ['0.1.2', undefined, '0.2.0', undefined, '0.1.2'],
    ['0.1.2', undefined, '1.0.0', 'minor', '0.1.2'],
    ['0.1.2', undefined, '1.0.0', 'major', '0.1.3'],
    ['0.1.2', 'patch', '0.2.0', undefined, '0.1.3'],
    ['0.1.2', 'minor', '0.2.0', 'minor', '0.2.0'],
    ['0.1.1', 'patch', '0.1.1', 'minor', '0.1.2']
  ])(
    'shim %s with a %s, new name %s with a %s: %s',
    (shimVersion, shimBump, pluginVersion, pluginBump, expected) => {
      expect(
        nextShimVersion({ shimVersion, shimBump, pluginVersion, pluginBump })
      ).toBe(expected)
    }
  )
})
