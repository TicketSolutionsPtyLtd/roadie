import { describe, expect, it } from 'vitest'

import {
  type CalendarDateRange,
  isSelected,
  previewRange,
  selectDate,
  withinLength
} from './selection'

describe('selectDate', () => {
  it('selects a single date and clears it on a second press', () => {
    expect(selectDate('single', null, '2027-03-14')).toBe('2027-03-14')
    expect(selectDate('single', '2027-03-14', '2027-03-14')).toBeNull()
  })

  it('keeps a required single date on a second press', () => {
    expect(
      selectDate('single', '2027-03-14', '2027-03-14', { required: true })
    ).toBe('2027-03-14')
  })

  it('toggles dates in multiple mode, keeping them in order', () => {
    expect(selectDate('multiple', [], '2027-03-14')).toEqual(['2027-03-14'])
    expect(selectDate('multiple', ['2027-03-14'], '2027-03-02')).toEqual([
      '2027-03-02',
      '2027-03-14'
    ])
    expect(
      selectDate('multiple', ['2027-03-02', '2027-03-14'], '2027-03-02')
    ).toEqual(['2027-03-14'])
  })

  it('keeps the last date of a required multiple selection', () => {
    expect(
      selectDate('multiple', ['2027-03-14'], '2027-03-14', { required: true })
    ).toEqual(['2027-03-14'])
  })

  const empty: CalendarDateRange = { start: null, end: null }

  it('starts a range, then finishes it in either direction', () => {
    const started = selectDate('range', empty, '2027-03-07')
    expect(started).toEqual({ start: '2027-03-07', end: null })
    expect(selectDate('range', started, '2027-03-03')).toEqual({
      start: '2027-03-03',
      end: '2027-03-07'
    })
    expect(selectDate('range', started, '2027-03-09')).toEqual({
      start: '2027-03-07',
      end: '2027-03-09'
    })
  })

  it('finishes a one-day range on the start itself', () => {
    expect(
      selectDate('range', { start: '2027-03-07', end: null }, '2027-03-07')
    ).toEqual({ start: '2027-03-07', end: '2027-03-07' })
  })

  it('starts again after a finished range', () => {
    expect(
      selectDate(
        'range',
        { start: '2027-03-03', end: '2027-03-07' },
        '2027-03-20'
      )
    ).toEqual({ start: '2027-03-20', end: null })
  })

  it('clears a started range pressed again when one day is too short', () => {
    expect(
      selectDate('range', { start: '2027-03-07', end: null }, '2027-03-07', {
        min: 2
      })
    ).toEqual(empty)
  })
})

describe('withinLength', () => {
  it.each([
    ['2027-03-08', { min: 3 }, false],
    ['2027-03-09', { min: 3 }, true],
    ['2027-03-05', { min: 3 }, true],
    ['2027-03-13', { max: 7 }, true],
    ['2027-03-14', { max: 7 }, false],
    ['2027-03-01', { max: 7 }, true],
    ['2027-02-28', { max: 7 }, false]
  ])('from 7 March, %s is within %o: %s', (date, limits, expected) => {
    expect(withinLength('2027-03-07', date, limits)).toBe(expected)
  })
})

describe('isSelected', () => {
  it('reads each mode', () => {
    expect(isSelected('single', '2027-03-14', '2027-03-14')).toBe(true)
    expect(isSelected('single', null, '2027-03-14')).toBe(false)
    expect(isSelected('multiple', ['2027-03-14'], '2027-03-14')).toBe(true)
    const range = { start: '2027-03-03', end: '2027-03-07' }
    expect(isSelected('range', range, '2027-03-05')).toBe(true)
    expect(isSelected('range', range, '2027-03-08')).toBe(false)
    expect(
      isSelected('range', { start: '2027-03-03', end: null }, '2027-03-03')
    ).toBe(true)
  })
})

describe('previewRange', () => {
  it('spans the start and the date under the pointer or focus', () => {
    expect(
      previewRange({ start: '2027-03-07', end: null }, '2027-03-03')
    ).toEqual({ start: '2027-03-03', end: '2027-03-07' })
  })

  it('shows nothing without a started range or a target', () => {
    expect(previewRange({ start: null, end: null }, '2027-03-03')).toBeNull()
    expect(
      previewRange({ start: '2027-03-03', end: '2027-03-07' }, '2027-03-09')
    ).toBeNull()
    expect(previewRange({ start: '2027-03-07', end: null }, null)).toBeNull()
  })
})
