import { describe, expect, it } from 'vitest'

import { checkPluginRelease } from './plugin-release.mjs'

const changelog = ['# Changelog', '', '## 0.4.0', '', '- Adds a skill.'].join(
  '\n'
)

describe('checkPluginRelease', () => {
  it('passes a change outside skills/ without a bump', () => {
    expect(
      checkPluginRelease({
        changedFiles: ['packages/core/src/index.ts', 'AGENTS.md'],
        baseVersion: '0.3.0',
        headVersion: '0.3.0',
        changelog: ''
      }).ok
    ).toBe(true)
  })

  it('passes a changelog-only edit without a bump', () => {
    expect(
      checkPluginRelease({
        changedFiles: ['skills/CHANGELOG.md'],
        baseVersion: '0.4.0',
        headVersion: '0.4.0',
        changelog
      }).ok
    ).toBe(true)
  })

  it('fails a skill change that keeps the base version', () => {
    const result = checkPluginRelease({
      changedFiles: ['skills/review/SKILL.md'],
      baseVersion: '0.4.0',
      headVersion: '0.4.0',
      changelog
    })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('0.4.0')
  })

  it.each([
    ['0.3.9', '0.3.10'],
    ['0.3.0', '0.4.0'],
    ['0.9.0', '1.0.0']
  ])('compares %s and %s numerically', (baseVersion, headVersion) => {
    expect(
      checkPluginRelease({
        changedFiles: ['skills/test/SKILL.md'],
        baseVersion,
        headVersion,
        changelog: `## ${headVersion}`
      }).ok
    ).toBe(true)
  })

  it('fails a version that goes down', () => {
    expect(
      checkPluginRelease({
        changedFiles: ['skills/test/SKILL.md'],
        baseVersion: '0.10.0',
        headVersion: '0.9.0',
        changelog: '## 0.9.0'
      }).ok
    ).toBe(false)
  })

  it('fails a bump with no changelog heading for the new version', () => {
    const result = checkPluginRelease({
      changedFiles: ['skills/test/SKILL.md'],
      baseVersion: '0.3.0',
      headVersion: '0.4.0',
      changelog: '## 0.3.0\n\nMentions 0.4.0 in passing.'
    })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('## 0.4.0')
  })

  it('does not take a longer version heading as the new one', () => {
    expect(
      checkPluginRelease({
        changedFiles: ['skills/test/SKILL.md'],
        baseVersion: '0.3.0',
        headVersion: '0.4.0',
        changelog: '## 0.4.01'
      }).ok
    ).toBe(false)
  })

  it('passes the first release, when the base has no plugin', () => {
    expect(
      checkPluginRelease({
        changedFiles: ['skills/audit/SKILL.md'],
        baseVersion: null,
        headVersion: '0.1.0',
        changelog: '## 0.1.0'
      }).ok
    ).toBe(true)
  })
})
