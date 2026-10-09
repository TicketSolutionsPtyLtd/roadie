import { describe, expect, it } from 'vitest'

import {
  checkPluginRelease,
  namesPackage,
  syncManifest
} from './plugin-release.mjs'

const skillsChangeset = "---\n'roadie-skills': patch\n---\n\nFix a typo."
const coreChangeset = "---\n'@oztix/roadie-core': minor\n---\n\nAdd a thing."

const pr = (overrides: Partial<Parameters<typeof checkPluginRelease>[0]>) =>
  checkPluginRelease({
    changedFiles: [],
    readChangeset: () => '',
    basePackageVersion: '0.4.0',
    packageVersion: '0.4.0',
    manifestVersion: '0.4.0',
    ...overrides
  })

describe('checkPluginRelease', () => {
  it('passes a change outside skills/ without a changeset', () => {
    expect(
      pr({ changedFiles: ['packages/core/src/index.ts', 'AGENTS.md'] }).ok
    ).toBe(true)
  })

  it('passes repo-only skills in .claude/skills/ without a changeset', () => {
    expect(
      pr({ changedFiles: ['.claude/skills/new-component/SKILL.md'] }).ok
    ).toBe(true)
  })

  it('passes the Version Packages change to the changelog and package', () => {
    expect(
      pr({
        changedFiles: ['skills/CHANGELOG.md', 'skills/package.json'],
        packageVersion: '0.4.1',
        manifestVersion: '0.4.1'
      }).ok
    ).toBe(true)
  })

  it('fails a skill change with no changeset', () => {
    const result = pr({ changedFiles: ['skills/review/SKILL.md'] })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('roadie-skills')
  })

  it('fails a skill change whose changeset names only other packages', () => {
    expect(
      pr({
        changedFiles: ['skills/review/SKILL.md', '.changeset/core-thing.md'],
        readChangeset: () => coreChangeset
      }).ok
    ).toBe(false)
  })

  it('passes a skill change with a roadie-skills changeset', () => {
    expect(
      pr({
        changedFiles: ['skills/review/SKILL.md', '.changeset/review-typo.md'],
        readChangeset: (path) =>
          path === '.changeset/review-typo.md' ? skillsChangeset : ''
      }).ok
    ).toBe(true)
  })

  it('ignores the changesets README', () => {
    expect(
      pr({
        changedFiles: ['skills/review/SKILL.md', '.changeset/README.md'],
        readChangeset: () => skillsChangeset
      }).ok
    ).toBe(false)
  })

  it('passes the first release, when the base has no package', () => {
    expect(
      pr({ changedFiles: ['skills/README.md'], basePackageVersion: null }).ok
    ).toBe(true)
  })

  it('fails when the plugin manifest and package versions differ', () => {
    const result = pr({ packageVersion: '0.5.0', manifestVersion: '0.4.0' })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('0.5.0')
  })
})

describe('namesPackage', () => {
  it.each([
    ["'roadie-skills': minor", true],
    ['"roadie-skills": patch', true],
    ['roadie-skills: patch', true],
    ["'roadie-skills': none", false],
    ["'roadie-skills-extra': patch", false],
    ["'@oztix/roadie-core': patch", false]
  ])('reads %s as %s', (line, expected) => {
    expect(namesPackage(`---\n${line}\n---\n\nSummary.`)).toBe(expected)
  })

  it('ignores the package named in the summary only', () => {
    expect(namesPackage(`${coreChangeset}\nroadie-skills: patch`)).toBe(false)
  })
})

describe('syncManifest', () => {
  it('sets the version and keeps the rest of the manifest', () => {
    const manifest =
      '{\n  "name": "roadie",\n  "version": "0.4.0",\n  "license": "MIT"\n}\n'
    expect(syncManifest(manifest, '0.5.0')).toBe(
      '{\n  "name": "roadie",\n  "version": "0.5.0",\n  "license": "MIT"\n}\n'
    )
  })

  it('throws on a manifest with no version', () => {
    expect(() => syncManifest('{ "name": "roadie" }', '0.5.0')).toThrow()
  })
})
