import { describe, expect, it } from 'vitest'

import { THRESHOLD, countChangedLines, formatReport } from './check-pr-size.mjs'

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
      '120\t0\tpackages/charts/src/BarChart/__snapshots__/scan-rate-dark.svg',
      '40\t40\tpackages/components/src/Foo/Foo.test.tsx.snap',
      '300\t300\tpackages/core/src/css/dataviz.css',
      '5\t0\t.changeset/new-thing.md',
      '12\t0\tpackages/charts/CHANGELOG.md',
      '7\t2\tpackages/core/src/dataviz/palette.ts'
    ].join('\n')
    expect(countChangedLines(numstat)).toEqual({
      total: 9,
      excludedLines: 2517,
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
      '1\t1\tsnapshots.md => pnpm-lock.yaml'
    ].join('\n')
    expect(countChangedLines(numstat)).toEqual({
      total: 0,
      excludedLines: 14,
      files: 1
    })
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
})
