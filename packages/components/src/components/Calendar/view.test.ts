import { describe, expect, it } from 'vitest'

import { type ViewModelOptions, viewModel } from './view'

const base: ViewModelOptions = {
  scrolling: false,
  weekView: false,
  numberOfMonths: 1,
  weekStart: 1,
  shownMonth: '2027-03-01',
  run: null,
  navigatedWeek: null,
  focusedDate: null,
  chosen: [],
  today: null,
  disabled: false
}
const view = (options: Partial<ViewModelOptions>) =>
  viewModel({ ...base, ...options })
const week = { weekView: true }
const bounded = { startMonth: '2027-02-10', endMonth: '2027-05-20' }

describe('viewModel', () => {
  // prettier-ignore
  it.each<[string, Partial<ViewModelOptions>, object]>([
    ['one month', {}, { numberOfMonths: 1, firstMonth: '2027-03-01', months: ['2027-03-01'] }],
    ['two months', { numberOfMonths: 2 }, { months: ['2027-03-01', '2027-04-01'], lastVisibleDay: '2027-04-30' }],
    ['a fraction of months', { numberOfMonths: 2.7 }, { numberOfMonths: 2 }],
    ['no months', { numberOfMonths: 0 }, { numberOfMonths: 1 }],
    ['more months than the bounds hold', { ...bounded, numberOfMonths: 6 }, { numberOfMonths: 4, firstMonth: '2027-02-01' }],
    ['several months in week view', { ...week, numberOfMonths: 3 }, { numberOfMonths: 1 }],
    ['a month past the end', { ...bounded, numberOfMonths: 2, shownMonth: '2027-09-01' }, { firstMonth: '2027-04-01', lastAllowedMonth: '2027-04-01' }],
    ['a month before the start', { ...bounded, shownMonth: '2026-11-01' }, { firstMonth: '2027-02-01', minDate: '2027-02-01', maxDate: '2027-05-31' }],
    ['a scrolling run', { scrolling: true }, { currentRun: { start: '2026-12-01', count: 10 }, visibleStart: '2026-12-01', lastVisibleDay: '2027-09-30' }],
    ['a scrolling run in bounds', { ...bounded, scrolling: true }, { currentRun: { start: '2027-02-01', count: 4 } }],
    ['a run that holds the month', { scrolling: true, run: { start: '2027-01-01', count: 3 } }, { currentRun: { start: '2027-01-01', count: 3 } }],
    ['a run that starts on the month', { scrolling: true, run: { start: '2027-03-01', count: 2 } }, { currentRun: { start: '2027-03-01', count: 2 } }],
    ['a run that has lost the month', { scrolling: true, run: { start: '2027-05-01', count: 3 } }, { currentRun: { start: '2026-12-01', count: 10 } }],
    ['a week, from the month alone', week, { shownWeek: '2027-03-01', visibleStart: '2027-03-01', lastVisibleDay: '2027-03-07' }],
    ['a week, from today', { ...week, today: '2027-03-18' }, { shownWeek: '2027-03-15' }],
    ['a week, from a choice over today', { ...week, today: '2027-03-18', chosen: ['2027-03-24'] }, { shownWeek: '2027-03-22' }],
    ['a week, from focus over a choice', { ...week, chosen: ['2027-03-24'], focusedDate: '2027-03-10' }, { shownWeek: '2027-03-08' }],
    ['a week, from a choice in another month', { ...week, chosen: ['2027-05-24'] }, { shownWeek: '2027-03-01' }],
    ['a week turned to', { ...week, navigatedWeek: '2027-03-29' }, { shownWeek: '2027-03-29' }],
    ['a week turned to, that has left the month', { ...week, navigatedWeek: '2027-04-05' }, { shownWeek: '2027-03-01' }],
    ['a Sunday-first week', { ...week, weekStart: 7 }, { shownWeek: '2027-02-28' }],
    ['the tab stop on the focused day', { focusedDate: '2027-03-09', chosen: ['2027-03-20'] }, { focusTarget: '2027-03-09' }],
    ['the tab stop on a choice', { focusedDate: '2027-04-09', chosen: ['2027-03-20'], today: '2027-03-02' }, { focusTarget: '2027-03-20' }],
    ['the tab stop on today', { chosen: ['2027-05-20'], today: '2027-03-02' }, { focusTarget: '2027-03-02' }],
    ['the tab stop on the first day', { today: '2027-05-02' }, { focusTarget: '2027-03-01' }]
  ])('shows %s', (_, options, shown) => {
    expect(view(options)).toMatchObject(shown)
  })

  // prettier-ignore
  it.each<[string, Partial<ViewModelOptions>, -1 | 1, boolean]>([
    ['back', {}, -1, true],
    ['back from the first month', { ...bounded, shownMonth: '2027-02-01' }, -1, false],
    ['on to the last month', { ...bounded, shownMonth: '2027-04-01' }, 1, true],
    ['on from the last month', { ...bounded, shownMonth: '2027-05-01' }, 1, false],
    ['on from the last pair', { ...bounded, numberOfMonths: 2, shownMonth: '2027-04-01' }, 1, false],
    ['when disabled', { disabled: true }, 1, false],
    ['back a week to the start', { ...bounded, ...week, shownMonth: '2027-02-01', navigatedWeek: '2027-02-08' }, -1, true],
    ['back a week past the start', { ...bounded, ...week, shownMonth: '2027-02-01', navigatedWeek: '2027-02-01' }, -1, false],
    ['on a week to the end', { ...bounded, ...week, shownMonth: '2027-05-01', navigatedWeek: '2027-05-24' }, 1, true],
    ['on a week past a Sunday end', { startMonth: '2027-01-01', endMonth: '2027-02-20', ...week, shownMonth: '2027-02-01', navigatedWeek: '2027-02-22' }, 1, false],
    ['on a week past the end', { ...bounded, ...week, shownMonth: '2027-05-01', navigatedWeek: '2027-05-31' }, 1, false]
  ])('turns %s: %s', (_, options, step, can) => {
    expect(view(options).canTurn(step)).toBe(can)
  })

  it('turns to the next month, or the next week and the month it starts or ends in', () => {
    expect(view({}).turnTo(1)).toEqual({ week: null, month: '2027-04-01' })
    expect(view({ ...week, navigatedWeek: '2027-03-29' }).turnTo(1)).toEqual({
      week: '2027-04-05',
      month: '2027-04-01'
    })
    expect(
      view({
        ...week,
        shownMonth: '2027-04-01',
        navigatedWeek: '2027-04-05'
      }).turnTo(-1)
    ).toEqual({ week: '2027-03-29', month: '2027-04-01' })
  })

  // prettier-ignore
  it.each<[string, Partial<ViewModelOptions>, string, object]>([
    ['a day in view', {}, '2027-03-20', {}],
    ['a day in the month before', {}, '2027-02-27', { month: '2027-02-01' }],
    ['a day in the month after', {}, '2027-04-02', { month: '2027-04-01' }],
    ['a day past two months', { numberOfMonths: 2 }, '2027-05-03', { month: '2027-04-01' }],
    ['a day past the end', bounded, '2027-08-03', { month: '2027-05-01' }],
    ['a day before the start', { ...bounded, shownMonth: '2027-02-01' }, '2027-01-20', { month: '2027-02-01' }],
    ['a day in the week shown', week, '2027-03-05', {}],
    ['a day in the next week', week, '2027-03-09', { week: '2027-03-08', month: '2027-03-01' }],
    ['a day in a week of the next month', { ...week, navigatedWeek: '2027-03-29' }, '2027-04-06', { week: '2027-04-05', month: '2027-04-01' }],
    ['a day in a scrolling run', { scrolling: true }, '2027-05-06', {}],
    ['a day before a scrolling run', { scrolling: true }, '2026-10-06', { run: { start: '2026-10-01', count: 12 } }],
    ['a day after a scrolling run', { scrolling: true }, '2027-11-06', { run: { start: '2026-12-01', count: 12 } }]
  ])('reveals %s', (_, options, date, to) => {
    expect(view(options).reveal(date)).toEqual(to)
  })

  // prettier-ignore
  it.each<[string, Partial<ViewModelOptions>, string]>([
    ['most of the week', {}, '2027-04-01'],
    ['a choice', { chosen: ['2027-03-31'] }, '2027-03-01'],
    ['any of several choices', { chosen: ['2027-01-02', '2027-04-03'] }, '2027-04-01'],
    ['the focused day', { focusedDate: '2027-03-30' }, '2027-03-01'],
    ['a choice over the focused day', { chosen: ['2027-04-02'], focusedDate: '2027-03-30' }, '2027-04-01']
  ])('opens a week of two months on the month of %s', (_, options, month) => {
    expect(view(options).monthOfWeek('2027-03-29')).toBe(month)
  })

  it('clamps a date and a month to the bounds', () => {
    const model = view(bounded)
    expect(model.clampDate('2027-01-05')).toBe('2027-02-01')
    expect(model.clampDate('2027-06-05')).toBe('2027-05-31')
    expect(model.clampDate('2027-03-05')).toBe('2027-03-05')
    expect(model.clampMonth('2027-07-01')).toBe('2027-05-01')
  })
})
