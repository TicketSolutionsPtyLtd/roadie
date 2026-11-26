import { describe, expect, it } from 'vitest'

import { type DayModelOptions, dayModel } from './day'

const base: DayModelOptions = {
  mode: 'single',
  selection: null,
  minDate: null,
  maxDate: null,
  today: null,
  previewTarget: null,
  showOutsideDays: false,
  tiles: false
}
const range = {
  mode: 'range',
  selection: { start: '2027-03-10', end: '2027-03-14' }
} as const
const started = {
  mode: 'range',
  selection: { start: '2027-03-10', end: null }
} as const
const preview = { previewRange: { start: '2027-03-12', end: '2027-03-09' } }
const rounds = (roundStart: boolean, roundEnd: boolean) => ({
  previewBand: { roundStart, roundEnd }
})

// Days of March 2027, which starts on a Monday, in a Monday-first grid.
const dayOf = (options: Partial<DayModelOptions>, date: string) =>
  dayModel({ ...base, ...options }).day(
    date,
    '2027-03-01',
    (Number(date.slice(8)) + 6) % 7
  )

// prettier-ignore
const shapes: [string, Partial<DayModelOptions>, string, object][] = [
  ['a single choice', { selection: '2027-03-14' }, '2027-03-14', { selected: true, look: 'chosen' }],
  ['another day', { selection: '2027-03-14' }, '2027-03-15', { selected: false, look: 'plain' }],
  ['one of several', { mode: 'multiple', selection: ['2027-03-02'] }, '2027-03-02', { look: 'chosen' }],
  ['a range start', range, '2027-03-10', { rangeStart: true, look: 'chosen', halfBand: true }],
  ['a range middle', range, '2027-03-12', { rangeMiddle: true, look: 'middle', band: true }],
  ['a range middle in tiles', { ...range, tiles: true }, '2027-03-12', { look: 'middle-tile', band: false }],
  ['a range end', range, '2027-03-14', { rangeEnd: true, look: 'chosen' }],
  ['a range start in the last column', { ...range, selection: { start: '2027-03-14', end: '2027-03-16' } }, '2027-03-14', { rangeStart: true, halfBand: false }],
  ['a range end in the first column', { ...range, selection: { start: '2027-03-10', end: '2027-03-15' } }, '2027-03-15', { rangeEnd: true, halfBand: false }],
  ['a one-day range', { ...range, selection: { start: '2027-03-10', end: '2027-03-10' } }, '2027-03-10', { rangeStart: true, rangeEnd: true, halfBand: false }],
  ['past a range', range, '2027-03-15', { rangeMiddle: false, look: 'plain' }],
  ['a started range, toward its target', { ...started, previewTarget: '2027-03-07' }, '2027-03-08', { rangeMiddle: true, previewing: true }],
  ['a started range, at its target', { ...started, previewTarget: '2027-03-07' }, '2027-03-07', { rangeStart: true, previewing: true }],
  ['a started range, past its max', { ...started, max: 3 }, '2027-03-20', { outOfRange: true }],
  ['a started range, within its max', { ...started, max: 3 }, '2027-03-12', { outOfRange: false }],
  ['a started range, at its start', { ...started, max: 3, previewTarget: '2027-03-20' }, '2027-03-10', { rangeStart: true, rangeEnd: true, outOfRange: false }],
  ['a started range, at its start under a min', { ...started, min: 3 }, '2027-03-10', { outOfRange: false }],
  ['today', { today: '2027-03-14' }, '2027-03-14', { today: true }],
  ['not today', { today: '2027-03-14' }, '2027-03-15', { today: false }],
  ['the last of the month', {}, '2027-03-31', { lastVisible: true }],
  ['the last of the month, outside days shown', { showOutsideDays: true }, '2027-03-31', { lastVisible: false }],
  ['a preview start', preview, '2027-03-09', { previewed: true, ...rounds(true, false) }],
  ['a preview middle', preview, '2027-03-10', { previewed: true, ...rounds(false, false) }],
  ['a preview end', preview, '2027-03-12', { previewed: true, ...rounds(false, true) }],
  ['past a preview', preview, '2027-03-13', { previewed: false, previewBand: null }],
  ['a preview at the row end', { previewRange: { start: '2027-03-13', end: '2027-03-16' } }, '2027-03-14', rounds(false, true)],
  ['a one-day preview', { previewRange: { start: '2027-03-12', end: '2027-03-12' } }, '2027-03-12', { previewBand: null, look: 'filled' }],
  ['a preview in tiles', { ...preview, tiles: true }, '2027-03-10', { previewBand: null, look: 'filled' }],
  ['a preview under a chosen middle', { ...range, ...preview }, '2027-03-11', { previewed: false, previewBand: null, look: 'middle' }],
  ['a preview under a chosen start', { ...range, ...preview }, '2027-03-10', { previewed: false, ...rounds(false, false), look: 'chosen' }]
]

describe('dayModel', () => {
  it.each(shapes)('shapes %s', (_, options, date, state) => {
    expect(dayOf(options, date)).toMatchObject(state)
  })

  it('leaves a day of another month as an empty cell unless outside days show', () => {
    expect(dayModel(base).day('2027-02-28', '2027-03-01', 6)).toBeNull()
    expect(
      dayModel({ ...base, showOutsideDays: true }).day(
        '2027-02-28',
        '2027-03-01',
        6
      )
    ).toMatchObject({ outside: true, look: 'plain' })
  })

  it('starts the row at the first of a month that starts midweek', () => {
    expect(dayModel(base).day('2027-04-01', '2027-04-01', 3)).toMatchObject({
      firstVisible: true
    })
    expect(
      dayModel({ ...base, showOutsideDays: true }).day(
        '2027-04-01',
        '2027-04-01',
        3
      )
    ).toMatchObject({ firstVisible: false })
  })

  it.each([
    [{ disabled: true }, '2027-03-14', true],
    [{ disabled: { dayOfWeek: [7] } }, '2027-03-14', true],
    [{ disabled: { dayOfWeek: [7] } }, '2027-03-15', false],
    [{ minDate: '2027-03-10' }, '2027-03-09', true],
    [{ minDate: '2027-03-10' }, '2027-03-10', false],
    [{ maxDate: '2027-03-20' }, '2027-03-21', true],
    [{ maxDate: '2027-03-20' }, '2027-03-20', false]
  ] as const)('with %j, %s is disabled: %s', (options, date, disabled) => {
    expect(dayModel({ ...base, ...options }).isDisabled(date)).toBe(disabled)
    expect(dayOf(options, date)).toMatchObject({ disabled })
  })

  it('says when a started range refuses a day', () => {
    const model = dayModel({ ...base, ...started, max: 3 })
    expect(model.extending).toBe(true)
    expect(model.isOutOfRange('2027-03-20')).toBe(true)
    expect(model.isOutOfRange('2027-03-12')).toBe(false)
    expect(dayModel({ ...base, ...range, max: 3 }).extending).toBe(false)
    expect(
      dayModel({ ...base, ...range, max: 3 }).isOutOfRange('2027-03-20')
    ).toBe(false)
  })
})
