import { describe, expect, it } from 'vitest'

import type { FrameRecord } from './record'
import { frameTable, parseRecords } from './table'

const record = (
  scenario: string,
  values: Partial<FrameRecord> = {}
): FrameRecord => ({
  scenario,
  file: 'src/X.perf.browser.test.tsx',
  pass: true,
  frames: 120,
  p50: 16.7,
  p95: 16.7,
  worst: 18,
  dropped: 0,
  droppedShare: 0,
  steadyDroppedShare: 0,
  engine: 'chromium',
  cpu: 4,
  longTasks: 0,
  longestTask: 0,
  longFrames: 0,
  longestFrame: 0,
  ...values
})

describe('frameTable', () => {
  it('lines each scenario up across the runs and names where it missed', () => {
    const table = frameTable([
      {
        label: 'Throttled',
        records: [
          record('Dialog, open', {
            p95: 33.3,
            worst: 50,
            droppedShare: 0.083,
            longTasks: 1,
            pass: false
          }),
          record('Menu, open')
        ]
      },
      { label: 'Unthrottled', records: [record('Dialog, open', { cpu: 1 })] }
    ])
    expect(table.split('\n')).toEqual([
      '| Scenario | Throttled (4x) | Unthrottled (1x) | Budget |',
      '| --- | --- | --- | --- |',
      '| Dialog, open | 33.3 · 50 · 8.3% · 1 | 16.7 · 18 · 0% · 0 | Missed in throttled |',
      '| Menu, open | 16.7 · 18 · 0% · 0 | – | Met |'
    ])
  })

  it('reads long tasks as n/a where the engine reports none', () => {
    const table = frameTable([
      { label: 'WebKit', records: [record('Menu, open', { longTasks: null })] }
    ])
    expect(table).toContain('| 16.7 · 18 · 0% · n/a |')
  })
})

describe('parseRecords', () => {
  it('reads one record a line and skips blank lines', () => {
    const lines = `${JSON.stringify(record('A'))}\n\n${JSON.stringify(record('B'))}\n`
    expect(parseRecords(lines).map((r) => r.scenario)).toEqual(['A', 'B'])
  })
})

describe('frameTable known misses', () => {
  it('names the ticket a miss is filed under, met or not', () => {
    const ticket = 'INNO-9999'
    const table = frameTable([
      {
        label: 'Throttled',
        records: [
          record('Skeleton', { pass: false, knownMiss: ticket }),
          record('Drawer', { knownMiss: ticket })
        ]
      }
    ])
    expect(table).toContain('| Missed in throttled, filed as INNO-9999 |')
    expect(table).toContain('| Met, filed as INNO-9999 |')
  })
})
