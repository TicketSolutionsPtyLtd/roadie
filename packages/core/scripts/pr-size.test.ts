import { readFileSync } from 'node:fs'
import { matchesGlob } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  THRESHOLD,
  countChangedLines,
  formatReport,
  parseArgs,
  readNumstat
} from './pr-size.mjs'

describe('countChangedLines', () => {
  it('sums added and deleted lines across files', () => {
    const numstat = [
      '10\t5\tpackages/components/src/Badge/index.tsx',
      '3\t0\tAGENTS.md'
    ].join('\n')
    expect(countChangedLines(numstat)).toEqual({
      total: 18,
      excludedLines: 0,
      files: 2
    })
  })

  it('leaves out lock files, snapshots, generated CSS, changesets, and changelogs', () => {
    const numstat = [
      '900\t800\tpnpm-lock.yaml',
      '10\t0\tskills-lock.json',
      '120\t0\tpackages/charts/src/BarChart/__snapshots__/scan-rate-dark.svg',
      '40\t40\tpackages/components/src/Foo/Foo.test.tsx.snap',
      '300\t300\tpackages/core/src/css/dataviz.css',
      '5\t0\t.changeset/new-thing.md',
      '12\t0\tpackages/charts/CHANGELOG.md',
      '7\t2\tpackages/core/src/dataviz/palette.ts'
    ].join('\n')
    expect(countChangedLines(numstat)).toEqual({
      total: 9,
      excludedLines: 2527,
      files: 1
    })
  })

  it('keeps hand-written files that sit beside generated ones', () => {
    const numstat = [
      '4\t0\tpackages/core/src/css/dataviz-textures.css',
      '2\t0\t.changeset/config.json'
    ].join('\n')
    expect(countChangedLines(numstat).total).toBe(6)
  })

  it('counts binary files as zero lines', () => {
    expect(countChangedLines('-\t-\tdocs/public/hero.png')).toEqual({
      total: 0,
      excludedLines: 0,
      files: 1
    })
  })

  it('judges a renamed file by its new path', () => {
    const numstat = [
      '0\t0\tpackages/core/src/{old.ts => new.ts}',
      '6\t6\tpackages/charts/{src => old}/__snapshots__/a.svg',
      '1\t1\tsnapshots.md => pnpm-lock.yaml',
      '2\t2\tpackages/core/src/css/{palette.css => dataviz.css}',
      '3\t3\tpackages/core/src/css/{generated => }/dataviz.css'
    ].join('\n')
    expect(countChangedLines(numstat)).toEqual({
      total: 0,
      excludedLines: 24,
      files: 1
    })
  })
})

describe('parseArgs', () => {
  it.each([
    [[], { base: 'origin/main', strict: false }],
    [['--base'], { base: 'origin/main', strict: false }],
    [
      ['--base', 'origin/next', '--strict'],
      { base: 'origin/next', strict: true }
    ]
  ])('reads %j', (argv, expected) => {
    expect(parseArgs(argv)).toEqual(expected)
  })
})

describe('readNumstat', () => {
  it('skips in one line when the base is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(readNumstat('origin/no-such-branch')).toBeNull()
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toMatch(
      /^PR size check skipped, no diff against origin\/no-such-branch: [^\n]+$/
    )
    warn.mockRestore()
  })
})

describe('formatReport', () => {
  it('passes at the threshold', () => {
    const report = formatReport(
      { total: THRESHOLD, excludedLines: 0, files: 3 },
      'origin/main'
    )
    expect(report.oversized).toBe(false)
    expect(report.message).toMatch(/^PR size OK/)
  })

  it('warns above the threshold', () => {
    const report = formatReport(
      { total: THRESHOLD + 1, excludedLines: 0, files: 3 },
      'origin/main'
    )
    expect(report.oversized).toBe(true)
    expect(report.message).toMatch(/^PR size warning: 401 changed lines/)
  })

  it('names every excluded line neutrally, since changesets and changelogs are neither generated nor lock files', () => {
    const report = formatReport(
      { total: 10, excludedLines: 5, files: 1 },
      'origin/main'
    )
    expect(report.message).toContain('(5 excluded lines not counted;')
  })
})

describe('turbo test inputs', () => {
  it('rerun the core tests when this script changes', () => {
    const turbo = JSON.parse(
      readFileSync(new URL('../../../turbo.json', import.meta.url), 'utf8')
    ) as { tasks: { test: { inputs: string[] } } }
    expect(
      turbo.tasks.test.inputs.some((glob) =>
        matchesGlob('scripts/pr-size.mjs', glob)
      )
    ).toBe(true)
  })
})
